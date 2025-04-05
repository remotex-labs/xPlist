/**
 * Import will remove at compile time
 */

import type { IntegerByteLengthType } from '@components/interfaces/numbers-component.interface';

/**
 * Import
 */
import { BinaryParsingError } from '@errors/binary.error';

/**
 * The `integerByteLength` function determines the number of bytes required to represent an integer (either `number` or `bigint`)
 * in memory. It returns the appropriate byte length based on the size of the number or BigInt provided.
 *
 * - **Input**:
 *   - `number`: A value of type `number` or `bigint` representing the integer whose byte length is to be determined.
 *
 * - **Output**:
 *   - A value of type `IntegerByteLengthType`, indicating the number of bytes required to represent the given integer.
 *
 * ## Example:
 * ```ts
 * console.log(integerByteLength(42)); // 1
 * console.log(integerByteLength(0xFFFF)); // 2
 * console.log(integerByteLength(1234567890n)); // 4
 * console.log(integerByteLength(0x7FFFFFFFFFFFFFFFn)); // 8
 * console.log(integerByteLength(0xFFFFFFFFFFFFFFFFn)); // 16
 * ```
 *
 * ## Error Handling:
 * - Throws a `TypeError` if the provided value is not an integer (neither a `number` nor a `bigint`):
 *   ```ts
 *   throw new TypeError('Value must be an integer.');
 *   ```
 * - Throws a `RangeError` if the provided BigInt exceeds the maximum allowed value for an 8-byte integer:
 *   ```ts
 *   throw new RangeError('BigInt exceeds the 8-byte integer range.');
 *   ```
 *
 * ## Notes:
 * - The function treats all numbers as `BigInt` by converting the provided value to `BigInt`, ensuring compatibility
 *   for both `number` and `bigint` inputs.
 * - The function supports integers from 1 byte to 16 bytes, covering the ranges:
 *   - 1 byte: 0 to 255
 *   - 2 bytes: 0 to 65535
 *   - 4 bytes: 0 to 4294967295
 *   - 8 bytes: 0 to 9223372036854775807
 *   - 16 bytes: 0 to 1152921504606846975
 *
 * @param number - The integer whose byte length is to be determined.
 * @returns The number of bytes required to represent the integer.
 * @throws {TypeError} Throws an error if the value is not an integer.
 * @throws {RangeError} Throws an error if the provided `BigInt` exceeds the 8-byte integer range.
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

export function validateSafeInteger(number: number | bigint, name: string): void {
    if (BigInt(number) > BigInt(Number.MAX_SAFE_INTEGER))
        throw new BinaryParsingError(`${ name } exceeds the maximum safe integer value. Offset must be less than or equal to ${ Number.MAX_SAFE_INTEGER }`);
}

/**
 * The `writeInteger` function writes an integer or bigint to a `Buffer` at a specified offset, with a given size.
 * It supports writing integers of various sizes (1, 2, 4, 8, or 16 bytes)
 * and ensures that the offset is within the safe range.
 * The function handles both `number` and `bigint` types for the value.
 *
 * - **Input**:
 *   - `buffer`: The `Buffer` to which the integer will be written.
 *   - `value`: The integer or bigint to be written to the `Buffer`.
 *   - `size`: The size of the integer in bytes. Must be one of 1, 2, 4, 8, or 16 bytes.
 *   - `offset` (optional): The offset at which to start writing the integer. Defaults to 0.
 *
 * - **Output**:
 *   - The `Buffer` with the written integer at the specified offset and size.
 *
 * ## Example:
 * ```ts
 * const buffer = Buffer.alloc(4);
 * writeInteger(buffer, 66, 4, 0); // Writes a 32-bit integer to the buffer
 * console.log(buffer); // <Buffer 00 00 00 42>
 *
 * const bigIntBuffer = Buffer.alloc(8);
 * writeInteger(bigIntBuffer, 66n, 8, 0); // Writes a 64-bit bigint to the buffer
 * console.log(bigIntBuffer); // <Buffer 00 00 00 00 00 00 00 42>
 * ```
 *
 * ## Error Handling:
 * - Throws a `BinaryParsingError` if the `offset` exceeds `Number.MAX_SAFE_INTEGER`.
 * - Throws a `BinaryParsingError` if the `size` is not one of the supported values (1, 2, 4, 8, or 16 bytes).
 * - Throws a `RangeError` if the `buffer` is not large enough to accommodate the requested size at the given offset.
 *
 * ## Notes:
 * - The function supports writing integers of different sizes using the corresponding `writeUInt8`, `writeUInt16BE`,
 *   `writeUInt32BE`, `writeBigInt64BE`, and `writeBigUInt64BE` methods from the `Buffer` API.
 * - The buffer is written in Big Endian byte order, which is typical for encoding in many data formats.
 * - The function ensures that the provided offset is within the safe range for integer values to prevent potential issues.
 *
 * @param buffer - The `Buffer` to which the integer will be written.
 * @param value - The integer or bigint to be written.
 * @param size - The size of the integer in bytes (1, 2, 4, 8, or 16).
 * @param offset - The offset at which to start writing the integer. Defaults to 0.
 * @returns The `Buffer` with the written integer.
 * @throws {BinaryParsingError} Throws an error if the offset exceeds the maximum safe integer value or the size is unsupported.
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
 * The `readInteger` function reads an integer or bigint from a `Buffer` at a specified offset and with a given size.
 * The function handles reading different sizes of integers (1, 2, 4, 8, or 16 bytes) and returns the corresponding integer
 * value based on the specified size. It also checks that the offset does not exceed the maximum safe integer value.
 *
 * - **Input**:
 *   - `buffer`: The `Buffer` from which the integer value will be read.
 *   - `size`: The size of the integer in bytes. Must be one of 1, 2, 4, 8, or 16 bytes.
 *   - `offset` (optional): The offset at which to start reading the integer. Defaults to 0.
 *
 * - **Output**:
 *   - The integer or bigint value read from the `Buffer`.
 *
 * ## Example:
 * ```ts
 * const buffer = Buffer.from([0x00, 0x00, 0x00, 0x42]);
 * const intVal = readInteger(buffer, 4); // Reads a 32-bit integer from the buffer
 * console.log(intVal); // 66
 *
 * const bigIntBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x42]);
 * const bigIntVal = readInteger(bigIntBuffer, 8); // Reads a 64-bit bigint from the buffer
 * console.log(bigIntVal); // 66n
 * ```
 *
 * ## Error Handling:
 * - Throws a `BinaryParsingError` if the `offset` exceeds `Number.MAX_SAFE_INTEGER`.
 * - Throws a `BinaryParsingError` if the `size` is not one of the supported values (1, 2, 4, 8, or 16 bytes).
 * - Throws a `RangeError` if the `buffer` is not large enough to accommodate the requested size at the given offset.
 *
 * ## Notes:
 * - The function supports reading integers of different sizes using the corresponding `readUInt8`, `readUInt16BE`,
 *   `readUInt32BE`, `readBigInt64BE`, and `readBigUInt64BE` methods from the `Buffer` API.
 * - The buffer is read in Big Endian byte order, which is typical for encoding in many data formats.
 * - The function ensures that the provided offset is within the safe range for integer values to prevent potential issues.
 *
 * @param buffer - The `Buffer` containing the integer to be read.
 * @param size - The size of the integer in bytes (1, 2, 4, 8, or 16).
 * @param offset - The offset at which to start reading the integer. Defaults to 0.
 * @returns The integer or bigint value read from the `Buffer`.
 * @throws {BinaryParsingError} Throws an error if the offset exceeds the maximum safe integer value or the size is unsupported.
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
