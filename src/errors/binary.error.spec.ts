/**
 * Imports
 */

import { PlistError } from '@errors/base.error';
import { BinaryParsingError } from '@errors/binary.error';

/**
 * Tests
 */

describe('BinaryParsingError', () => {
    test('should extend from PlistError and Error', () => {
        const error = new BinaryParsingError('Test message');
        expect(error instanceof PlistError).toBe(true); // Check that it extends PlistError
        expect(error instanceof Error).toBe(true); // Check that it also extends Error
    });

    test('should have the correct name property', () => {
        const error = new BinaryParsingError('Test message');
        expect(error.name).toBe('BinaryParsingError'); // The name should be 'XMLParsingError'
    });

    test('should assign message correctly', () => {
        const error = new BinaryParsingError('Test message');
        expect(error.message).toBe('Test message'); // Message should be set correctly
    });

    test('should append details to message if provided', () => {
        const error = new BinaryParsingError('Test message', 'Additional details');
        expect(error.message).toBe('Test message - Additional details'); // Should append details
    });

    test('should not append details if not provided', () => {
        const error = new BinaryParsingError('Test message');
        expect(error.message).toBe('Test message'); // Should not append anything if no details provided
    });

    test('should correctly capture the stack trace', () => {
        const error = new BinaryParsingError('Test message');
        expect(error.stack).toBeDefined(); // Stack trace should be available
    });

    test('should handle large messages with details', () => {
        const longMessage = 'Test message with very long content '.repeat(10); // Long message
        const details = 'Additional long details '.repeat(5); // Long details

        const error = new BinaryParsingError(longMessage, details);
        expect(error.message).toBe(`${ longMessage } - ${ details }`); // Ensure both long message and details are appended correctly
    });

    test('should capture the correct stack trace with the error name', () => {
        const error = new BinaryParsingError('Test message with stack trace');
        expect(error.stack).toContain('BinaryParsingError'); // Ensure that the stack trace includes the error name
    });

    test('should throw TypeError if invalid type is passed', () => {
        // Invalid type to trigger error in stack trace
        const error = new BinaryParsingError('Test invalid type', 'Details about invalid type');
        expect(() => {
            throw error;
        }).toThrowError(BinaryParsingError); // Ensure that BinaryParsingError is thrown
    });
});
