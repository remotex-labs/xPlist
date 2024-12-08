/**
 * Imports
 */

import { PlistError } from './base.error';

/**
 * Tests
 */

describe('PlistError', () => {
    test('should create an instance of PlistError with the correct message and name', () => {
        const errorMessage = 'This is a custom error';
        const error = new PlistError(errorMessage);

        // Check if the error is an instance of PlistError
        expect(error).toBeInstanceOf(PlistError);

        // Check if the error message is correctly set
        expect(error.message).toBe(errorMessage);

        // Check if the error name is correctly set
        expect(error.name).toBe('xPlistError');
    });

    test('should capture the stack trace', () => {
        const errorMessage = 'Stack trace test';
        const error = new PlistError(errorMessage);

        // Check if the stack trace is defined
        expect(error.stack).toBeDefined();

        // Optionally, you can check if the stack contains certain strings,
        // like the error name or the constructor.
        expect(error.stack).toContain('PlistError');
    });
});
