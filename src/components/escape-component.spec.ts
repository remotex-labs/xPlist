/**
 * Imports
 */

import { XMLParsingError } from '@errors/xml.error';
import { decodeEscaping, encodeEscaping } from '@components/escape.component';

/**
 * Tests
 */

describe('encodeEscaping', () => {
    test('should encode <, >, &, ", and \' to their corresponding HTML entities', () => {
        const input = '<div class="example">Hello & Welcome\'s</div>';
        const expectedOutput = '&lt;div class=&quot;example&quot;&gt;Hello &amp; Welcome&#39;s&lt;/div&gt;';
        expect(encodeEscaping(input)).toBe(expectedOutput);
    });

    test('should leave characters not in the map unchanged', () => {
        const input = 'No special characters here!';
        expect(encodeEscaping(input)).toBe(input); // No encoding should happen
    });

    test('should correctly handle an empty string', () => {
        expect(encodeEscaping('')).toBe(''); // Should return an empty string
    });

    test('should handle strings with multiple occurrences of special characters', () => {
        const input = '<div>"Hello" & \'World\'</div>';
        const expectedOutput = '&lt;div&gt;&quot;Hello&quot; &amp; &#39;World&#39;&lt;/div&gt;';
        expect(encodeEscaping(input)).toBe(expectedOutput);
    });

    test('should encode only the characters that need encoding', () => {
        const input = 'a < b & "c" \'d\' e';
        const expectedOutput = 'a &lt; b &amp; &quot;c&quot; &#39;d&#39; e';
        expect(encodeEscaping(input)).toBe(expectedOutput);
    });

    test('should throw a PlistError if encodeEscaping input is not a string', () => {
        const nonStringInputs = [ 123, true, [], {}, null, undefined ];

        nonStringInputs.forEach((input) => {
            expect(() => encodeEscaping(input as any)).toThrowError(XMLParsingError);
            expect(() => encodeEscaping(input as any)).toThrowError(
                new XMLParsingError(`Invalid input type: expected a string, received ${ typeof input }`)
            );
        });
    });
});

describe('decodeEscaping', () => {
    test('should decode &lt;, &gt;, &amp;, &quot;, and &#39; to their corresponding characters', () => {
        const input = '&lt;div class=&quot;example&quot;&gt;Hello &amp; Welcome&#39;s&lt;/div&gt;';
        const expectedOutput = '<div class="example">Hello & Welcome\'s</div>';
        expect(decodeEscaping(input)).toBe(expectedOutput);
    });

    test('should leave characters that do not have matching entities unchanged', () => {
        const input = 'No HTML entities here!';
        expect(decodeEscaping(input)).toBe(input); // No decoding should happen
    });

    test('should correctly handle an empty string', () => {
        expect(decodeEscaping('')).toBe(''); // Should return an empty string
    });

    test('should handle strings with multiple occurrences of HTML entities', () => {
        const input = '&lt;div&gt;"Hello" &amp; &#39;World&#39;&lt;/div&gt;';
        const expectedOutput = '<div>"Hello" & \'World\'</div>';
        expect(decodeEscaping(input)).toBe(expectedOutput);
    });

    test('should decode only the HTML entities that have matching replacements', () => {
        const input = 'a &lt; b &amp; &quot;c&quot; &#39;d&#39; e';
        const expectedOutput = 'a < b & "c" \'d\' e';
        expect(decodeEscaping(input)).toBe(expectedOutput);
    });

    test('should leave non-matching HTML entities unchanged', () => {
        const input = 'Some random &unknown; entity';
        expect(decodeEscaping(input)).toBe('Some random &unknown; entity');
    });

    test('should throw a PlistError if decodeEscaping input is not a string', () => {
        const nonStringInputs = [ 123, true, [], {}, null, undefined ];

        nonStringInputs.forEach((input) => {
            expect(() => decodeEscaping(input as any)).toThrowError(XMLParsingError);
            expect(() => decodeEscaping(input as any)).toThrowError(
                new XMLParsingError(`Invalid input type: expected a string, received ${ typeof input }`)
            );
        });
    });
});
