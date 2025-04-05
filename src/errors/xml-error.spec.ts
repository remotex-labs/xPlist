/**
 * Imports
 */

import { PlistError } from './base.error';
import { XMLParsingError } from './xml.error';

/**
 * Tests
 */

describe('XMLParsingError', () => {
    test('should create an instance of XMLParsingError with the correct message, name, and stack trace', () => {
        const errorMessage = 'Error parsing XML';
        const error = new XMLParsingError(errorMessage);

        // Check if the error is an instance of XMLParsingError
        expect(error).toBeInstanceOf(XMLParsingError);

        // Check if the error is also an instance of PlistError
        expect(error).toBeInstanceOf(PlistError);

        // Check if the error message is correctly set
        expect(error.message).toBe(errorMessage);

        // Check if the error name is correctly set
        expect(error.name).toBe('XMLParsingError');

        // Check if the stack trace is defined
        expect(error.stack).toBeDefined();
    });

    test('should inherit the correct name from PlistError', () => {
        const error = new XMLParsingError('Test');
        expect(error.name).toBe('XMLParsingError');
    });

    test('should inherit the stack trace from PlistError when captureStackTrace is used', () => {
        const errorMessage = 'Error parsing XML';
        const error = new XMLParsingError(errorMessage);

        // The stack trace should be defined, which can be tested by checking that it includes 'XMLParsingError'
        expect(error.stack).toContain('XMLParsingError');
    });

    test('should correctly call the constructor of the parent class (PlistError)', () => {
        const errorMessage = 'Parent class constructor called';
        const error = new XMLParsingError(errorMessage);

        // Ensure the message passed to XMLParsingError is correctly forwarded to the PlistError constructor
        expect(error.message).toBe(errorMessage);
    });

    test('should append details to the message when provided', () => {
        const errorMessage = 'Error parsing XML';
        const details = 'Root tag missing';
        const error = new XMLParsingError(errorMessage, details);

        // Check if the message contains both the error message and the details
        expect(error.message).toBe(`${errorMessage} - ${details}`);
    });

    test('should handle missing details gracefully (details should not affect the message if not provided)', () => {
        const errorMessage = 'Error parsing XML';
        const error = new XMLParsingError(errorMessage);

        // Ensure the message is still set correctly without any details
        expect(error.message).toBe(errorMessage);
    });
});
