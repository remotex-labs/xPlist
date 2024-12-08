/**
 * The `PlistError` class extends the built-in `Error` class to provide a custom error type specific to handling
 * plist (Property List) related errors. It customizes the error by setting a specific error name and capturing
 * the stack trace when the error is thrown.
 *
 * This error class is useful for scenarios where plist-specific issues need to be identified and handled distinctly
 * from other general errors.
 *
 * - **Input**:
 *   - `message`: A string representing the error message that provides details about the specific error encountered.
 *
 * - **Output**:
 *   - An instance of `PlistError`, which contains the message, name (`xPlistError`), and a stack trace.
 *
 * ## Example:
 * ```ts
 * try {
 *   throw new PlistError('An error occurred while processing the plist file.');
 * } catch (error) {
 *   console.log(error.name); // 'xPlistError'
 *   console.log(error.message); // 'An error occurred while processing the plist file.'
 *   console.log(error.stack); // Stack trace of the error
 * }
 * ```
 *
 * ## Error Handling:
 * - This class only customizes the error message and stack trace handling. It doesn’t perform additional validation
 *   on the input message. If the `message` is not provided, the `Error` constructor's default behavior will apply.
 *
 * @param message - The error message describing the plist-related error.
 * @returns A `PlistError` instance with a customized error name and stack trace.
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
