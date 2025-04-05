/**
 * Custom error class for Property List (plist) related errors
 *
 * @param message - The error message describing the plist-related issue
 *
 * @remarks
 * This class extends the standard Error class to provide specific error handling
 * for plist-related operations. When thrown, it includes a custom error name
 * ('xPlistError') and captures the stack trace for improved debugging.
 *
 * The class is designed to help distinguish plist-specific errors from
 * other types of errors in the application.
 *
 * @example
 * ```ts
 * try {
 *   // Some plist operation that might fail
 *   if (!isValidPlist(data)) {
 *     throw new PlistError('Invalid plist format: missing dict element');
 *   }
 * } catch (error) {
 *   if (error instanceof PlistError) {
 *     console.log('Plist specific error:', error.message);
 *   } else {
 *     console.log('Other error:', error);
 *   }
 * }
 * ```
 *
 * @since 1.0.1
 */

export class PlistError extends Error {
    constructor(message: string) {
        super(message);

        // Maintain proper stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, PlistError);
        }

        // Assign the name of the error
        this.name = 'xPlistError';
    }
}
