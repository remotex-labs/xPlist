/**
 * Imports
 */

import { XMLParsingError } from '@errors/xml.error';
import { decodePrimitive, decodeTag } from '@structs/plist.struct';
import {
    createNode,
    decodeKey,
    decodeObjects,
    decodePlist,
    decodePlistContent,
    decodeTags,
    pushToObject
} from '@services/plist.service';

/**
 * Mocks
 */

jest.mock('@structs/plist.struct', () => ({
    decodeTag: jest.fn(),
    decodePrimitive: jest.fn()
}));

/**
 * Tests
 */

describe('decodePlistContent', () => {
    test('should extract content inside valid <plist> tags', () => {
        const plist = '<plist><name>My Plist</name><version>1.0</version></plist>';
        const expectedContent = '<name>My Plist</name><version>1.0</version>';
        expect(decodePlistContent(plist)).toBe(expectedContent);
    });

    test('should throw an error if <plist> tags are missing or malformed', () => {
        const invalidPlists = [
            '<name>My Plist</name><version>1.0</version>', // No <plist> tags
            '<plist><name>My Plist</name><version>1.0</version>', // Missing closing </plist> tag
            '<plist><name>My Plist</name><version>1.0', // Missing closing </plist> tag
            '<plis><name>My Plist</name></plis>' // Incorrect tag name
        ];

        invalidPlists.forEach((plist) => {
            expect(() => decodePlistContent(plist)).toThrowError(XMLParsingError);
            expect(() => decodePlistContent(plist)).toThrowError('Invalid plist: <plist> tags not found or malformed XML');
        });
    });

    test('should handle extra whitespace between tags correctly', () => {
        const plist = '<plist asda>\n\n  <name>My Plist</name>  <version>1.0</version>  </plist>';
        const expectedContent = '<name>My Plist</name><version>1.0</version>';
        expect(decodePlistContent(plist)).toBe(expectedContent);
    });

    test('should return empty string if <plist> tags contain no content', () => {
        const plist = '<plist></plist>';
        expect(decodePlistContent(plist)).toBe('');
    });

    test('should trim any leading or trailing whitespace in the plist content', () => {
        const plist = '  <plist>  <name>My Plist</name>  </plist>  ';
        const expectedContent = '<name>My Plist</name>';
        expect(decodePlistContent(plist)).toBe(expectedContent);
    });
});

describe('createNode', () => {
    test('should create a node with "dict" tag and an empty object as content', () => {
        const tagName = 'dict';
        const node = createNode(tagName);

        expect(node.tag).toBe(tagName);
        expect(node.content).toBeInstanceOf(Object);
        expect(Object.keys(node.content)).toHaveLength(0); // Ensure it's an empty object
    });

    test('should create a node with non-"dict" tags and an empty array as content', () => {
        const tagName = 'array';
        const node = createNode(tagName);

        expect(node.tag).toBe(tagName);
        expect(node.content).toBeInstanceOf(Array);
        expect(node.content).toHaveLength(0); // Ensure it's an empty array
    });

    test('should return a different content type for a tag that is not "dict"', () => {
        const tagNames = [ 'array', 'string', 'integer', 'date' ];

        tagNames.forEach(tagName => {
            const node = createNode(tagName);

            expect(node.tag).toBe(tagName);
            expect(node.content).toBeInstanceOf(Array); // Content should be an array for all non-"dict" tags
        });
    });
});

describe('pushToObject', () => {
    test('should push a value to an array if current.content is an array', () => {
        const current = <any> { content: [] };
        const value = 'new item';

        pushToObject(value, current);

        expect(current.content).toContain(value);
        expect(current.content).toHaveLength(1); // Ensure only one item has been added
    });

    test('should add a value to an object if current.content is an object', () => {
        const current = <any> { content: {} };
        const value = 'new value';
        const key = 'key1';

        pushToObject(value, current, key);

        expect(current.content[key]).toBe(value);
    });

    test('should throw an error if current.content is an object but no key is provided', () => {
        const current = <any> { content: {} };
        const value = 'value without key';

        expect(() => pushToObject(value, current)).toThrow(XMLParsingError);
        expect(() => pushToObject(value, current)).toThrowError('Object key cannot be empty. Provide a valid key.');
    });

    test('should throw an error if current.content is neither an array nor an object', () => {
        const current = <any> { content: 'string' }; // Invalid type
        const value = 'value for invalid content type';

        expect(() => pushToObject(value, current)).toThrow(XMLParsingError);
        expect(() => pushToObject(value, current)).toThrowError('Unsupported current content type. Expected an array or object.');
    });

    test('should throw an error if current.content is an object and an empty key is provided', () => {
        const current = <any> { content: {} };
        const value = 'some value';

        expect(() => pushToObject(value, current, '')).toThrow(XMLParsingError);
        expect(() => pushToObject(value, current, '')).toThrowError('Object key cannot be empty. Provide a valid key.');
    });
});

describe('decodeKey', () => {
    let data: string;
    let regex: RegExp;
    let stack: any[];
    let current: any;
    let startTag: string;

    beforeEach(() => {
        data = '<plist><key>key1</key><value>value1</value></plist>'; // Example data
        stack = []; // Initial stack
        regex = /<key>(.*?)<\/key>/g; // Mock regex
        current = { content: {} }; // Initial current node
        startTag = 'key';
    });

    afterAll(() => {
        jest.clearAllMocks();
        jest.resetAllMocks();
    });

    test('should throw an error if the extracted key is empty', () => {
        (decodeTag as jest.Mock).mockReturnValue('');

        expect(() => decodeKey(data, regex, startTag, current, stack)).toThrow(XMLParsingError);
        expect(() => decodeKey(data, regex, startTag, current, stack)).toThrowError('Extracted key is empty. Verify the input plist.');
    });

    test('should throw an error if value for the key is not found', () => {
        (decodeTag as jest.Mock).mockReturnValue('key1');
        jest.spyOn(regex, 'exec').mockReturnValueOnce(null);
        expect(() => decodeKey(data, regex, startTag, current, stack)).toThrow(XMLParsingError);

        jest.spyOn(regex, 'exec').mockReturnValueOnce(null);
        expect(() => decodeKey(data, regex, startTag, current, stack)).toThrowError('Value not found for key "key1". Ensure the data is correctly formatted.');
    });

    test('should create a new node and push to stack if the value is an object tag', () => {
        const value = 'dict'; // Example of an object tag
        (decodeTag as jest.Mock).mockReturnValue('key1');
        jest.spyOn(regex, 'exec').mockReturnValueOnce(<any> [ null, null, value ]);

        const mockNode = { tag: 'dict', content: {} };
        decodeKey(data, regex, startTag, current, stack);

        expect(stack).toEqual([ mockNode ]);
    });

    test('should decode a primitive value and push to object', () => {
        const value = 'string'; // Example of a primitive type
        (decodeTag as jest.Mock).mockReturnValue(value);
        jest.spyOn(regex, 'exec').mockReturnValueOnce(<any> [ null, null, value ]);

        const mockDecodedValue = 'decoded value';
        (decodePrimitive as jest.Mock).mockReturnValue(mockDecodedValue);
        decodeKey(data, regex, startTag, current, stack);

        expect(decodePrimitive).toHaveBeenCalledWith(value, value);
    });
});

describe('decodeObjects', () => {
    let data: string;
    let regex: RegExp;
    const mockNodeContent = { key1: 'value1' };

    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetAllMocks();

        data = `
            <dict>
                <key>key1</key>
                <string>value1</string>
            </dict>`;
        regex = /<(\/?)([a-zA-Z0-9]+)([^>]*)>/g;
    });

    afterAll(() => {
        jest.clearAllMocks();
        jest.resetAllMocks();
    });

    test('should parse the plist data and return the root content', () => {
        // Arrange
        const tag = regex.exec(data)![2]; // First tag is 'dict'

        jest.spyOn(regex, 'exec')
            .mockReturnValueOnce([ 0, '', 'key' ] as any)
            .mockReturnValueOnce([ 0, '', 'string' ] as any)
            .mockReturnValueOnce(null);

        (decodeTag as jest.Mock)
            .mockReturnValueOnce('key1')
            .mockReturnValueOnce('value1');
        (decodePrimitive as jest.Mock).mockReturnValueOnce('value1');

        // Act
        const result = decodeObjects(data, regex, tag);

        // Assert
        expect(result).toEqual(mockNodeContent);
        expect(decodeTag).toHaveBeenCalledWith(data, regex, 'key');
        expect(decodeTag).toHaveBeenCalledWith(data, regex, 'string');
        expect(decodePrimitive).toHaveBeenCalledWith('value1', 'string');
    });

    test('should throw an error if "dict" does not start with "key"', () => {
        // Arrange
        const invalidData = `
            <plist>
                <dict>
                    <string>value1</string>
                </dict>
            </plist>`;
        const invalidRegex = /<(\/?)([a-zA-Z0-9]+)([^>]*)>/g;

        // Act & Assert
        expect(() => decodeObjects(invalidData, invalidRegex, 'dict')).toThrow(XMLParsingError);
        expect(() => decodeObjects(invalidData, invalidRegex, 'dict')).toThrowError(
            'Invalid structure: "dict" requires "key" as the first tag.'
        );
    });

    test('should handle closing tags and pop the stack when encountered', () => {
        // Arrange
        const tag = regex.exec(data)![2]; // First tag is 'dict'

        jest.spyOn(regex, 'exec')
            .mockReturnValueOnce([ 0, '', 'key' ] as any)
            .mockReturnValueOnce([ 0, '', 'string' ] as any)
            .mockReturnValueOnce([ 0, '/', 'dict' ] as any)
            .mockReturnValueOnce(null);

        (decodeTag as jest.Mock)
            .mockReturnValueOnce('key1')
            .mockReturnValueOnce('value1');
        (decodePrimitive as jest.Mock).mockReturnValueOnce('value1');

        // Act
        const result = decodeObjects(data, regex, tag);

        // Assert
        expect(result).toEqual(mockNodeContent);
    });

    test('should decode primitive values correctly and add them to the object', () => {
        // Arrange
        const tag = regex.exec(data)![2]; // First tag is 'dict'

        jest.spyOn(regex, 'exec')
            .mockReturnValueOnce([ 0, '', 'key' ] as any)
            .mockReturnValueOnce([ 0, '', 'string' ] as any)
            .mockReturnValueOnce(null);

        (decodeTag as jest.Mock)
            .mockReturnValueOnce('key1')
            .mockReturnValueOnce('value1');
        (decodePrimitive as jest.Mock).mockReturnValueOnce('value1');

        // Act
        const result = decodeObjects(data, regex, tag);

        // Assert
        expect(result).toEqual(mockNodeContent);
    });

    test('should handle object tags by pushing them to the stack', () => {
        // Arrange
        const tag = regex.exec(data)![2]; // First tag is 'dict'

        jest.spyOn(regex, 'exec')
            .mockReturnValueOnce([ 0, '', 'key' ] as any)
            .mockReturnValueOnce([ 0, '', 'string' ] as any)
            .mockReturnValueOnce(null);

        (decodeTag as jest.Mock)
            .mockReturnValueOnce('key1')
            .mockReturnValueOnce('value1');
        (decodePrimitive as jest.Mock).mockReturnValueOnce('value1');

        // Act
        const result = decodeObjects(data, regex, tag);

        // Assert
        expect(result).toEqual(mockNodeContent);
    });

    test('should handle booleanTags directly without decodeTag', () => {
        const data = `
            <dict>
                <key>isTrue</key>
                <true/>
                <key>isFalse</key>
                <false/>
            </dict>`;

        jest.spyOn(regex, 'exec')
            .mockReturnValueOnce([ 0, '', 'key' ] as any)
            .mockReturnValueOnce([ 0, '', 'true' ] as any)
            .mockReturnValueOnce([ 0, '', 'key' ] as any)
            .mockReturnValueOnce([ 0, '', 'false' ] as any)
            .mockReturnValueOnce(null);

        (decodeTag as jest.Mock).mockReturnValueOnce('isTrue').mockReturnValueOnce('isFalse');
        (decodePrimitive as jest.Mock)
            .mockReturnValueOnce(true) // Simulate the boolean value for <true/>
            .mockReturnValueOnce(false); // Simulate the boolean value for <false/>

        const result = decodeObjects(data, regex, 'dict');

        expect(result).toEqual({
            isTrue: true,
            isFalse: false
        });
    });
});

describe('decodeTags', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should decode a valid primitive string tag', () => {
        const data = '<string>value1</string>';
        (decodePrimitive as jest.Mock).mockReturnValueOnce('value1');

        const result = decodeTags(data);

        expect(result).toBe('value1');
        expect(decodeTag).toHaveBeenCalledWith(data, expect.any(RegExp), 'string');
    });

    test('should decode a valid boolean tag', () => {
        const data = '<true/>';
        (decodePrimitive as jest.Mock).mockReturnValueOnce(true);

        const result = decodeTags(data);

        expect(result).toBe(true);
        expect(decodePrimitive).toHaveBeenCalledWith('true', 'true');
    });

    test('should throw an error if malformed XML has no valid tags', () => {
        const data = 'This is not a valid XML content';

        expect(() => decodeTags(data)).toThrow(XMLParsingError);
        expect(() => decodeTags(data)).toThrowError('Malformed XML: No valid tags found.');
    });

    test('should handle invalid or unrecognized tags', () => {
        const data = '<unknownTag>some data</unknownTag>';

        // Simulate decoding unknown tag as a primitive
        (decodePrimitive as jest.Mock).mockReturnValueOnce('some data');

        const result = decodeTags(data);

        expect(result).toBe('some data');
        expect(decodeTag).toHaveBeenCalledWith(data, expect.any(RegExp), 'unknownTag');
    });

    test('should throw an error if an unexpected tag structure is found in the object', () => {
        const data = '<dict><string>value1</string></dict>';

        // We are testing that decodeTags works correctly even with errors in object structure
        expect(() => decodeTags(data)).toThrow(XMLParsingError);
        expect(() => decodeTags(data)).toThrowError('Invalid structure: "dict" requires "key" as the first tag.');
    });
});

describe('decodePlist', () => {
    beforeAll(() => {
        (decodeTag as jest.Mock) .mockReturnValue('key1');
        (decodePrimitive as jest.Mock).mockReturnValue('value1');
    });

    test('should throw an error if the input is not a string', () => {
        const invalidInputs = [ 123, true, {}, [], null, undefined ];

        invalidInputs.forEach(input => {
            expect(() => decodePlist(<any> input)).toThrow(XMLParsingError);
            expect(() => decodePlist(<any> input)).toThrowError(`Invalid input type for plist: expected a string but received ${ typeof input }`);
        });
    });
});
