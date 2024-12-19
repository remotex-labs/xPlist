/**
 * Imports
 */

import { XMLParsingError } from '@errors/xml.error';
import { encodeEscaping } from '@components/escape.component';
import {
    encodeTag,
    decodeTag,
    decodeDate,
    encodeValue,
    decodeNumber,
    decodePrimitive,
    decodeClosingTag,
    decodeContentOfTag
} from '@structs/plist.struct';

/**
 * Tests
 */

describe('encodeValue', () => {
    test('should encode string correctly', () => {
        const value = 'Hello, world!';
        const result = encodeValue(value);
        expect(result).toBe('<string>Hello, world!</string>');
    });

    test('should encode integer correctly', () => {
        const value = 42;
        const result = encodeValue(value);
        expect(result).toBe('<integer>42</integer>');
    });

    test('should encode real number correctly', () => {
        const value = 3.14;
        const result = encodeValue(value);
        expect(result).toBe('<real>3.14</real>');
    });

    test('should encode boolean true correctly', () => {
        const value = true;
        const result = encodeValue(value);
        expect(result).toBe('<true/>');
    });

    test('should encode boolean false correctly', () => {
        const value = false;
        const result = encodeValue(value);
        expect(result).toBe('<false/>');
    });

    test('should encode Buffer (binary data) correctly', () => {
        const value = Buffer.from('hello', 'utf8');
        const result = encodeValue(value);
        expect(result).toBe('<data>aGVsbG8=</data>'); // base64 encoded "hello"
    });

    test('should encode array correctly', () => {
        const value = [ 'string', 123, true, 3.14 ];
        const result = encodeValue(value);
        expect(result).toBe(
            '<array><string>string</string><integer>123</integer><true/><real>3.14</real></array>'
        );
    });

    test('should encode object correctly', () => {
        const value = {
            name: 'John Doe',
            age: 30,
            active: true,
            details: { city: 'New York', zip: 10001 }
        };
        const result = encodeValue(value);
        expect(result).toBe(
            // eslint-disable-next-line max-len
            '<dict><key>name</key><string>John Doe</string><key>age</key><integer>30</integer><key>active</key><true/><key>details</key><dict><key>city</key><string>New York</string><key>zip</key><integer>10001</integer></dict></dict>'
        );
    });

    test('should throw error for unsupported data type', () => {
        const value = undefined;
        expect(() => encodeValue(value)).toThrow(XMLParsingError);
        expect(() => encodeValue(value)).toThrowError('Unsupported data type: undefined');
    });
});

describe('encodeTag', () => {
    test('should encode boolean true as <true/>', () => {
        const result = encodeTag('boolean', true);
        expect(result).toBe('<true/>');
    });

    test('should encode boolean false as <false/>', () => {
        const result = encodeTag('boolean', false);
        expect(result).toBe('<false/>');
    });

    test('should encode string value inside the specified tag', () => {
        const result = encodeTag('string', 'Hello, world!');
        expect(result).toBe('<string>Hello, world!</string>');
    });

    test('should encode integer value inside the specified tag', () => {
        const result = encodeTag('integer', 42);
        expect(result).toBe('<integer>42</integer>');
    });

    test('should encode real number value inside the specified tag', () => {
        const result = encodeTag('real', 3.14);
        expect(result).toBe('<real>3.14</real>');
    });

    test('should handle empty string correctly', () => {
        const result = encodeTag('string', '');
        expect(result).toBe('<string/>');
    });

    test('should return the correct tag when encoding different types with the same tag', () => {
        const stringResult = encodeTag('string', 'Test');
        const numberResult = encodeTag('string', 123);
        expect(stringResult).toBe('<string>Test</string>');
        expect(numberResult).toBe('<string>123</string>');
    });
});

describe('decodeContentOfTag', () => {
    test('should return trimmed content between startOffset and endOffset', () => {
        const data = '<tag>Some content here</tag>';
        const startOffset = 5;
        const endOffset = 22;
        const expectedContent = 'Some content here';
        expect(decodeContentOfTag(data, startOffset, endOffset)).toBe(expectedContent);
    });

    test('should return an empty string when there is no content between the offsets', () => {
        const data = '<tag></tag>';
        const startOffset = 5;
        const endOffset = 5;
        expect(decodeContentOfTag(data, startOffset, endOffset)).toBe('');
    });

    test('should return null if the offsets are out of bounds', () => {
        const data = '<tag>Some content here</tag>';
        const startOffset = 50;  // Out of bounds
        const endOffset = 60;    // Out of bounds
        expect(decodeContentOfTag(data, startOffset, endOffset)).toBe('');
    });

    test('should handle negative offsets gracefully', () => {
        const data = '<tag>Some content here</tag>';
        const startOffset = -5;  // Invalid start offset
        const endOffset = 22;    // Valid end offset
        expect(decodeContentOfTag(data, startOffset, endOffset)).toBe('');
    });

    test('should trim leading and trailing whitespace from the sliced content', () => {
        const data = '<tag>   Some content with extra spaces   </tag>';
        const startOffset = 5;
        const endOffset = 41;
        const expectedContent = 'Some content with extra spaces';
        expect(decodeContentOfTag(data, startOffset, endOffset)).toBe(expectedContent);
    });

    test('should return an empty string if the offsets point to a non-existent tag content', () => {
        const data = '<tag></tag>';
        const startOffset = 0;
        const endOffset = 0;
        expect(decodeContentOfTag(data, startOffset, endOffset)).toBe('');
    });

    test('should return the content if startOffset and endOffset are the same', () => {
        const data = '<tag>Exact match</tag>';
        const startOffset = 5;
        const endOffset = 5;
        expect(decodeContentOfTag(data, startOffset, endOffset)).toBe('');
    });
});

describe('decodeClosingTag', () => {
    test('should return tag details if closing tag matches the expected start tag', () => {
        const data = '<tag>Some content</tag>';
        const regex = /<(\/)(\w+)>/g; // Regex to match closing tags
        const startTag = 'tag';

        const result = decodeClosingTag(data, regex, startTag);

        expect(result).toEqual({
            tag: 'tag',
            raw: '</tag>',
            index: 17,
            offset: 0
        });
    });

    test('should throw XMLParsingError if closing tag is missing', () => {
        const data = '<tag>Some content';
        const regex = /<\/(\w+)>/g;
        const startTag = 'tag';

        expect(() => decodeClosingTag(data, regex, startTag)).toThrow(XMLParsingError);
        expect(() => decodeClosingTag(data, regex, startTag)).toThrowError('Missing or invalid end tag of <tag> tag');
    });

    test('should throw XMLParsingError if closing tag does not match start tag', () => {
        const data = '<tag>Some content</div>';
        const regex = /<\/(\w+)>/g;
        const startTag = 'tag';

        expect(() => decodeClosingTag(data, regex, startTag)).toThrowError('Mismatched tags start <tag> and end tags <div>');
    });

    test('should handle regex with multiple matches and return the correct offset and index', () => {
        const data = '<tag>Content 1</tag><tag>Content 2</tag>';
        const regex = /<(\/)(\w+)>/g;
        const startTag = 'tag';

        // First match
        let result = decodeClosingTag(data, regex, startTag);
        expect(result).toEqual({
            tag: 'tag',
            raw: '</tag>',
            index: 14,
            offset: 0
        });

        // Second match
        result = decodeClosingTag(data, regex, startTag);
        expect(result).toEqual({
            tag: 'tag',
            raw: '</tag>',
            index: 34,
            offset: 20
        });
    });

    test('should correctly handle the offset property of the regex', () => {
        const data = '<tag>First</tag><tag>Second</tag>';
        const regex = /<(\/)(\w+)>/g;
        const startTag = 'tag';

        const result = decodeClosingTag(data, regex, startTag);
        expect(result.index).toBe(10); // The offset should reflect the position of the closing tag
    });
});

describe('decodeTag', () => {
    test('should return content between the tags', () => {
        const data = '<data>Content inside tag</data>';
        const regex = /<(\/?)(\w+)>/g;
        const startTag = regex.exec(data)![2];

        // Directly test the decodeTag function without mocking
        const result = decodeTag(data, regex, startTag);
        expect(result).toBe('Content inside tag');
    });

    test('should return an empty string if no content is found', () => {
        const data = '<tag></tag>';
        const regex = /<(\/?)(\w+)>/g;
        const startTag = regex.exec(data)![2];

        const result = decodeTag(data, regex, startTag);
        expect(result).toBe('');
    });

    test('should throw an error if decodeClosingTag throws an error (invalid closing tag)', () => {
        const data = '<tag>Content inside tag</div>';
        const regex = /<\/?(\w+)>/g;
        const startTag = regex.exec(data)![1];

        expect(() => decodeTag(data, regex, startTag)).toThrowError('Mismatched tags start <tag> and end tags <div>');
    });

    test('should throw an error if the closing tag is missing', () => {
        const data = '<tag>Content inside tag';
        const regex = /<\/(\w+)>/g;
        const startTag = 'tag';

        expect(() => decodeTag(data, regex, startTag)).toThrow(XMLParsingError);
        expect(() => decodeTag(data, regex, startTag)).toThrowError('Missing or invalid end tag of <tag> tag');
    });

    test('should return the content correctly for nested tags', () => {
        const data = `<tag>${ encodeEscaping('<inner>Nested content</inner>') }</tag>`;
        const regex = /<(\/?)(\w+)>/g;
        const startTag = regex.exec(data)![2];

        const result = decodeTag(data, regex, startTag);
        expect(result).toBe('<inner>Nested content</inner>');
    });

    test('should handle complex content with multiple tags', () => {
        const data = '<tag>First content</tag><tag>Second content</tag>';
        const regex = /<(\/?)(\w+)>/g;

        // Test for first tag
        let startTag = regex.exec(data)![2];
        const firstResult = decodeTag(data, regex, startTag);
        expect(firstResult).toBe('First content');

        // Test for second tag
        startTag = regex.exec(data)![2];
        const secondResult = decodeTag(data, regex, startTag);
        expect(secondResult).toBe('Second content');
    });

    test('should handle empty tags correctly', () => {
        const data = '<tag></tag>';
        const regex = /<(\/?)(\w+)>/g;
        const startTag = regex.exec(data)![2];

        const result = decodeTag(data, regex, startTag);
        expect(result).toBe('');
    });
});

describe('decodeDate', () => {
    test('should correctly parse a valid date string', () => {
        const content = '2024-12-14T00:00:00Z'; // Example of a valid ISO 8601 date
        const tagName = 'dateTag';

        const result = decodeDate(content, tagName);
        expect(result).toBeInstanceOf(Date);
        expect(result.toISOString()).toBe('2024-12-14T00:00:00.000Z'); // Expected ISO string format
    });

    test('should throw an error for invalid date string', () => {
        const content = 'invalid-date-string';
        const tagName = 'dateTag';

        expect(() => decodeDate(content, tagName)).toThrow(XMLParsingError);
        expect(() => decodeDate(content, tagName)).toThrowError(
            `Invalid date data for tag "${ tagName }": "${ content }" cannot be parsed as a valid date.`
        );
    });

    test('should throw an error for empty date string', () => {
        const content = '';
        const tagName = 'dateTag';

        expect(() => decodeDate(content, tagName)).toThrow(XMLParsingError);
        expect(() => decodeDate(content, tagName)).toThrowError(
            `Invalid date data for tag "${ tagName }": "${ content }" cannot be parsed as a valid date.`
        );
    });

    test('should throw an error for a date string with an invalid format', () => {
        const content = '2024-13-32'; // Invalid date: December 32nd doesn't exist
        const tagName = 'dateTag';

        expect(() => decodeDate(content, tagName)).toThrow(XMLParsingError);
        expect(() => decodeDate(content, tagName)).toThrowError(
            `Invalid date data for tag "${ tagName }": "${ content }" cannot be parsed as a valid date.`
        );
    });
});

describe('decodeNumber', () => {
    test('should correctly parse a valid number string', () => {
        const content = '1234';
        const tagName = 'numberTag';

        const result = decodeNumber(content, tagName);
        expect(result).toBe(1234);
        expect(typeof result).toBe('number');
    });

    test('should correctly parse a valid floating-point number string', () => {
        const content = '1234.56';
        const tagName = 'numberTag';

        const result = decodeNumber(content, tagName);
        expect(result).toBe(1234.56);
        expect(typeof result).toBe('number');
    });

    test('should throw an error for an invalid number string', () => {
        const content = 'invalid-number';
        const tagName = 'numberTag';

        expect(() => decodeNumber(content, tagName)).toThrow(XMLParsingError);
        expect(() => decodeNumber(content, tagName)).toThrowError(
            `Invalid number data for tag "${ tagName }": "${ content }" cannot be converted to a valid number.`
        );
    });

    test('should throw an error for an empty string', () => {
        const content = '';
        const tagName = 'numberTag';

        expect(() => decodeNumber(content, tagName)).toThrow(XMLParsingError);
        expect(() => decodeNumber(content, tagName)).toThrowError(
            `Invalid number data for tag "${ tagName }": "${ content }" cannot be converted to a valid number.`
        );
    });

    test('should throw an error for non-numeric string', () => {
        const content = 'abc123';
        const tagName = 'numberTag';

        expect(() => decodeNumber(content, tagName)).toThrow(XMLParsingError);
        expect(() => decodeNumber(content, tagName)).toThrowError(
            `Invalid number data for tag "${ tagName }": "${ content }" cannot be converted to a valid number.`
        );
    });

    test('should correctly parse zero and negative numbers', () => {
        const contentZero = '0';
        const tagName = 'numberTag';
        const contentNegative = '-1234';

        const resultZero = decodeNumber(contentZero, tagName);
        const resultNegative = decodeNumber(contentNegative, tagName);

        expect(resultZero).toBe(0);
        expect(resultNegative).toBe(-1234);
    });
});

describe('decodePrimitive', () => {
    test('should decode a string tag', () => {
        const content = 'Hello, world!';
        const tagName = 'string';

        const result = decodePrimitive(content, tagName);
        expect(result).toBe(content);
    });

    test('should decode an integer tag', () => {
        const content = '123';
        const tagName = 'integer';

        const result = decodePrimitive(content, tagName);
        expect(result).toBe(123);
    });

    test('should decode a real (floating-point) tag', () => {
        const content = '123.45';
        const tagName = 'real';

        const result = decodePrimitive(content, tagName);
        expect(result).toBe(123.45);
    });

    test('should decode a true tag', () => {
        const content = '';
        const tagName = 'true';

        const result = decodePrimitive(content, tagName);
        expect(result).toBe(true);
    });

    test('should decode a false tag', () => {
        const content = '';
        const tagName = 'false';

        const result = decodePrimitive(content, tagName);
        expect(result).toBe(false);
    });

    test('should decode a date tag', () => {
        const content = '2024-12-15T00:00:00.000Z'; // Example of a valid ISO 8601 date
        const tagName = 'date';

        const result = <Date> decodePrimitive(content, tagName);
        expect(result).toBeInstanceOf(Date);
        expect(result.toISOString()).toBe(content);
    });

    test('should decode a data tag (base64)', () => {
        const content = 'SGVsbG8sIHdvcmxkIQ=='; // "Hello, world!" in base64
        const tagName = 'data';

        const result = <Buffer> decodePrimitive(content, tagName);
        expect(result).toBeInstanceOf(Buffer);
        expect(result.toString('utf8')).toBe('Hello, world!');
    });

    test('should throw an error for unsupported tag types', () => {
        const content = 'Unsupported content';
        const tagName = 'unsupported';

        expect(() => decodePrimitive(content, tagName)).toThrow(Error);
        expect(() => decodePrimitive(content, tagName)).toThrowError(`Unsupported tag: <${ tagName }>`);
    });

    test('should throw an error for invalid number in integer or real tags', () => {
        const content = 'invalid-number';
        const tagName = 'integer';

        expect(() => decodePrimitive(content, tagName)).toThrow(XMLParsingError);
        expect(() => decodePrimitive(content, tagName)).toThrowError(
            `Invalid number data for tag "${ tagName }": "${ content }" cannot be converted to a valid number.`
        );
    });

    test('should throw an error for invalid date content', () => {
        const content = 'invalid-date';
        const tagName = 'date';

        expect(() => decodePrimitive(content, tagName)).toThrow(XMLParsingError);
        expect(() => decodePrimitive(content, tagName)).toThrowError(
            `Invalid date data for tag "${ tagName }": "${ content }" cannot be parsed as a valid date.`
        );
    });

    test('should handle empty data for tags like "true" and "false"', () => {
        const trueResult = decodePrimitive('', 'true');
        const falseResult = decodePrimitive('', 'false');

        expect(trueResult).toBe(true);
        expect(falseResult).toBe(false);
    });
});
