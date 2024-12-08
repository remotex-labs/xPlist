/**
 * Imports
 */

import { XMLParsingError } from '@errors/xml.error';

/**
 * The `escapeEntities` object is a mapping of special characters and their corresponding HTML or XML entity codes
 * for escaping and unescaping purposes.
 * This is useful for safely handling user-generated content or dynamic data
 * that may contain characters with special meanings in HTML or XML, ensuring that they are rendered correctly and securely.
 *
 * The object contains both escape and unescape mappings, where special characters are converted to their HTML/XML
 * escape codes, and vice versa.
 */

const escapeEntities: Record<string, string> = {
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    '"': '&quot;',
    '\'': '&#39;',
    '&lt;': '<',
    '&gt;': '>',
    '&amp;': '&',
    '&quot;': '"',
    '&#39;': '\''
};

/**
 * The `encodeEscaping` function takes a string as input and returns a new string where special characters (such as
 * `<`, `>`, `&`, `"`, and `'`) are replaced with their corresponding HTML/XML entity codes. This is useful for escaping
 * user-generated or dynamic content to prevent injection attacks or incorrect rendering in HTML or XML contexts.
 *
 * The function uses the `escapeEntities` mapping to perform the replacements, ensuring that characters with special
 * meanings are properly escaped. If the input is not a string, the function throws a `XMLParsingError`.
 *
 * - **Input**:
 *   - `input`: A string that may contain special characters that need to be escaped for HTML or XML contexts.
 *
 * - **Output**:
 *   - A new string with special characters replaced by their corresponding HTML/XML entity codes.
 *
 * ## Example:
 * ```ts
 * const rawString = '<div>Example "Text" & more!</div>';
 * const escapedString = encodeEscaping(rawString);
 * console.log(escapedString); // '&lt;div&gt;Example &quot;Text&quot; &amp; more!&lt;/div&gt;'
 * ```
 *
 * ## Error Handling:
 * - If the input is not a string, the function throws a `XMLParsingError` with the message:
 *   ```ts
 *   throw new XMLParsingError(`Invalid input type: expected a string, received ${typeof input}`);
 *   ```
 * - It will only escape characters defined in the `escapeEntities` mapping. Characters not present in the mapping
 *   will remain unchanged.
 *
 * @param input - The string to be escaped.
 * @returns A new string with special characters escaped according to the `escapeEntities` mapping.
 * @throws {XMLParsingError} Throws a `XMLParsingError` if the input is not a string.
 */

export function encodeEscaping(input: string): string {
    if(typeof input !== 'string')
        throw new XMLParsingError(`Invalid input type: expected a string, received ${typeof input}`);

    return input.replace(/[<>&"']/g, (char) => escapeEntities[char] || char);
}

/**
 * The `decodeEscaping` function takes a string as input and returns a new string where HTML/XML entity codes (such as
 * `&lt;`, `&gt;`, `&amp;`, `&quot;`, and `&#39;`) are replaced with their corresponding special characters. This is useful
 * for converting escaped HTML or XML entities back into their original characters for proper rendering or processing.
 *
 * The function uses the `escapeEntities` mapping to perform the replacements, ensuring that entity codes are correctly
 * decoded back to their respective characters. If the input is not a string, the function throws a `XMLParsingError`.
 *
 * - **Input**:
 *   - `input`: A string that may contain HTML/XML entity codes that need to be decoded back into their corresponding
 *     special characters.
 *
 * - **Output**:
 *   - A new string with HTML/XML entity codes replaced by their corresponding special characters.
 *
 * ## Example:
 * ```ts
 * const escapedString = '&lt;div&gt;Example &quot;Text&quot; &amp; more!&lt;/div&gt;';
 * const decodedString = decodeEscaping(escapedString);
 * console.log(decodedString); // '<div>Example "Text" & more!</div>'
 * ```
 *
 * ## Error Handling:
 * - If the input is not a string, the function throws a `XMLParsingError` with the message:
 *   ```ts
 *   throw new XMLParsingError(`Invalid input type: expected a string, received ${typeof input}`);
 *   ```
 * - It will only decode entity codes defined in the `escapeEntities` mapping. Entity codes not present in the mapping
 *   will remain unchanged.
 *
 * @param input - The string to be decoded.
 * @returns A new string with HTML/XML entity codes replaced by their corresponding special characters.
 * @throws {XMLParsingError} Throws a `XMLParsingError` if the input is not a string.
 */

export function decodeEscaping(input: string): string {
    if(typeof input !== 'string')
        throw new XMLParsingError(`Invalid input type: expected a string, received ${typeof input}`);

    return input.replace(/&[a-zA-Z0-9#]+;/g, (entity) => escapeEntities[entity] || entity);
}
