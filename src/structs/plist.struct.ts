/**
 * Import will remove at compile time
 */

import type { RawNodeInterface } from '@structs/interfaces/plist.struct.interface';

/**
 * Imports
 */
import { XMLParsingError } from '@errors/xml.error';
import { decodeEscaping } from '@components/escape.component';

/**
 * The `encodeValue` function encodes a given value into an XML-like format, transforming it into a string representation
 * suitable for plist (Property List) encoding.
 * It handles various types of values, including strings, numbers,
 * booleans, buffers, arrays, objects, and dates,
 * by converting each type into its appropriate tag and content representation.
 * The encoded value is returned as a string.
 *
 * - **Input**:
 *   - `value`: The value to be encoded. It can be of various types, including:
 *     - `string`: Encodes as a `<string>` tag.
 *     - `number`: Encodes as either an `<integer>` or `<real>` tag, depending on whether the number is an integer.
 *     - `boolean`: Encodes as `<true>` or `<false>`.
 *     - `Buffer`: Encodes as a `<data>` tag with base64-encoded content.
 *     - `array`: Encodes as an `<array>` tag, with each element recursively encoded.
 *     - `object`: Encodes as a `<dict>` tag, with each key-value pair recursively encoded.
 *     - `Date`: Encodes as a `<date>` tag, using the ISO 8601 string representation of the date.
 *
 * - **Output**:
 *   - A string representing the encoded plist value, including the appropriate tags for the given value type.
 *
 * ## Example:
 * ```ts
 * const str = 'Hello';
 * console.log(encodeValue(str)); // <string>Hello</string>
 *
 * const num = 42;
 * console.log(encodeValue(num)); // <integer>42</integer>
 *
 * const arr = [1, 2, 3];
 * console.log(encodeValue(arr)); // <array><integer>1</integer><integer>2</integer><integer>3</integer></array>
 *
 * const obj = { name: 'John', age: 30 };
 * console.log(encodeValue(obj)); // <dict><key>name</key><string>John</string><key>age</key><integer>30</integer></dict>
 *
 * const date = new Date('2024-12-15');
 * console.log(encodeValue(date)); // <date>2024-12-15T00:00:00.000Z</date>
 * ```
 *
 * ## Error Handling:
 * - If the provided `value` is of a type that cannot be encoded (i.e., anything other than string, number, boolean,
 *   buffer, array, object, or Date), an `XMLParsingError` is thrown:
 *   ```ts
 *   throw new XMLParsingError(`Unsupported data type: ${ typeof value }`);
 *   ```
 *
 * ## Notes:
 * - The function recursively encodes arrays and objects, ensuring nested structures are properly serialized into the
 *   appropriate tags.
 * - For objects, keys are encoded using the `<key>` tag, while values are recursively encoded using the appropriate
 *   tags based on their type.
 *
 * @param value - The value to be encoded into a plist-compatible XML-like string.
 * @returns A string representing the encoded plist value with appropriate tags.
 * @throws {XMLParsingError} Throws an error if the value is of an unsupported type.
 */

export function encodeValue(value: unknown): string {
    switch (typeof value) {
        case 'string':
            return encodeTag('string', value);

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
                    .map(([ key, val ]) => `<key>${ key }</key>${ encodeValue(val) }`)
                    .join('');

                return encodeTag('dict', data);
            }
    }

    throw new XMLParsingError(`Unsupported data type: ${ typeof value }:${ value }`);
}

/**
 * The `encodeTag` function generates an XML-like string representation of a given tag and its associated value.
 * It handles boolean values with specific tags (`<true/>` or `<false/>`) and uses generic tags for all other types.
 *
 * - **Input**:
 *   - `tag`: A string representing the tag name to be used for the XML-like encoding.
 *   - `value`: The value to be wrapped within the provided tag. It can be of any type:
 *     - `boolean`: Encodes as `<true/>` or `<false/>` without including the tag name.
 *     - Other types: Encodes the value inside the given tag, e.g., `<tag>value</tag>`.
 *
 * - **Output**:
 *   - A string representing the XML-like encoded value with the specified tag.
 *
 * ## Example:
 * ```ts
 * const tag = 'string';
 * const value = 'Hello, World!';
 * console.log(encodeTag(tag, value)); // <string>Hello, World!</string>
 *
 * const boolTag = 'isActive';
 * const boolValue = true;
 * console.log(encodeTag(boolTag, boolValue)); // <true/>
 *
 * const customTag = 'number';
 * const customValue = 42;
 * console.log(encodeTag(customTag, customValue)); // <number>42</number>
 * ```
 *
 * ## Error Handling:
 * - This function does not validate the provided `tag` or `value`. It assumes the input is correctly formatted and that
 *   `value` is a type that can be safely converted to a string. Unexpected behavior might occur if `value` is an object
 *   or a symbol without proper string serialization.
 *
 * ## Notes:
 * - Boolean values are treated as a special case, encoded as `<true/>` or `<false/>`, ignoring the provided tag name.
 * - For all other types, the function wraps the value inside the specified tag, ensuring a simple XML-like structure.
 *
 * @param tag - The tag name to use for encoding the value.
 * @param value - The value to be encoded within the specified tag. Booleans are treated as special cases.
 * @returns A string representing the XML-like encoded value with the specified tag.
 */

export function encodeTag(tag: string, value: unknown): string {
    if (typeof value === 'boolean')
        return value ? '<true/>' : '<false/>';

    return `<${ tag }>${ value }</${ tag }>`;
}

/**
 * The `decodeClosingTag` function searches for the closing tag that matches the provided start tag in the input
 * string using a regular expression. It checks for the existence and validity of the end tag and ensures that the
 * closing tag matches the provided `startTag`. If the end tag is missing, invalid, or mismatched, the function throws
 * an `XMLParsingError`.
 *
 * The function returns an object of type `RawNodeInterface` containing details about the closing tag, including
 * the tag name, raw-matched string, index, and the current offset where the search began.
 *
 * - **Input**:
 *   - `data`: The string to search through for the closing tag.
 *   - `regex`: A regular expression used to locate the end tag.
 *   - `startTag`: The name of the tag whose closing counterpart is being searched for.
 *
 * - **Output**:
 *   - An object of type `RawNodeInterface` with the following properties:
 *     - `tag`: The name of the tag.
 *     - `raw`: The raw matched string for the closing tag.
 *     - `index`: The index where the closing tag was found in the string.
 *     - `offset`: The offset where the search began in the string.
 *
 * ## Example:
 * ```ts
 * const data = '<key>name</key><value>John</value>';
 * const regex = /<\/(\w+)>/g;
 * const result = decodeClosingTag(data, regex, 'key');
 * console.log(result.tag); // 'key'
 * console.log(result.raw); // '</key>'
 * console.log(result.index); // The index where '</key>' is found
 * ```
 *
 * ## Error Handling:
 * - If the end tag is missing or invalid, an `XMLParsingError` is thrown with the message:
 *   ```ts
 *   throw new XMLParsingError(`Missing or invalid end tag of <${startTag}> tag`);
 *   ```
 * - If the end tag does not match the expected `startTag`, an `XMLParsingError` is thrown with the message:
 *   ```ts
 *   throw new XMLParsingError(`Mismatched tags start <${startTag}> and end tags <${nextMatch[1]}>`);
 *   ```
 *
 * @param data - The string containing the XML data.
 * @param regex - The regular expression used to locate the end tag.
 * @param startTag - The name of the start tag to match with the closing tag.
 * @returns An object of type `RawNodeInterface` containing information about the closing tag.
 * @throws {XMLParsingError} Throws an `XMLParsingError` if the end tag is missing, invalid, or mismatched.
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
 * The `decodeContentOfTag` function extracts a portion of the input string between the specified `startOffset`
 * and `endOffset`, trims any leading or trailing whitespace, and decodes any escaped characters within the extracted
 * content using the `decodeEscaping` function.
 *
 * This function is useful for extracting and decoding content between specific indices, such as the content within
 * tags in XML or plist data, while handling HTML/XML escape sequences.
 *
 * - **Input**:
 *   - `data`: The string containing the content to extract and decode.
 *   - `startOffset`: The starting index in the string from where the extraction should begin.
 *   - `endOffset`: The ending index in the string where the extraction should end.
 *
 * - **Output**:
 *   - A string containing the decoded content between the `startOffset` and `endOffset`, with any escaped characters decoded.
 *
 * ## Example:
 * ```ts
 * const rawData = '<key>name</key>';
 * const content = decodeContentOfTag(rawData, 5, 9);
 * console.log(content); // 'name'
 * ```
 *
 * ## Error Handling:
 * - If the `data` is invalid or the `startOffset` and `endOffset` do not point to a valid content range, the function will
 *   return an empty string.
 * - If the `decodeEscaping` function encounters invalid or unmatched escape sequences, the behavior is undefined, but it will
 *   attempt to decode the content as best as possible.
 *
 * @param data - The string containing the content to extract and decode.
 * @param startOffset - The starting index for the content extraction.
 * @param endOffset - The ending index for the content extraction.
 * @returns A string containing the decoded content, or an empty string if no content is found.
 */

export function decodeContentOfTag(data: string, startOffset: number, endOffset: number): string {
    return decodeEscaping(data.slice(startOffset, endOffset).trim() ?? '');
}

/**
 * The `decodeTag` function extracts and decodes the content between a given start tag and its corresponding end tag
 * from the provided string. It first calls the `decodeClosingTag` function to locate the closing tag, and then extracts
 * the content between the start and end tags using `decodeContentOfTag`. The extracted content is returned as a decoded
 * string, with any escape sequences handled by `decodeEscaping`.
 *
 * This function is useful for extracting and decoding the content within specific tags, such as XML or plist tags,
 * while handling escape sequences.
 *
 * - **Input**:
 *   - `data`: A string containing the data to extract and decode.
 *   - `regex`: A regular expression used to locate the end tag.
 *   - `startTag`: The name of the start tag to match with the closing tag.
 *
 * - **Output**:
 *   - A string containing the decoded content between the start and end tags.
 *
 * ## Example:
 * ```ts
 * const data = '<key>name</key><value>John</value>';
 * const regex = /<\/?(\w+)>/g;
 * const result = decodeTag(data, regex, regex.exec(data)![1]);
 * console.log(result); // 'name'
 * ```
 *
 * ## Error Handling:
 * - If the end tag is missing, invalid, or mismatched, an `XMLParsingError` will be thrown by the `decodeClosingTag` function.
 * - If the content between the start and end tags cannot be extracted, the function will return an empty string.
 * - The function assumes that the content between the tags is valid and properly escaped. If any issues occur during the
 *   decoding process, the behavior is undefined.
 *
 * @param data - The string containing the data to decode.
 * @param regex - The regular expression used to locate the end tag.
 * @param startTag - The name of the start tag to match with the closing tag.
 * @returns A string containing the decoded content between the start and end tags.
 * @throws {XMLParsingError} Throws an `XMLParsingError` if the end tag is missing, invalid, or mismatched.
 */

export function decodeTag(data: string, regex: RegExp, startTag: string): string {
    const endTag = decodeClosingTag(data, regex, startTag);

    return decodeContentOfTag(data, endTag.offset, endTag.index);
}

/**
 * The `decodeDate` function attempts to parse the provided `content` string into a `Date` object. If the parsing is
 * unsuccessful (i.e., the content cannot be converted to a valid date), an `XMLParsingError` is thrown. The function
 * also includes the `tagName` in the error message for better context.
 *
 * This function is useful for extracting date values from XML or plist data, ensuring that the content can be correctly
 * interpreted as a `Date` object.
 *
 * - **Input**:
 *   - `content`: A string representing the date to be parsed.
 *   - `tagName`: The name of the tag from which the date is being extracted, used in the error message for context.
 *
 * - **Output**:
 *   - A `Date` object representing the parsed date.
 *
 * ## Example:
 * ```ts
 * const dateContent = '2024-12-14T00:00:00Z';
 * const tagName = 'dateCreated';
 * const parsedDate = decodeDate(dateContent, tagName);
 * console.log(parsedDate); // 2024-12-14T00:00:00.000Z
 * ```
 *
 * ## Error Handling:
 * - If the `content` cannot be parsed into a valid `Date`, an `XMLParsingError` is thrown with a message indicating
 *   the invalid date and the tag name:
 *   ```ts
 *   throw new XMLParsingError(`Invalid date data for tag "${tagName}": "${content}" cannot be parsed as a valid date.`);
 *   ```
 *
 * @param content - The string containing the date to be parsed.
 * @param tagName - The name of the tag for context in the error message.
 * @returns A `Date` object representing the parsed date.
 * @throws {XMLParsingError} Throws an `XMLParsingError` if the `content` cannot be parsed into a valid `Date`.
 */

export function decodeDate(content: string, tagName: string): Date {
    const date = new Date(content);
    if (isNaN(+date))
        throw new XMLParsingError(`Invalid date data for tag "${ tagName }": "${ content }" cannot be parsed as a valid date.`);

    return date;
}

/**
 * The `decodeNumber` function attempts to convert the provided `content` string into a number. If the conversion
 * is unsuccessful (i.e., the content cannot be converted to a valid number or is an empty string), an `XMLParsingError`
 * is thrown. The function includes the `tagName` in the error message for better context.
 *
 * This function is useful for extracting numerical values from XML or plist data, ensuring that the content can be
 * correctly interpreted as a number.
 *
 * - **Input**:
 *   - `content`: A string representing the number to be converted.
 *   - `tagName`: The name of the tag from which the number is being extracted, used in the error message for context.
 *
 * - **Output**:
 *   - A `number` representing the converted value from the `content` string.
 *
 * ## Example:
 * ```ts
 * const numberContent = '42';
 * const tagName = 'age';
 * const parsedNumber = decodeNumber(numberContent, tagName);
 * console.log(parsedNumber); // 42
 * ```
 *
 * ## Error Handling:
 * - If the `content` cannot be converted to a valid number or is an empty string, an `XMLParsingError` is thrown with a message indicating the invalid data and the tag name:
 *   ```ts
 *   throw new XMLParsingError(`Invalid number data for tag "${tagName}": "${content}" cannot be converted to a valid number.`);
 *   ```
 *
 * @param content - The string containing the number to be converted.
 * @param tagName - The name of the tag for context in the error message.
 * @returns A `number` representing the converted value.
 * @throws {XMLParsingError} Throws an `XMLParsingError` if the `content` cannot be converted to a valid number.
 */

export function decodeNumber(content: string, tagName: string): number {
    const number = Number(content);
    if (Number.isNaN(number) || content === '')
        throw new XMLParsingError(`Invalid number data for tag "${ tagName }": "${ content }" cannot be converted to a valid number.`);

    return number;
}

/**
 * The `decodePrimitive` function decodes a primitive value from its string representation based on the provided tag name.
 * It supports a variety of primitive types, including strings, numbers, booleans, dates, and binary data. The function
 * uses the tag name to determine the type of the content and applies the appropriate decoding logic.
 *
 * - **Supported Tags**:
 *   - `'string'`: Returns the content as a string.
 *   - `'integer'` or `'real'`: Converts the content to a number using `decodeNumber`.
 *   - `'true'`: Returns the boolean value `true`.
 *   - `'false'`: Returns the boolean value `false`.
 *   - `'date'`: Converts the content to a `Date` object using `decodeDate`.
 *   - `'data'`: Decodes the content as base64-encoded binary data into a `Buffer`.
 *
 * - **Input**:
 *   - `content`: The string content to decode.
 *   - `tagName`: The name of the tag that determines the type of the content.
 *
 * - **Output**:
 *   - The decoded value, whose type depends on the tag:
 *     - `string` for `'string'`.
 *     - `number` for `'integer'` or `'real'`.
 *     - `boolean` for `'true'` or `'false'`.
 *     - `Date` for `'date'`.
 *     - `Buffer` for `'data'`.
 *
 * ## Example:
 * ```ts
 * console.log(decodePrimitive('42', 'integer')); // 42
 * console.log(decodePrimitive('true', 'true')); // true
 * console.log(decodePrimitive('2024-12-14T00:00:00Z', 'date')); // Date object
 * console.log(decodePrimitive('SGVsbG8gd29ybGQ=', 'data')); // Buffer containing "Hello world"
 * ```
 *
 * ## Error Handling:
 * - If the `tagName` is unsupported, an `Error` is thrown with a message indicating the unsupported tag:
 *   ```ts
 *   throw new Error(`Unsupported tag: <${tagName}>`);
 *   ```
 *
 * @param content - The string content to decode.
 * @param tagName - The name of the tag indicating the type of the content.
 * @returns The decoded value, with its type determined by the tag name.
 * @throws {Error} Throws an `Error` if the tag name is unsupported.
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
