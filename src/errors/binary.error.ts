/**
 * Imports
 */

import { PlistError } from './base.error';

/**
 * Custom error class for binary data parsing errors
 *
 * @param message - The error message describing the binary parsing issue
 * @param details - Optional additional information about the error
 *
 * @remarks
 * This class extends the PlistError class to provide specific error handling
 * for binary parsing operations. When thrown, it includes a custom error name
 * ('BinaryParsingError') and captures the stack trace for improved debugging.
 *
 * If details are provided, they are appended to the main error message for
 * more comprehensive error reporting. This is particularly useful for complex
 * binary parsing operations where additional context can help with debugging.
 *
 * @example
 * ```ts
 * try {
 *   // Attempting to parse binary data
 *   if (buffer.length < requiredLength) {
 *     throw new BinaryParsingError(
 *       'Insufficient buffer length',
 *       `Expected at least ${requiredLength} bytes, got ${buffer.length}`
 *     );
 *   }
 * } catch (error) {
 *   console.error(error.message);
 *   // Output: "Insufficient buffer length - Expected at least 8 bytes, got 4"
 * }
 * ```
 *
 * @since 1.0.1
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
