/**
 * Import will remove at compile time
 */

import type { IntegerByteLengthType } from '@components/interfaces/numbers-component.interface';

/**
 * Imports
 */

import { integerByteLength, readInteger, writeInteger } from '@components/numbers.component';

/**
 * Tests
 */

describe('integerByteLength', () => {
    test.each([
        [ 0, 1 ],                                       // 0 is a 1-byte integer
        [ 0xFF, 1 ],                                    // 255 is a 1-byte integer
        [ 0x100, 2 ],                                   // 256 is a 2-byte integer
        [ 0xFFFF, 2 ],                                  // 65535 is a 2-byte integer
        [ 0x10000, 4 ],                                 // 65536 is a 4-byte integer
        [ 0xFFFFFFFF, 4 ],                              // 4294967295 is a 4-byte integer
        [ 0x100000000, 8 ],                             // 4294967296 is an 8-byte integer
        [ 0x7FFFFFFFFFFFFFFFn, 8 ],                     // Max 8-byte integer
        [ 0xFFFFFFFFFFFFFFFFn, 16 ],                    // This is 16-byte integer
        [ -0x8000000000000000n, 8 ],                    // min 8-byte integer
        [ Number.MAX_SAFE_INTEGER, 8 ]                  // Max safe number for JavaScript (8-byte)
    ])('should return correct byte length for %p', (input, expected) => {
        expect(integerByteLength(input)).toBe(expected);
    });

    test('should throw TypeError for non-integer values', () => {
        expect(() => integerByteLength(3.14)).toThrow(TypeError);
        expect(() => integerByteLength('string' as any)).toThrow(TypeError);
    });

    test('should throw RangeError for BigInt exceeding 8-byte range', () => {
        expect(() => integerByteLength(0xFFFFFFFFFFFFFFFFFFn)).toThrow(RangeError);
    });
});

describe('writeInteger', () => {
    let buffer: Buffer;

    beforeEach(() => {
        buffer = Buffer.alloc(20); // Create a buffer with enough space for all tests
    });

    test.each([
        [ 0xFF, 1, 0, (buf: Buffer) => buf.readUInt8(0) ], // 1-byte integer
        [ 0xFFFF, 2, 0, (buf: Buffer) => buf.readUInt16BE(0) ], // 2-byte integer
        [ 0xFFFFFFFF, 4, 0, (buf: Buffer) => buf.readUInt32BE(0) ], // 4-byte integer
        [ 0x7FFFFFFFFFFFFFFFn, 8, 0, (buf: Buffer) => buf.readBigInt64BE(0) ], // 8-byte BigInt
        [ -0x8000000000000000n, 8, 0, (buf: Buffer) => buf.readBigInt64BE(0) ], // 8-byte BigInt
        [ 0xFFFFFFFFFFFFFFFFn, 16, 0, (buf: Buffer) => {
            // 16-byte BigInt: check lower and upper 8 bytes
            return [
                buf.readBigUInt64BE(0),
                buf.readBigUInt64BE(8)
            ];
        } ]
    ])(
        'should write %p with size %i bytes and verify with expected buffer',
        (value, size, offset, readFn) => {
            writeInteger(buffer, value, <IntegerByteLengthType> size, offset);
            const result = readFn(buffer);
            if (Array.isArray(result)) {
                expect(result[0]).toBe(0n); // lower 8 bytes
                expect(result[1]).toBe(value); // upper 8 bytes
            } else {
                expect(result).toBe(value);
            }
        }
    );

    test('should throw error for unsupported size', () => {
        expect(() => writeInteger(buffer, 123, <IntegerByteLengthType> 3)).toThrow('Unsupported size. Supported sizes are 1, 2, 4, 8, 16 bytes.');
    });

    test('should throw BinaryParsingError if offset exceeds Number.MAX_SAFE_INTEGER', () => {
        expect(() => writeInteger(buffer, 2, 2, 9007199254740995))
            .toThrow('Offset exceeds the maximum safe integer value. Offset must be less than or equal to 9007199254740991');
    });
});

describe('readInteger', () => {
    let buffer: Buffer;

    beforeEach(() => {
        buffer = Buffer.alloc(20); // Create a buffer with enough space for all tests
    });

    test.each([
        [ 0xFF, 1, 0, (buf: Buffer) => buf.readUInt8(0) ], // 1-byte unsigned integer (0-255)
        [ 0xFFFF, 2, 0, (buf: Buffer) => buf.readUInt16BE(0) ], // 2-byte unsigned integer (0-65535)
        [ 0xFFFFFFFF, 4, 0, (buf: Buffer) => buf.readUInt32BE(0) ], // 4-byte unsigned integer (0-4294967295)
        [ 0x7FFFFFFFFFFFFFFFn, 8, 0, (buf: Buffer) => buf.readBigInt64BE(0) ], // 8-byte signed BigInt
        [ -0x8000000000000000n, 8, 0, (buf: Buffer) => buf.readBigInt64BE(0) ],
        [ 0xFFFFFFFFFFFFFFFFn, 16, 0, (buf: Buffer) => buf.readBigUInt64BE(8) ] // 8-byte signed BigInt
    ])(
        'should correctly read %p from %i bytes at offset %i',
        (value, size, offset, readFn) => {
            // Write the value into the buffer
            if (size === 1) {
                buffer.writeUInt8(Number(value), offset);
            } else if (size === 2) {
                buffer.writeUInt16BE(Number(value), offset);
            } else if (size === 4) {
                buffer.writeUInt32BE(Number(value), offset);
            } else if (size === 8) {
                buffer.writeBigInt64BE(BigInt(value), offset);
            } else if (size === 16) {
                buffer.writeBigUInt64BE(BigInt(value), offset + 8);
            }

            // Read the value back and compare it
            const result = readFn(buffer);
            expect(readInteger(buffer, <IntegerByteLengthType> size)).toBe(result);
        }
    );

    test('should throw error for unsupported size', () => {
        expect(() => readInteger(buffer, <IntegerByteLengthType> 3)).toThrow('Unsupported size. Supported sizes are 1, 2, 4, 8 or 16 bytes.');
    });

    test('should throw BinaryParsingError if offset exceeds Number.MAX_SAFE_INTEGER', () => {
        expect(() => readInteger(buffer, 2, 9007199254740995))
            .toThrow('Offset exceeds the maximum safe integer value. Offset must be less than or equal to 9007199254740991');
    });
});
