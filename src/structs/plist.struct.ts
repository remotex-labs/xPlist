/**
 * Import will remove at compile time
 */

import type { RawNodeInterface } from '@structs/interfaces/plist-struct.interface';

/**
 * Imports
 */

import { XMLParsingError } from '@errors/xml.error';
import { decodeEscaping, encodeEscaping } from '@components/escape.component';

/**
 * Encodes a value into XML format for Property List (plist) representation
 *
 * @param value - The value to encode (supports various data types)
 * @returns An XML string representation of the value with appropriate plist tags
 *
 * @throws XMLParsingError - When an unsupported data type is provided
 *
 * @remarks
 * This function converts JavaScript values into properly formatted XML strings
 * for plist files. It handles different data types with specific XML tags:
 *
 * - string: Encoded as <string> tags with XML entity escaping
 * - number: Encoded as <integer> or <real> tags based on whether it's an integer
 * - boolean: Encoded as <true/> or <false/> tags
 * - Buffer: Encoded as <data> tags with base64-encoded content
 * - Array: Encoded as <array> tags with each element recursively encoded
 * - Object: Encoded as <dict> tags with key-value pairs
 * - Date: Encoded as <date> tags with ISO 8601 string representation
 *
 * The function recursively processes nested structures to ensure complete
 * serialization of complex data types.
 *
 * @example
 * ```ts
 * // Simple types
 * encodeValue("Hello") // Returns: <string>Hello</string>
 * encodeValue(42)      // Returns: <integer>42</integer>
 * encodeValue(3.14)    // Returns: <real>3.14</real>
 * encodeValue(true)    // Returns: <true/>
 *
 * // Complex types
 * encodeValue([1, "two", false])
 * // Returns: <array><integer>1</integer><string>two</string><false/></array>
 *
 * encodeValue({ name: "John", age: 30 })
 * // Returns: <dict><key>name</key><string>John</string><key>age</key><integer>30</integer></dict>
 *
 * encodeValue(new Date("2023-01-15"))
 * // Returns: <date>2023-01-15T00:00:00.000Z</date>
 * ```
 *
 * @since 1.0.1
 */

export function encodeValue(value: unknown): string {
    switch (typeof value) {
        case 'string':
            return encodeTag('string', encodeEscaping(value));

        case 'number':
            const type = Number.isInteger(value) ? 'integer' : 'real';

            return encodeTag(type, value);
        case 'boolean':
            return encodeTag('', value);
        case 'object':
            if (value instanceof Date) {
                return encodeTag('date', value.toISOString());
            }

            if (Buffer.isBuffer(value)) {
                return encodeTag('data', value.toString('base64'));
            }

            if (Array.isArray(value)) {
                return encodeTag('array', value.map(encodeValue).join(''));
            }

            if (value !== null) {
                const data = Object.entries(value as Record<string, unknown>)
                    .map(([ key, val ]) => `${ encodeTag('key', encodeEscaping(key)) }${ encodeValue(val) }`)
                    .join('');

                return encodeTag('dict', data);
            }
    }

    throw new XMLParsingError(`Unsupported data type: ${ typeof value }:${ value }`);
}

/**
 * Creates an XML tag string with the specified value
 *
 * @param tag - The XML tag name to use
 * @param value - The value to be enclosed in the tag
 * @returns A formatted XML tag string
 *
 * @remarks
 * This function generates XML-formatted strings for plist serialization.
 * It handles several special cases:
 *
 * - Boolean values are encoded as self-closing `<true/>` or `<false/>` tags,
 *   ignoring the provided tag name
 * - Empty strings are encoded as self-closing tags: `<tag/>`
 * - All other values are encoded with opening and closing tags: `<tag>value</tag>`
 *
 * The function does not perform XML character escaping on the value - any necessary
 * escaping should be done before calling this function.
 *
 * @example
 * ```ts
 * // Regular tag with content
 * encodeTag('string', 'Hello')     // Returns: <string>Hello</string>
 * encodeTag('integer', 42)         // Returns: <integer>42</integer>
 *
 * // Empty string results in self-closing tag
 * encodeTag('string', '')          // Returns: <string/>
 *
 * // Boolean values have special handling
 * encodeTag('anything', true)      // Returns: <true/>
 * encodeTag('ignored', false)      // Returns: <false/>
 * ```
 *
 * @since 1.0.1
 */

export function encodeTag(tag: string, value: string | number | boolean): string {
    if (typeof value === 'string' && value === '') return `<${ tag }/>`;
    if (typeof value === 'boolean') return value ? '<true/>' : '<false/>';

    return `<${ tag }>${ value }</${ tag }>`;
}

/**
 * Locates and validates the closing XML tag that matches a specified start tag
 *
 * @param data - The XML string to search through
 * @param regex - Regular expression pattern with capturing groups for the end tag
 * @param startTag - The opening tag name to match against
 * @returns Information about the closing tag including position and raw text
 *
 * @throws XMLParsingError - When end tag is missing or doesn't match the start tag
 *
 * @remarks
 * This function searches through the provided XML string to find the closing tag
 * that corresponds to a specific opening tag. It uses a regular expression with
 * capturing groups to extract information about the closing tag.
 *
 * The function performs two key validations:
 * 1. It verifies that a closing tag exists in the data
 * 2. It confirms that the closing tag name matches the provided start tag name
 *
 * The function returns a `RawNodeInterface` object containing:
 * - `tag`: The name of the matched tag
 * - `raw`: The full raw text of the closing tag
 * - `index`: The position where the closing tag was found
 * - `offset`: The position where the search began
 *
 * @example
 * ```ts
 * // Given XML: "<string>Hello</string>World"
 * const regex = /<\/([^>]+)>/g;
 * regex.lastIndex = 13; // Position after "<string>Hello"
 *
 * try {
 *   const result = decodeClosingTag(xml, regex, "string");
 *   console.log(result);
 *   // Output: { tag: "string", raw: "</string>", index: 18, offset: 13 }
 * } catch (error) {
 *   // Handle missing or mismatched tags
 * }
 * ```
 *
 * @since 1.0.1
 */

export function decodeClosingTag(data: string, regex: RegExp, startTag: string): RawNodeInterface {
    const offset = regex.lastIndex;
    const nextMatch = regex.exec(data);
    if (!nextMatch)
        throw new XMLParsingError(`Missing or invalid end tag of <${ startTag }> tag`);

    if (nextMatch[2] !== startTag)
        throw new XMLParsingError(`Mismatched tags start <${ startTag }> and end tags <${ nextMatch[1] }>`);

    return {
        tag: nextMatch[2],
        raw: nextMatch[0],
        index: nextMatch.index,
        offset
    };
}

/**
 * Extracts and decodes XML content between specified positions in a string
 *
 * @param data - The source string containing XML content
 * @param startOffset - The starting position from which to extract content
 * @param endOffset - The ending position where extraction should stop
 * @returns The extracted content with whitespace trimmed and XML entities decoded
 *
 * @remarks
 * This utility function extracts text between the specified offsets in an XML string,
 * trims any leading or trailing whitespace, and decodes XML entities and escape
 * sequences using the `decodeEscaping` function.
 *
 * The function is commonly used to extract the content between XML tags after
 * their positions have been identified. For example, to get the text between
 * `<string>` and `</string>` tags.
 *
 * If the provided offsets don't represent a valid range (e.g., startOffset \> endOffset),
 * an empty string will be returned.
 *
 * @example
 * ```ts
 * // Given XML: "<string>Hello &amp; World</string>"
 * const content = decodeContentOfTag(xml, 8, 20);
 * console.log(content); // "Hello & World"
 *
 * // Extract and decode a key from a plist file
 * const xml = "<key>app_version</key>";
 * const content = decodeContentOfTag(xml, 5, 16);
 * console.log(content); // "app_version"
 * ```
 *
 * @since 1.0.1
 */

export function decodeContentOfTag(data: string, startOffset: number, endOffset: number): string {
    return decodeEscaping(data.slice(startOffset, endOffset).trim() ?? '');
}

/**
 * Extracts and decodes content between matching XML tags
 *
 * @param data - The XML string to parse
 * @param regex - Regular expression with capturing groups to locate XML tags
 * @param startTag - The name of the opening tag to match
 * @param selfClose - Whether the tag is self-closing (defaults to false)
 * @returns The decoded content between the tags, or empty string for self-closing tags
 * @throws XMLParsingError - When the closing tag is missing or doesn't match the start tag
 *
 * @remarks
 * This function handles the extraction of content between matching XML tags. It works
 * in two modes:
 *
 * 1. For self-closing tags (when `selfClose` is true), it immediately returns an empty
 *    string since self-closing tags contain no content.
 *
 * 2. For regular tags, it:
 *    - Locates the matching closing tag using `decodeClosingTag`
 *    - Extracts the content between the tags using `decodeContentOfTag`
 *    - Returns the decoded content with XML entities properly converted
 *
 * The `regex` parameter should be a regular expression with capturing groups that
 * can match closing tags. Typically, this regex would be initialized before calling
 * this function and its `lastIndex` property would point to the position just after
 * the opening tag.
 *
 * @example
 * ```ts
 * // Regular tag with content
 * const xml = "<string>Hello &amp; World</string>";
 * const regex = /<\/([^>]+)>/g;
 * regex.lastIndex = 8; // Position after "<string>"
 * const content = decodeTag(xml, regex, "string");
 * console.log(content); // "Hello & World"
 *
 * // Self-closing tag
 * const emptyCont = decodeTag("<element/>", regex, "element", true);
 * console.log(emptyCont); // ""
 * ```
 *
 * @since 1.0.1
 */

export function decodeTag(data: string, regex: RegExp, startTag: string, selfClose: boolean = false): string {
    if(selfClose) return '';
    const endTag = decodeClosingTag(data, regex, startTag);

    return decodeContentOfTag(data, endTag.offset, endTag.index);
}

/**
 * Parses a string into a Date object, validating the result
 *
 * @param content - The date string to parse
 * @param tagName - The XML tag name (used in error messages)
 * @returns A valid Date object from the parsed string
 * @throws XMLParsingError - When the string cannot be parsed into a valid date
 *
 * @remarks
 * This function converts a string representation of a date (typically extracted
 * from an XML document) into a JavaScript Date object. It performs validation to
 * ensure the parsed result is a valid date.
 *
 * The function expects date strings in formats acceptable to the JavaScript Date
 * constructor, such as ISO 8601 format (e.g., "2023-01-15T12:30:00Z").
 *
 * If parsing fails, an XMLParsingError is thrown that includes both the tag name
 * and the invalid content in the error message to help with debugging.
 *
 * @example
 * ```ts
 * // Parse a valid date
 * try {
 *   const date = decodeDate("2023-01-15T12:30:00Z", "creationDate");
 *   console.log(date.toISOString()); // "2023-01-15T12:30:00.000Z"
 * } catch (error) {
 *   // Handle error
 * }
 *
 * // Invalid date will throw an error
 * try {
 *   const date = decodeDate("not-a-date", "modifiedDate");
 * } catch (error) {
 *   console.error(error.message);
 *   // "Invalid date data for tag "modifiedDate": "not-a-date" cannot be parsed as a valid date."
 * }
 * ```
 *
 * @since 1.0.1
 */

export function decodeDate(content: string, tagName: string): Date {
    const date = new Date(content);
    if (isNaN(+date))
        throw new XMLParsingError(`Invalid date data for tag "${ tagName }": "${ content }" cannot be parsed as a valid date.`);

    return date;
}

/**
 * Converts a string to a number with validation
 *
 * @param content - The numeric string to convert
 * @param tagName - The XML tag name (used in error messages)
 * @returns The parsed number value
 * @throws XMLParsingError - When the string cannot be converted to a valid number
 *
 * @remarks
 * This function safely converts a string representation of a number (typically
 * extracted from an XML document) into a JavaScript number. It performs validation
 * to ensure the parsed result is a valid number and not NaN.
 *
 * The function rejects both NaN values and empty strings as invalid number
 * representations. It throws a descriptive error that includes both the tag name
 * and the problematic content to aid in debugging.
 *
 * Common use cases include parsing numeric values from XML elements such as:
 * - <integer>42</integer>
 * - <real>3.14159</real>
 *
 * @example
 * ```ts
 * // Parse a valid integer
 * try {
 *   const value = decodeNumber("42", "count");
 *   console.log(value); // 42
 * } catch (error) {
 *   // Handle error
 * }
 *
 * // Parse a valid floating-point number
 * try {
 *   const value = decodeNumber("3.14159", "pi");
 *   console.log(value); // 3.14159
 * } catch (error) {
 *   // Handle error
 * }
 *
 * // Invalid number will throw an error
 * try {
 *   const value = decodeNumber("not-a-number", "quantity");
 * } catch (error) {
 *   console.error(error.message);
 *   // "Invalid number data for tag "quantity": "not-a-number" cannot be converted to a valid number."
 * }
 * ```
 *
 * @since 1.0.1
 */

export function decodeNumber(content: string, tagName: string): number {
    const number = Number(content);
    if (Number.isNaN(number) || content === '')
        throw new XMLParsingError(`Invalid number data for tag "${ tagName }": "${ content }" cannot be converted to a valid number.`);

    return number;
}

/**
 * Converts XML primitive values to their corresponding JavaScript types
 *
 * @param content - The string content to decode
 * @param tagName - The XML tag name that determines the target type
 * @returns The decoded value with the appropriate type
 * @throws XMLParsingError - When the tag name is not a supported primitive type
 *
 * @remarks
 * This function converts string content from XML elements into their corresponding
 * JavaScript types based on the XML tag name. It handles all the primitive types
 * found in property list (plist) and similar XML formats.
 *
 * The function supports the following mappings:
 * - `string` → String (unchanged)
 * - `integer`, `real` → Number (parsed with validation)
 * - `true` → Boolean true
 * - `false` → Boolean false
 * - `date` → Date object (parsed with validation)
 * - `data` → Buffer (decoded from base64)
 *
 * For numeric and date types, validation is performed to ensure the content
 * can be properly converted. For data types, the content is expected to be
 * base64-encoded and is decoded to a Buffer.
 *
 * @example
 * ```ts
 * // String
 * const str = decodePrimitive("Hello world", "string");
 * console.log(str); // "Hello world"
 *
 * // Number (integer)
 * const int = decodePrimitive("42", "integer");
 * console.log(int); // 42
 *
 * // Number (real/float)
 * const float = decodePrimitive("3.14159", "real");
 * console.log(float); // 3.14159
 *
 * // Boolean
 * const bool = decodePrimitive("", "true");
 * console.log(bool); // true
 *
 * // Date
 * const date = decodePrimitive("2023-01-15T12:30:00Z", "date");
 * console.log(date instanceof Date); // true
 *
 * // Binary data
 * const data = decodePrimitive("SGVsbG8gd29ybGQ=", "data");
 * console.log(data.toString()); // "Hello world"
 *
 * // Unsupported tag throws error
 * try {
 *   decodePrimitive("content", "unsupported");
 * } catch (error) {
 *   console.error(error.message); // "Unsupported tag: <unsupported>"
 * }
 * ```
 *
 * @since 1.0.1
 */

export function decodePrimitive(content: string, tagName: string): unknown {
    switch (tagName) {
        case 'string':
            return content;
        case 'integer':
        case 'real':
            return decodeNumber(content, tagName);
        case 'true':
            return true;
        case 'false':
            return false;
        case 'date':
            return decodeDate(content, tagName);
        case 'data':
            return Buffer.from(content.trim(), 'base64');
        default:
            throw new XMLParsingError(`Unsupported tag: <${ tagName }>`);
    }
}
