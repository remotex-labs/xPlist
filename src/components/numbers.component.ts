/**
 * Import will remove at compile time
 */

import type { IntegerByteLengthType } from '@components/interfaces/numbers-component.interface';

/**
 * Imports
 */

import { BinaryParsingError } from '@errors/binary.error';

/**
 * Determines the number of bytes required to represent an integer value
 *
 * @param number - The integer whose byte length is to be determined
 * @returns The number of bytes required to represent the integer (1, 2, 4, 8, or 16)
 * @throws TypeError - If the value is not an integer
 * @throws RangeError - If the provided value exceeds the 16-byte integer range
 *
 * @remarks
 * This function calculates the minimum byte length needed to store an integer value in memory.
 * It supports both number and bigint types and returns their byte size based on the value's magnitude.
 *
 * Byte size ranges:
 * - 1 byte: 0 to 255
 * - 2 bytes: 0 to 65535
 * - 4 bytes: 0 to 4294967295
 * - 8 bytes: 0 to 9223372036854775807 (also used for negative values)
 * - 16 bytes: Larger values up to 18446744073709551615
 *
 * @example
 * ```ts
 * integerByteLength(42); // Returns 1
 * integerByteLength(0xFFFF); // Returns 2
 * integerByteLength(1234567890n); // Returns 4
 * integerByteLength(0x7FFFFFFFFFFFFFFFn); // Returns 8
 * integerByteLength(0xFFFFFFFFFFFFFFFFn); // Returns 16
 * ```
 *
 * @see IntegerByteLengthType
 *
 * @since 1.0.1
 */

export function integerByteLength(number: number | bigint): IntegerByteLengthType {
    if (!Number.isInteger(number) && typeof number !== 'bigint')
        throw new TypeError('Value must be an integer.');

    number = BigInt(number);
    if (number < 0n) return 8;
    if (number <= 0xFFn) return 1;
    if (number <= 0xFFFFn) return 2;
    if (number <= 0xFFFFFFFF) return 4;
    if (number <= 0X7FFFFFFFFFFFFFFFn) return 8;
    if (number <= 0xFFFFFFFFFFFFFFFFn) return 16;

    throw new RangeError('BigInt exceeds the 8-byte integer range.');
}

/**
 * Validates that a number is within JavaScript's safe integer range
 *
 * @param number - The number or bigint value to validate
 * @param name - The name of the variable being validated (used in error messages)
 * @throws BinaryParsingError - If the number exceeds JavaScript's MAX_SAFE_INTEGER limit
 *
 * @remarks
 * This utility function ensures that numeric values do not exceed JavaScript's
 * MAX_SAFE_INTEGER limit (9,007,199,254,740,991). This is particularly important
 * when working with binary data or when precise integer values are required.
 *
 * The function accepts both number and bigint types, converting numbers to
 * BigInt for comparison.
 *
 * @example
 * ```ts
 * // Verify that an offset value is safe
 * validateSafeInteger(offset, 'offset');
 *
 * // Will throw BinaryParsingError if the value is too large
 * validateSafeInteger(9007199254740992n, 'fileSize');
 * ```
 *
 * @since 1.0.1
 */

export function validateSafeInteger(number: number | bigint, name: string): void {
    if (BigInt(number) > BigInt(Number.MAX_SAFE_INTEGER))
        throw new BinaryParsingError(`${ name } exceeds the maximum safe integer value. Offset must be less than or equal to ${ Number.MAX_SAFE_INTEGER }`);
}

/**
 * Writes an integer value to a Buffer using the specified byte size
 *
 * @param buffer - The Buffer to which the integer will be written
 * @param value - The integer or bigint value to write
 * @param size - The size of the integer in bytes (1, 2, 4, 8, or 16)
 * @param offset - The offset at which to start writing the integer (defaults to 0)
 * @returns The Buffer with the written integer
 *
 * @throws RangeError - If the buffer is not large enough for the operation
 * @throws BinaryParsingError - If the offset exceeds Number.MAX_SAFE_INTEGER or the size is unsupported
 *
 * @remarks
 * This function writes integer values to a Buffer with support for different byte sizes.
 * All integers are written in Big Endian byte order. The function handles both number
 * and bigint types, converting as necessary depending on the specified size.
 *
 * Supported sizes:
 * - 1 byte: Uses writeUInt8
 * - 2 bytes: Uses writeUInt16BE
 * - 4 bytes: Uses writeUInt32BE
 * - 8 bytes: Uses writeBigInt64BE
 * - 16 bytes: Uses writeBigUInt64BE with special handling
 *
 * @example
 * ```ts
 * // Write a 32-bit integer
 * const buffer = Buffer.alloc(4);
 * writeInteger(buffer, 66, 4);
 * // buffer contains: <Buffer 00 00 00 42>
 *
 * // Write a 64-bit bigint
 * const bigIntBuffer = Buffer.alloc(8);
 * writeInteger(bigIntBuffer, 66n, 8);
 * // bigIntBuffer contains: <Buffer 00 00 00 00 00 00 00 42>
 * ```
 *
 * @since 1.0.1
 */

export function writeInteger(buffer: Buffer, value: number | bigint, size: IntegerByteLengthType, offset = 0): Buffer {
    validateSafeInteger(offset, 'Offset');

    switch (size) {
        case 1:
            buffer.writeUInt8(Number(value), offset);
            break;
        case 2:
            buffer.writeUInt16BE(Number(value), offset);
            break;
        case 4:
            buffer.writeUInt32BE(Number(value), offset);
            break;
        case 8:
            buffer.writeBigInt64BE(BigInt(value), offset);
            break;
        case 16:
            buffer.writeBigUInt64BE(BigInt(value), offset + 8);
            break;
        default:
            throw new BinaryParsingError('Unsupported size. Supported sizes are 1, 2, 4, 8, 16 bytes.');
    }

    return buffer;
}

/**
 * Reads an integer value from a Buffer with the specified byte size
 *
 * @param buffer - The Buffer from which to read the integer
 * @param size - The size of the integer in bytes (1, 2, 4, 8, or 16)
 * @param offset - The offset at which to start reading the integer (defaults to 0)
 * @returns The integer value (number for 1-4 bytes, bigint for 8-16 bytes)
 * @throws BinaryParsingError - If the offset exceeds Number.MAX_SAFE_INTEGER or the size is unsupported
 * @throws RangeError - If the buffer is not large enough for the operation
 *
 * @remarks
 * This function reads integer values from a Buffer with support for different byte sizes.
 * All integers are read in Big Endian byte order. The function returns either a number
 * or bigint type depending on the size being read.
 *
 * Supported sizes:
 * - 1 byte: Uses readUInt8 (returns number)
 * - 2 bytes: Uses readUInt16BE (returns number)
 * - 4 bytes: Uses readUInt32BE (returns number)
 * - 8 bytes: Uses readBigInt64BE (returns bigint)
 * - 16 bytes: Uses readBigUInt64BE with special handling (returns bigint)
 *
 * @example
 * ```ts
 * // Read a 32-bit integer
 * const buffer = Buffer.from([0x00, 0x00, 0x00, 0x42]);
 * const intVal = readInteger(buffer, 4);
 * console.log(intVal); // 66
 *
 * // Read a 64-bit bigint
 * const bigIntBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x42]);
 * const bigIntVal = readInteger(bigIntBuffer, 8);
 * console.log(bigIntVal); // 66n
 * ```
 *
 * @since 1.0.1
 */

export function readInteger(buffer: Buffer, size: IntegerByteLengthType, offset = 0): number | bigint {
    validateSafeInteger(offset, 'Offset');

    switch (size) {
        case 1:
            return buffer.readUInt8(offset);
        case 2:
            return buffer.readUInt16BE(offset);
        case 4:
            return buffer.readUInt32BE(offset);
        case 8:
            return buffer.readBigInt64BE(offset);
        case 16:
            return buffer.readBigUInt64BE(offset + 8);
        default:
            throw new BinaryParsingError('Unsupported size. Supported sizes are 1, 2, 4, 8 or 16 bytes.');
    }
}
