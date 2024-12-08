/**
 * Imports
 */

import { PlistError } from './base.error';

/**
 * The `XMLParsingError` class extends the `PlistError` class to represent errors specific to XML parsing issues
 * encountered within plist (Property List) files. This error type is useful for handling and distinguishing errors
 * related to XML parsing from other plist-related errors.
 *
 * The error class customizes the error name to `'XMLParsingError'` and maintains the stack trace
 * for better debugging and error handling. It also allows the inclusion of additional context through the `details`
 * property, which can provide more specific information about the nature of the XML parsing failure.
 *
 * - **Input**:
 *   - `message`: A string representing the error message that provides details about the specific XML parsing error.
 *   - `details` (optional): A string that can provide additional context about the error (e.g., the problematic XML content or tag).
 *
 * - **Output**:
 *   - An instance of `XMLParsingError`, which contains the message, name (`XMLParsingError`), stack trace, and optional details.
 *
 * ## Example:
 * ```ts
 * try {
 *   throw new XMLParsingError('Failed to parse XML data in the plist file.', 'The root tag was missing.');
 * } catch (error) {
 *   console.log(error.name);    // 'XMLParsingError'
 *   console.log(error.message); // 'Failed to parse XML data in the plist file. - The root tag was missing.'
 *   console.log(error.stack);   // Stack trace of the error
 * }
 * ```
 *
 * ## Error Handling:
 * - The class relies on the base `PlistError` class for error message handling and stack trace capturing.
 * - If the `message` is not provided, the `Error` constructor's default behavior will apply, and an empty message will
 *   be assigned.
 * - If `details` is provided, it is appended to the message for better error context.
 *
 * @param message - The error message describing the XML parsing issue encountered.
 * @param details - (Optional) A string with additional context about the error (e.g., specific content or tag that caused the error).
 * @returns An `XMLParsingError` instance with a customized error name, message, and stack trace.
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
