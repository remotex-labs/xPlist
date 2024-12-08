/**
 * Imports
 */

import { PlistError } from './base.error';

/**
 * The `BinaryParsingError` class extends the `PlistError` class and represents an error related to binary data parsing.
 * It provides additional context through an optional `details` field that can store further information about the error.
 * This class is designed to help identify and handle issues encountered while parsing binary data.
 *
 * The error message is constructed using the provided `message`, and if `details` are provided, it appends the details to the message.
 * This makes it easier to debug and trace errors related to binary parsing operations.
 *
 * - **Input**:
 *   - `message`: A string representing the error message that describes the error encountered during parsing.
 *   - `details`: (Optional) A string containing additional details about the error, which will be appended to the `message` if provided.
 *
 * - **Output**:
 *   - The instance of `BinaryParsingError` includes a `message` field, which is the error message (with optional details),
 *     a `name` field indicating the type of error, and a `stack` field providing the stack trace for debugging.
 *
 * ## Example:
 * ```ts
 * try {
 *   // Simulate a binary parsing error
 *   throw new BinaryParsingError('Error parsing binary data', 'Invalid byte sequence encountered');
 * } catch (error) {
 *   console.error(error.message); // Output: Error parsing binary data - Invalid byte sequence encountered
 * }
 * ```
 *
 * ## Error Handling:
 * - Inherits from the `PlistError` class, which handles general parsing errors.
 * - If `details` is provided, it is appended to the `message`, providing extra context for the error.
 *
 * @param message - The error message describing the binary parsing error.
 * @param details - (Optional) Additional details about the error that will be appended to the message.
 */

export class BinaryParsingError extends PlistError {
    constructor(message: string, public details?: string) {
        super(message);

        // Maintain proper stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, BinaryParsingError);
        }

        // Assign a generic name for base errors
        this.name = 'BinaryParsingError';
        if (details) {
            this.message += ` - ${details}`;
        }
    }
}
