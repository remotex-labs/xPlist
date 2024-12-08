/**
 * Imports
 */

import { XMLParsingError } from '@errors/xml.error';
import { decodePlist, encodePlist } from '@services/plist.service';

/**
 * Tests
 */

describe('encodePlist', () => {
    test('should encode a string value', () => {
        const result = encodePlist('Hello, World!');
        expect(result).toContain('<string>Hello, World!</string>');
    });

    test('should encode an integer value', () => {
        const result = encodePlist(42);
        expect(result).toContain('<integer>42</integer>');
    });

    test('should encode a real number value', () => {
        const result = encodePlist(3.14);
        expect(result).toContain('<real>3.14</real>');
    });

    test('should encode boolean true', () => {
        const result = encodePlist(true);
        expect(result).toContain('<true/>');
    });

    test('should encode boolean false', () => {
        const result = encodePlist(false);
        expect(result).toContain('<false/>');
    });

    test('should encode a Date value', () => {
        const date = new Date('2024-12-14T04:06:59Z');
        const result = encodePlist(date);
        expect(result).toContain('<date>2024-12-14T04:06:59.000Z</date>');
    });

    test('should encode a Buffer value as base64 in <data> tag', () => {
        const buffer = Buffer.from('Test data');
        const result = encodePlist(buffer);
        expect(result).toContain('<data>VGVzdCBkYXRh</data>'); // base64 of "Test data"
    });

    test('should encode an array of mixed types', () => {
        const data = [ 'Hello', 42, true, 3.14, new Date('2024-12-14T04:06:59Z') ];
        const result = encodePlist(data);
        expect(result).toContain(
            '<array><string>Hello</string><integer>42</integer><true/><real>3.14</real><date>2024-12-14T04:06:59.000Z</date></array>'
        );
    });

    test('should encode a nested object correctly', () => {
        const data = {
            name: 'John',
            age: 30,
            address: {
                street: '123 Main St',
                city: 'Somewhere'
            },
            isActive: true
        };

        const result = encodePlist(data);
        expect(result).toContain(
            '<dict><key>name</key><string>John</string><key>age</key><integer>30</integer><key>address</key>' +
            '<dict><key>street</key><string>123 Main St</string><key>city</key><string>Somewhere</string></dict>' +
            '<key>isActive</key><true/></dict>'
        );
    });

    test('should encode an array of objects', () => {
        const data = [
            { name: 'John', age: 30 },
            { name: 'Jane', age: 25 }
        ];

        const result = encodePlist(data);
        expect(result).toContain(
            '<array><dict><key>name</key><string>John</string><key>age</key><integer>30</integer></dict>' +
            '<dict><key>name</key><string>Jane</string><key>age</key><integer>25</integer></dict></array>'
        );
    });

    test('should encode an empty object correctly', () => {
        const result = encodePlist({});
        expect(result).toContain('<dict></dict>');
    });

    test('should encode an empty array correctly', () => {
        const result = encodePlist([]);
        expect(result).toContain('<array></array>');
    });

    test('should throw error for unsupported types', () => {
        const invalidData = undefined;
        expect(() => encodePlist(invalidData)).toThrow(XMLParsingError);
        expect(() => encodePlist(invalidData)).toThrowError('Unsupported data type: undefined');
    });

    test('should encode deeply nested structures', () => {
        const data = {
            user: {
                profile: {
                    name: 'Alice',
                    age: 29,
                    preferences: {
                        color: 'blue',
                        food: 'pasta'
                    }
                },
                isAdmin: false
            },
            items: [ 'apple', 'banana' ]
        };

        const result = encodePlist(data);
        expect(result).toContain(
            '<dict><key>user</key><dict><key>profile</key><dict><key>name</key><string>Alice</string><key>age</key><integer>29</integer>' +
            '<key>preferences</key><dict><key>color</key><string>blue</string><key>food</key><string>pasta</string></dict></dict>' +
            '<key>isAdmin</key><false/></dict><key>items</key><array><string>apple</string><string>banana</string></array></dict>'
        );
    });

    test('should throw an error when data is null', () => {
        // Call encodePlist with null and expect it to throw an XMLParsingError
        expect(() => encodePlist(null)).toThrow(XMLParsingError);
        expect(() => encodePlist(null)).toThrowError('Invalid input: Expected a non-null JavaScript object.');
    });
});

describe('decodePlist', () => {
    test.failing('should throw error for malformed XML (missing closing tag)', () => {
        const malformedPlist = `
        <?xml version="1.0" encoding="UTF-8"?>
        <plist version="1.0">
            <array>
                <string>bar</string>
                <integer>5</integer>
        </plist>
        `;

        expect(() => decodePlist(malformedPlist)).toThrow(XMLParsingError);
        expect(() => decodePlist(malformedPlist)).toThrowError('Malformed XML: No valid tags found.');
    });

    test('should throw error for invalid tag type (string where real is expected)', () => {
        const invalidPlist = `
        <?xml version="1.0" encoding="UTF-8"?>
        <plist version="1.0">
            <array>
                <real>invalid_real</real>
            </array>
        </plist>
        `;

        expect(() => decodePlist(invalidPlist)).toThrow(XMLParsingError);
        expect(() => decodePlist(invalidPlist)).toThrowError('Invalid number data for tag "real"');
    });

    test('should throw error for missing required key in dict', () => {
        const missingKeyPlist = `
        <?xml version="1.0" encoding="UTF-8"?>
        <plist version="1.0">
            <array>
                <dict>
                    <string>bar</string>
                </dict>
            </array>
        </plist>
        `;

        expect(() => decodePlist(missingKeyPlist)).toThrow(XMLParsingError);
        expect(() => decodePlist(missingKeyPlist)).toThrowError('Invalid structure: "dict" requires "key" as the first tag.');
    });

    test('should throw error for unknown tag', () => {
        const unknownTagPlist = `
        <?xml version="1.0" encoding="UTF-8"?>
        <plist version="1.0">
            <array>
                <unknownTag>bar</unknownTag>
            </array>
        </plist>
        `;

        expect(() => decodePlist(unknownTagPlist)).toThrow(XMLParsingError);
        expect(() => decodePlist(unknownTagPlist)).toThrowError('Unsupported tag: <unknownTag>');
    });

    test('should throw error for invalid boolean tag', () => {
        const invalidBooleanPlist = `
        <?xml version="1.0" encoding="UTF-8"?>
        <plist version="1.0">
            <array>
                <boolean>invalid_bool</boolean>
            </array>
        </plist>
        `;

        expect(() => decodePlist(invalidBooleanPlist)).toThrow(XMLParsingError);
        expect(() => decodePlist(invalidBooleanPlist)).toThrowError('Unsupported tag: <boolean>');
    });

    test('should throw error for empty plist', () => {
        const emptyPlist = '';

        expect(() => decodePlist(emptyPlist)).toThrow(XMLParsingError);
        expect(() => decodePlist(emptyPlist)).toThrowError('Invalid plist: <plist> tags not found or malformed XML');
    });

    test('should throw error for invalid date format', () => {
        const invalidDatePlist = `
        <?xml version="1.0" encoding="UTF-8"?>
        <plist version="1.0">
            <array>
                <date>invalid-date-format</date>
            </array>
        </plist>
        `;

        expect(() => decodePlist(invalidDatePlist)).toThrow(XMLParsingError);
        expect(() => decodePlist(invalidDatePlist)).toThrowError('Invalid date data for tag "date": "invalid-date-format" cannot be parsed as a valid date.');
    });

    test('should throw error for nested dict with invalid structure', () => {
        const invalidNestedDictPlist = `
        <?xml version="1.0" encoding="UTF-8"?>
        <plist version="1.0">
            <array>
                <dict>
                    <key>foo</key>
                    <string>bar</string>
                    <key>bar</key>
                    <dict>
                        <string>inner</string>
                    </dict>
                </dict>
            </array>
        </plist>
        `;

        expect(() => decodePlist(invalidNestedDictPlist)).toThrow(XMLParsingError);
        expect(() => decodePlist(invalidNestedDictPlist)).toThrowError('Invalid structure: "dict" requires "key" as the first tag.');
    });

    test('should throw error for unsupported tag', () => {
        const unsupportedTagPlist = `
        <?xml version="1.0" encoding="UTF-8"?>
        <plist version="1.0">
            <array>
                <unsupportedTag>value</unsupportedTag>
            </array>
        </plist>
        `;

        expect(() => decodePlist(unsupportedTagPlist)).toThrow(XMLParsingError);
        expect(() => decodePlist(unsupportedTagPlist)).toThrowError('Unsupported tag: <unsupportedTag>');
    });

    test('should throw error for missing root tag', () => {
        const missingRootPlist = `
        <?xml version="1.0" encoding="UTF-8"?>
            <array>
                <string>value</string>
            </array>
        `;

        expect(() => decodePlist(missingRootPlist)).toThrow(XMLParsingError);
        expect(() => decodePlist(missingRootPlist)).toThrowError('Invalid plist: <plist> tags not found or malformed XML');
    });

    test('should correctly parse valid plist and return parsed object', () => {
        const validPlist = `
        <?xml version="1.0" encoding="UTF-8"?>
        <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
        <plist version="1.0">
            <array>
                <data test 2+ (56) asd=asdf>QUI=</data>
                <string>bar</string>
                <integer>5</integer>
                <real>1.2</real>
                <true/>
                <false/>
                <date>2024-12-14T04:06:59Z</date>
                <data>QUI=</data>
                <array>
                    <string>nested bar</string>
                    <integer>24</integer>
                    <true/>
                    <dict>
                        <key>foo1</key>
                        <data>QUI=</data>
                        <key>foo2</key>
                        <string>bar</string>
                        <key>foo3</key>
                        <integer>5</integer>
                        <key>foo4</key>
                        <real>1.2</real>
                        <key>foo5</key>
                        <true/>
                        <key>foo6</key>
                        <false/>
                        <key>foo7</key>
                        <date>2024-12-14T04:06:59Z</date>
                        <key>foo8</key>
                        <data>QUI=</data>
                        <key>foo9</key>
                        <dict>
                            <key>foo23</key>
                            <string>bar2</string>
                            <key>foo22</key>
                            <integer>422</integer>
                            <key>foo32</key>
                            <true/>
                        </dict>
                    </dict>
                </array>
            </array>
        </plist>
        `;

        const expectedResult = [
            Buffer.from('QUI=', 'base64'),
            'bar',
            5,
            1.2,
            true,
            false,
            new Date('2024-12-14T04:06:59Z'),
            Buffer.from('QUI=', 'base64'),
            [
                'nested bar',
                24,
                true,
                {
                    foo1: Buffer.from('QUI=', 'base64'),
                    foo2: 'bar',
                    foo3: 5,
                    foo4: 1.2,
                    foo5: true,
                    foo6: false,
                    foo7: new Date('2024-12-14T04:06:59Z'),
                    foo8: Buffer.from('QUI=', 'base64'),
                    foo9: {
                        foo23: 'bar2',
                        foo22: 422,
                        foo32: true
                    }
                }
            ]
        ];

        const result = decodePlist(validPlist);

        expect(result).toEqual(expectedResult);
    });
});
