/**
 * Imports
 */

import { XMLParsingError } from '@errors/xml.error';

/**
 * A mapping of special characters to their HTML/XML entity codes and vice versa for escaping and unescaping purposes
 *
 * @remarks
 * This object provides bidirectional mapping to safely encode special characters in HTML/XML contexts
 * and decode entity references back to their original characters.
 * Use this mapping to prevent XSS vulnerabilities when rendering user-generated content.
 *
 * @example
 * ```ts
 * const escaped = '<div>'.replace(/[<>&"']/g, char => escapeEntities[char]);
 * // escaped = '&lt;div&gt;'
 *
 * const unescaped = '&lt;div&gt;'.replace(/&(lt|gt|amp|quot|#39);/g, entity => escapeEntities[entity]);
 * // unescaped = '<div>'
 * ```
 *
 * @since 1.0.1
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
 * Escapes special HTML/XML characters in a string with their corresponding entity codes
 *
 * @param input - The string to be escaped
 * @returns A new string with special characters escaped according to the escapeEntities mapping
 * @throws XMLParsingError - If the input is not a string
 *
 * @remarks
 * This function replaces characters like '\<', '\>', '&', '"', and ''' with their
 * corresponding HTML/XML entity codes to prevent injection attacks and ensure
 * correct rendering in HTML or XML contexts.
 *
 * @example
 * ```ts
 * const rawString = '<div>Example "Text" & more!</div>';
 * const escapedString = encodeEscaping(rawString);
 * // escapedString = '&lt;div&gt;Example &quot;Text&quot; &amp; more!&lt;/div&gt;'
 * ```
 *
 * @since 1.0.1
 */

export function encodeEscaping(input: string): string {
    if(typeof input !== 'string')
        throw new XMLParsingError(`Invalid input type: expected a string, received ${typeof input}`);

    return input.replace(/[<>&"']/g, (char) => escapeEntities[char] || char);
}

/**
 * Converts HTML/XML entity codes in a string back to their corresponding special characters
 *
 * @param input - The string containing entity codes to be decoded
 * @returns A new string with HTML/XML entity codes replaced by their original characters
 * @throws XMLParsingError - If the input is not a string
 *
 * @remarks
 * This function replaces entity codes like '&lt;', '&gt;', '&amp;', '&quot;', and '&#39;'
 * with their corresponding special characters '\<', '\>', '&', '"', and '''.
 * Only entity codes defined in the escapeEntities mapping will be decoded.
 *
 * @example
 * ```ts
 * const escapedString = '&lt;div&gt;Example &quot;Text&quot; &amp; more!&lt;/div&gt;';
 * const decodedString = decodeEscaping(escapedString);
 * // decodedString = '<div>Example "Text" & more!</div>'
 * ```
 *
 * @since 1.0.1
 */

export function decodeEscaping(input: string): string {
    if(typeof input !== 'string')
        throw new XMLParsingError(`Invalid input type: expected a string, received ${typeof input}`);

    return input.replace(/&[a-zA-Z0-9#]+;/g, (entity) => escapeEntities[entity] || entity);
}
