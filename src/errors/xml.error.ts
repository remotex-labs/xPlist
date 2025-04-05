/**
 * Imports
 */

import { PlistError } from './base.error';

/**
 * Custom error class for XML parsing errors in Property List files
 *
 * @param message - The error message describing the XML parsing issue
 * @param details - Optional additional information about the parsing error
 *
 * @remarks
 * This class extends the PlistError class to provide specific error handling
 * for XML parsing operations in plist files. It includes a custom error name
 * ('XMLParsingError') and captures the stack trace for improved debugging.
 *
 * If details are provided, they are appended to the main error message with
 * a separator for more comprehensive error reporting. This helps identify
 * the exact nature of XML parsing failures, such as malformed elements or
 * missing attributes.
 *
 * @example
 * ```ts
 * try {
 *   // Attempt to parse XML content
 *   if (!xmlContent.includes('<plist')) {
 *     throw new XMLParsingError(
 *       'Invalid plist XML format',
 *       'Missing plist root element'
 *     );
 *   }
 * } catch (error) {
 *   if (error instanceof XMLParsingError) {
 *     console.error(error.message);
 *     // Output: "Invalid plist XML format - Missing plist root element"
 *   }
 * }
 * ```
 *
 * @since 1.0.1
 */

export class XMLParsingError extends PlistError {
    constructor(message: string, public details?: string) {
        super(message);

        // Maintain proper stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, XMLParsingError);
        }

        // Assign a generic name for base errors
        this.name = 'XMLParsingError';
        if (details) {
            this.message += ` - ${details}`;
        }
    }
}
