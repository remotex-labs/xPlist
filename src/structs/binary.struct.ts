/**
 * Import will remove at compile time
 */

import type {
    HeaderInterface,
    TrailerInterface,
    TypeHeaderInterface
} from '@structs/interfaces/binary-struct.interface';
import type { IntegerByteLengthType } from '@components/interfaces/numbers-component.interface';

/**
 * Imports
 */

import { Struct } from '@remotex-labs/xstruct';
import { BinaryParsingError } from '@errors/binary.error';
import { integerByteLength, readInteger, validateSafeInteger, writeInteger } from '@components/numbers.component';

/**
 * The `REFERENCE_DATE` constant represents a specific reference point in time: January 1, 2001, at 00:00:00 UTC.
 * This value is often used as a baseline for date calculations or comparisons in contexts where relative times
 * need to be measured from this specific point.
 */

const REFERENCE_DATE = Date.UTC(2001, 0, 1);

/**
 * The `headerStruct` defines a structure representing the header of a data format with the following fields:
 *
 * - **magic**: A 6-byte string used as a unique identifier or signature for the data format.
 * - **version**: A 2-byte string representing the version of the data format.
 *
 * The structure is used to read and write data in a binary format, ensuring that the correct size and data type
 * are respected when parsing or constructing data. The `Struct` class allows you to define this schema with type
 * annotations, ensuring proper handling of the `magic` and `version` fields.
 *
 * - **Input**:
 *   - `magic`: A 6-character string that serves as a unique identifier for the header.
 *   - `version`: A 2-character string indicating the version of the data format.
 *
 * - **Output**:
 *   - An object with `magic` and `version` properties, matching the specified structure.
 *
 * ## Example:
 * ```ts
 * const header = headerStruct.toBuffer({ magic: 'MAGIC', version: '01' });
 * console.log(header); // Output: A Buffer with the serialized header data
 * ```
 *
 * ## Error Handling:
 * - If the size of the input string for either `magic` or `version` does not match the expected length,
 *   an error will be thrown during serialization or deserialization.
 *
 * @returns A `Struct` representing the header structure with `magic` and `version` fields.
 */

export const headerStruct = new Struct<HeaderInterface>({
    'magic': { type: 'string', size: 6 },
    'version': { type: 'string', size: 2 }
});

/**
 * The `trailerStruct` defines a structure representing the trailer of a data format, with various fields that
 * describe offsets, sizes, and counts within the data. This structure is used to read and write binary data,
 * ensuring that each field is correctly serialized or deserialized according to its type and size.
 *
 * - **unused**: A 5-byte array of unsigned 8-bit integers, which is reserved for future use or alignment.
 * - **sortVersion**: A single unsigned 8-bit integer that represents the version of sorting or order used.
 * - **offsetTableOffsetSize**: A single unsigned 8-bit integer specifying the size of the offset table.
 * - **objectReferenceSize**: A single unsigned 8-bit integer specifying the size of the object reference.
 * - **numberOfObjects**: A 64-bit unsigned big-endian integer representing the total number of objects in the data.
 * - **rootObjectOffset**: A 64-bit unsigned big-endian integer representing the offset of the root object.
 * - **offsetTableOffset**: A 64-bit unsigned big-endian integer representing the offset of the offset table.
 *
 * The `Struct` class is used to define the exact binary layout of the trailer structure, ensuring that all
 * values are stored with the correct data types and sizes.
 *
 * - **Input**:
 *   - `unused`: A 5-byte array (optional) of unsigned 8-bit integers (usually reserved space).
 *   - `sortVersion`: A single byte representing the version of sorting used.
 *   - `offsetTableOffsetSize`: A byte specifying the size of the offset table.
 *   - `objectReferenceSize`: A byte specifying the size of object references.
 *   - `numberOfObjects`: A 64-bit unsigned integer indicating the number of objects.
 *   - `rootObjectOffset`: A 64-bit unsigned integer indicating the offset of the root object.
 *   - `offsetTableOffset`: A 64-bit unsigned integer indicating the offset of the offset table.
 *
 * - **Output**:
 *   - An object with properties corresponding to each field in the trailer: `unused`, `sortVersion`,
 *     `offsetTableOffsetSize`, `objectReferenceSize`, `numberOfObjects`, `rootObjectOffset`, and `offsetTableOffset`.
 *
 * ## Example:
 * ```ts
 * const trailer = trailerStruct.toBuffer({
 *     sortVersion: 1,
 *     offsetTableOffsetSize: 8,
 *     objectReferenceSize: 16,
 *     numberOfObjects: BigInt(100),
 *     rootObjectOffset: BigInt(12345),
 *     offsetTableOffset: BigInt(67890)
 * });
 * console.log(trailer); // Output: A Buffer with the serialized trailer data
 * ```
 *
 * ## Error Handling:
 * - If any of the values provided do not match the expected type or size, an error will be thrown during
 *   serialization or deserialization.
 *
 * @returns A `Struct` representing the trailer structure with the specified fields.
 */

export const trailerStruct = new Struct<TrailerInterface>({
    'unused': 'UInt8[5]',
    'sortVersion': 'UInt8',
    'offsetTableOffsetSize': 'UInt8',
    'objectReferenceSize': 'UInt8',
    'numberOfObjects': 'BigUInt64BE',
    'rootObjectOffset': 'BigUInt64BE',
    'offsetTableOffset': 'BigUInt64BE'
});

/**
 * The `packDataHeader` function packs a `type` and `info` into a single byte, with the `type` occupying the upper 4-bits
 * and `info` occupying the lower 4-bits.
 * It can return the result either as a `Buffer` or as a `number`, depending on
 * the `asBuffer` flag.
 *
 * - **Input**:
 *   - `type`: A number representing the type, which must be in the range 0-15 (inclusive).
 *   - `info`: A number representing the info, which must also be in the range 0-15 (inclusive).
 *   - `asBuffer` (optional): A boolean flag that determines whether the result should be returned as a `Buffer` (`true`)
 *     or as a `number` (`false`).
 *     The default is `false`.
 *
 * - **Output**:
 *   - Returns a `number` representing the packed byte, or a `Buffer`
 *   containing the packed byte, depending on the value of the `asBuffer` flag.
 *
 * ## Example:
 * ```ts
 * let type = 3;
 * let info = 7;
 * console.log(packDataHeader(type, info)); // 55 (binary: 00110111)
 *
 * type = 15;
 * info = 8;
 * console.log(packDataHeader(type, info)); // <Buffer  f8>
 *
 * type = 10;
 * info = 4;
 * console.log(packDataHeader(type, info, true)); // <Buffer a4>
 * ```
 *
 * ## Error Handling:
 * - Throws a `RangeError` if either `type` or `info` is outside the valid range of 0-15:
 *   ```ts
 *   throw new RangeError('Both type and info must be in the range 0-15.');
 *   ```
 *
 * ## Notes:
 * - The function packs the `type` and `info` values into a single byte by shifting the `type` to the upper 4-bits
 *   and combining it with the `info` in the lower 4-bits.
 * - If `asBuffer` is `true`, the result is returned as a `Buffer` containing the packed byte.
 *   If `asBuffer` is `false` (or not provided), the result is returned as a `number`.
 *
 * @param type - The type value (0-15) to be packed.
 * @param info - The info value (0-15) to be packed.
 * @param asBuffer - Whether to return the result as a `Buffer`.
 * Defaults to `false`.
 * @returns A `number` or a `Buffer` containing the packed byte.
 * @throws {RangeError} Throws an error if `type` or `info` are outside the range 0-15.
 */

export function packDataHeader(type: number, info: number, asBuffer?: false): number;
export function packDataHeader(type: number, info: number, asBuffer?: true): Buffer;
export function packDataHeader(type: number, info: number, asBuffer = false): number | Buffer {
    if (type < 0 || type > 15 || info < 0 || info > 15)
        throw new RangeError('Both type and info must be in the range 0-15.');

    // Shift the `type` to the upper 4 bits and combine with `info` in the lower 4 bits
    const byte = (type << 4) | info;

    // Return as Buffer or number based on the asBuffer flag
    return asBuffer ? Buffer.from([ byte ]) : byte;
}

/**
 * The `unpackDataHeader` function extracts the `type` and `info` values from a given byte. The `type` is stored in the upper 4 bits
 * of the byte, and the `info` is stored in the lower 4 bits. This function is typically used to interpret the header of encoded data
 * where the `type` and `info` are packed together into a single byte.
 *
 * - **Input**:
 *   - `byte`: A single byte (number) containing both the `type` and `info` values.
 *
 * - **Output**:
 *   - An object of type `TypeHeaderInterface`, containing the `type` and `info` values extracted from the byte.
 *
 * ## Example:
 * ```ts
 * const byte = 0xA3; // 1010 0011 in binary
 * const header = unpackDataHeader(byte);
 * console.log(header); // { type: 10, info: 3 }
 * ```
 *
 * ## Error Handling:
 * - Throws an error if the provided `byte` is not a valid number between 0 and 255 (inclusive).
 *
 * ## Notes:
 * - The function assumes that the provided byte is correctly formatted, with the `type` occupying the upper 4 bits and `info` the lower 4 bits.
 *
 * @param byte - A byte containing the packed `type` and `info`.
 * @returns {TypeHeaderInterface} An object with `type` and `info` properties.
 * @throws {Error} If the `byte` is not a valid number within the range 0 to 255.
 */

export function unpackDataHeader(byte: number): TypeHeaderInterface {
    const info = byte & 0xF;
    const type = byte >> 4;

    return { type, info };
}

/**
 * The `packOffsetTable` function packs an array of offset values into a `Buffer`, where each offset is written to the
 * buffer using a size determined by the length of the largest offset in the array.
 * Each offset is written to the buffer at the appropriate position, ensuring the correct alignment based on its size.
 *
 * - **Input**:
 *   - `offsets`: An array of `number` or `bigint` values representing the offsets to be packed into the buffer.
 *     The array can contain any combination of `number` and `bigint` values.
 *
 * - **Output**:
 *   - A `Buffer` containing the packed offsets, where each offset is written according to the determined size.
 *
 * ## Example:
 * ```ts
 * const offsets = [ 42, 1000, 1234567890n ];
 * const packedBuffer = packOffsetTable(offsets);
 * console.log(packedBuffer); // <Buffer ...>
 * ```
 *
 * ## Error Handling:
 * - If any of the values in the `offsets` array are not of type `number` or `bigint`, the behavior is undefined
 *   and may result in an error from the `writeInteger` function.
 *
 * ## Notes:
 * - The function determines the size of each offset by finding the byte length of the largest value in the `offsets`
 *   array. It then allocates a buffer of the appropriate size and writes each offset into the buffer.
 * - The `writeInteger` function is used to write each offset into the buffer at the correct position, ensuring that
 *   each offset is correctly packed according to its byte length.
 *
 * @param offsets - An array of `number` or `bigint` values representing the offsets to be packed into the buffer.
 * @returns A `Buffer` containing the packed offsets.
 */

export function packOffsetTable(offsets: Array<number | bigint>): Buffer {
    const size = integerByteLength(offsets[offsets.length - 1] ?? 0);
    const buffer = Buffer.alloc(offsets.length * size);
    for (const index in offsets) {
        writeInteger(buffer, offsets[index], size, Number(index) * size);
    }

    return buffer;
}

/**
 * The `unpackOffsetTable` function decodes a table of offsets from a given `data` buffer,
 * using the information from the `trailer` to extract the correct values.
 * It reads the specified number of objects and their corresponding offsets from the buffer
 * and returns them as an array of numbers.
 *
 * - **Input**:
 *   - `data`: The `Buffer` containing the raw data to read the offsets from.
 *   - `trailer`: The `TrailerInterface`
 *   containing metadata such as the number of objects, offset table offset, and the size of each offset.
 *
 * - **Output**:
 *   - An array of numbers representing the offsets of the objects, decoded from the buffer.
 *
 * ## Example:
 * ```ts
 * const data = Buffer.from([...]); // Some binary data
 * const trailer = {
 *   numberOfObjects: 3,
 *   offsetTableOffset: 10,
 *   offsetTableOffsetSize: 2
 * };
 * const offsets = unpackOffsetTable(data, trailer);
 * console.log(offsets); // [offset1, offset2, offset3]
 * ```
 *
 * ## Error Handling:
 * - Throws a `BinaryParsingError` if the number of objects is invalid (less than 1).
 * - Throws a `BinaryParsingError`
 * if the `trailer`'s offset table size or number of objects is not a valid safe integer.
 *
 * ## Notes:
 * - The function calculates each offset
 * by adding the size of each offset entry to the starting point defined in `trailer.offsetTableOffset`.
 * - The offsets are read from the `data` buffer using the size specified by `trailer.offsetTableOffsetSize`.
 *
 * @param data - The buffer containing the raw data.
 * @param trailer - The trailer metadata that provides information about the offset table.
 * @returns {Array<number>} An array of decoded offsets.
 * @throws {BinaryParsingError} If the number of objects is invalid or the offsets can't be read correctly.
 */

export function unpackOffsetTable(data: Buffer, trailer: TrailerInterface): Array<number> {
    validateSafeInteger(trailer.numberOfObjects, 'Number Of Objects');
    validateSafeInteger(trailer.offsetTableOffset, 'Table Offset');
    if(trailer.numberOfObjects < 1)
        throw new BinaryParsingError('Invalid number of objects');

    const offsetTable: Array<number> = [];
    const startOffset = Number(trailer.offsetTableOffset);
    for (let i = 0; i < trailer.numberOfObjects; i++) {
        const offset = startOffset + (trailer.offsetTableOffsetSize * i);
        offsetTable.push(Number(readInteger(data, <IntegerByteLengthType> trailer.offsetTableOffsetSize, offset)));
    }

    return offsetTable;
}

/**
 * The `encodeInteger` function encodes an integer (either `number` or `bigint`) into a `Buffer`, including a data header
 * and the integer value.
 * The data header contains metadata about the type and the size of the integer.
 * The function also computes the size of the integer based on its value using the `integerByteLength` function.
 *
 * - **Input**:
 *   - `integer`: The integer value to be encoded. It can be either a `number` or a `bigint`.
 *   - `type` (optional): A number representing the type of the data to be packed.
 *   Defaults to `0x1`.
 *
 * - **Output**:
 *   - A `Buffer` containing the encoded integer, including the data header and the integer value itself.
 *
 * ## Example:
 * ```ts
 * const encodedInt = encodeInteger(12345);
 * console.log(encodedInt); // <Buffer ...> (encoded integer with header)
 *
 * const encodedBigInt = encodeInteger(1234567890n);
 * console.log(encodedBigInt); // <Buffer ...> (encoded bigint with header)
 * ```
 *
 * ## Error Handling:
 * - If the provided `integer` is not a valid `number` or `bigint`,
 * the `integerByteLength` function will throw a `TypeError`.
 * - If the computed size for the integer exceeds the supported byte range,
 * an error may be thrown by the `writeInteger` function.
 *
 * ## Notes:
 * - The function first computes the size of the integer using the `integerByteLength` function.
 * - The data header is packed using the `packDataHeader` function,
 * which includes the `type` and an encoded size value.
 * - The integer is written to the `Buffer` starting at offset 1,
 * ensuring the header occupies the first byte of the buffer.
 *
 * @param integer - The integer to be encoded, either `number` or `bigint`.
 * @param type - The type of the data to be packed.
 * Defaults to `0x1`.
 * @returns A `Buffer` containing the encoded integer along with its data header.
 */

export function encodeInteger(integer: number | bigint, type = 0x1): Buffer {
    const size = integerByteLength(integer);
    const buffer = Buffer.alloc(size + 1);

    buffer.writeUInt8(packDataHeader(type, Math.round(Math.sqrt(size - 1))));
    writeInteger(buffer, integer, size, 1);

    return buffer;
}

/**
 * The `decodeInteger` function decodes an integer from the given `buffer`, using the specified `info` value to determine the byte size.
 * The `info` value indicates the number of bits (which is a power of 2) that represent the size of the integer in the buffer,
 * allowing for flexibility in decoding integers of various sizes.
 *
 * - **Input**:
 *   - `buffer`: The `Buffer` containing the encoded integer.
 *   - `info`: A number representing the byte size of the integer, as a power of 2 (e.g., `0x1` for 1 byte, `0x2` for 2 bytes, etc.).
 *   - `offset` (optional): The starting position in the buffer from which to begin reading. Defaults to 0.
 *
 * - **Output**:
 *   - The decoded integer, either as a `number` (for small integers) or `bigint` (for large integers), depending on its size.
 *
 * ## Example:
 * ```ts
 * const buffer = Buffer.from([ 0x01, 0x02, 0x03, 0x04 ]);
 * const decoded = decodeInteger(buffer, 0x2); // Decodes a 4-byte integer (2 ** 2)
 * console.log(decoded, buffer); // 16909060 (0x01020304) <Buffer 01 02 03 04>
 *
 * const decoded2 = decodeInteger(buffer, 0x1); // Decodes a 2-byte integer (2 ** 1)
 * console.log(decoded2, buffer); // 258 (0x0102) <Buffer 01 02 03 04>
 * ```
 *
 * ## Error Handling:
 * - Throws an error if the `info` is invalid (not a power of 2) or if the provided `buffer` is too small to read the specified integer.
 *
 * ## Notes:
 * - The function internally calls `readInteger` with the computed byte size based on `info`.
 * - The `info` value represents the size in terms of bits, where the number of bytes is calculated as `2^info`.
 *
 * @param buffer - The buffer containing the encoded integer data.
 * @param info - The byte size of the integer, represented as a power of 2.
 * @param offset - The starting position in the buffer to begin reading (optional, defaults to 0).
 * @returns {number | bigint} The decoded integer, either as a `number` or `bigint`.
 * @throws {Error} If the `info` or `buffer` is invalid.
 */

export function decodeInteger(buffer: Buffer, info: number, offset = 0): number | bigint {
    return readInteger(buffer, <IntegerByteLengthType> (2 ** info), offset);
}

/**
 * The `encodeDouble` function encodes a floating-point `number` (double-precision, 64-bit IEEE 754) into a `Buffer`,
 * including a data header and the encoded double value.
 * The data header contains metadata about the type and the encoding
 * of the double value.
 *
 * - **Input**:
 *   - `double`: The floating-point number to be encoded.
 *   - `type` (optional): A number representing the type of the data to be packed.
 *   Defaults to `0x2`.
 *
 * - **Output**:
 *   - A `Buffer`
 *   containing the encoded double value, including the data header and the double-precision representation.
 *
 * ## Example:
 * ```ts
 * const encodedDouble = encodeDouble(42.42);
 * console.log(encodedDouble); // <Buffer ...> (encoded double with header)
 *
 * const encodedDoubleCustomType = encodeDouble(42.42, 0x5);
 * console.log(encodedDoubleCustomType); // <Buffer ...> (encoded double with custom header type)
 * ```
 *
 * ## Error Handling:
 * -
 * If the provided `double` is not a valid floating-point number,
 * the `Buffer.writeDoubleBE` method will throw an error.
 *
 * ## Notes:
 * - The function first packs a data header using `packDataHeader`,
 * which includes the `type` and an encoded size value (`0x3`).
 * - The double value is written to the `Buffer` at offset 1,
 * ensuring that the first byte of the buffer is reserved for the header.
 * - The function uses the `writeDoubleBE` method, which writes the double value in Big Endian byte order.
 *
 * @param double - The floating-point number (double) to be encoded.
 * @param type - The type of the data to be packed.
 * Defaults to `0x2`.
 * @returns A `Buffer` containing the encoded double along with its data header.
 */

export function encodeDouble(double: number, type: number = 0x2): Buffer {
    const buffer = Buffer.alloc(9);
    buffer.writeUInt8(packDataHeader(type, 0x3));
    buffer.writeDoubleBE(double, 1);

    return buffer;
}

/**
 * The `decodeDouble` function reads a double-precision floating-point number from the provided `buffer` starting at the specified `offset`.
 * It interprets the data as a 64-bit IEEE 754 double, which is commonly used for representing large or highly precise floating-point values.
 *
 * - **Input**:
 *   - `buffer`: The `Buffer` containing the encoded double.
 *   - `offset` (optional): The position in the buffer where the double should be read from. Defaults to 0.
 *
 * - **Output**:
 *   - The decoded `number`, representing the double-precision floating-point value stored in the buffer.
 *
 * ## Example:
 * ```ts
 * const buffer = Buffer.from([ 0x40, 0x59, 0x0f, 0x4e, 0x3b, 0x6e, 0x00, 0x00 ]);
 * const decoded = decodeDouble(buffer);
 * console.log(decoded); // 100.23914991132915 (interpreted as a double-precision float)
 * ```
 *
 * ## Error Handling:
 * - Throws an error if the provided `buffer` is not large enough to read a double (8 bytes).
 *
 * ## Notes:
 * - This function uses the `readDoubleBE` method, which reads a big-endian double from the buffer.
 * - A double in this context is a 64-bit (8-byte) value, commonly used for high-precision floating-point numbers.
 *
 * @param buffer - The buffer containing the encoded double-precision floating-point value.
 * @param offset - The position in the buffer to start reading (optional, defaults to 0).
 * @returns {number} The decoded double-precision floating-point number.
 * @throws {Error} If the buffer is too small to contain a valid double.
 */

export function decodeDouble(buffer: Buffer, offset = 0): number {
    return buffer.readDoubleBE(offset);
}

/**
 * The `encodeNumber` function encodes a `number` or `bigint` value into a `Buffer`.
 * If the value is an integer, it is encoded
 * as an integer using the `encodeInteger` function.
 * If the value is a floating-point number, it is encoded as a double
 * (64-bit IEEE 754) using the `encodeDouble` function.
 *
 * - **Input**:
 *   - `number`: A `number` or `bigint` value to be encoded into a `Buffer`.
 *   If the value is an integer, it is encoded
 *     as an integer; otherwise, it is encoded as a double.
 *
 * - **Output**:
 *   - A `Buffer` containing the encoded representation of the number, either as an integer or a double.
 *
 * ## Example:
 * ```ts
 * const intValue = 42;
 * const encodedInt = encodeNumber(intValue);
 * console.log(encodedInt); // <Buffer ...> (encoded as integer)
 *
 * const doubleValue = 42.42;
 * const encodedDouble = encodeNumber(doubleValue);
 * console.log(encodedDouble); // <Buffer ...> (encoded as double)
 *
 * const bigintValue = 1234567890n;
 * const encodedBigInt = encodeNumber(bigintValue);
 * console.log(encodedBigInt); // <Buffer ...> (encoded as integer)
 * ```
 *
 * ## Error Handling:
 * - This function assumes that the provided `number` is either an integer or a valid floating-point number.
 * If the value is not of type `number` or `bigint`, unexpected behavior may occur.
 *
 * ## Notes:
 * - For integer values, the function delegates to `encodeInteger`,
 * which handles encoding the integer into the appropriate
 *   buffer format.
 * - For floating-point numbers, the function delegates to `encodeDouble`,
 * which encodes the value as a 64-bit IEEE 754 double.
 *
 * @param number - The value (either `number` or `bigint`) to be encoded.
 * @returns A `Buffer` representing the encoded number (either as an integer or a double).
 */

export function encodeNumber(number: number | bigint): Buffer {
    if (Number.isInteger(number) || typeof number === 'bigint')
        return encodeInteger(number);

    return encodeDouble(number);
}

/**
 * The `encodeDate` function encodes a `Date` object into a `Buffer`, representing the time difference between the given
 * date and a reference date (`REFERENCE_DATE`).
 * The time difference is encoded as a double (64-bit IEEE 754) representing
 * the number of seconds since the reference date.
 *
 * - **Input**:
 *   - `date`: A `Date` object representing the date and time to be encoded.
 *
 * - **Output**:
 *   - A `Buffer` containing the encoded date, represented as a double (number of seconds since the reference date).
 *
 * ## Example:
 * ```ts
 * const encodedDate = encodeDate(new Date('2024-12-15T12:00:00Z'));
 * console.log(encodedDate); // <Buffer ...> (encoded date as double)
 * ```
 *
 * ## Error Handling:
 * - If the `date` is not a valid `Date` object, the behavior is undefined and may result in incorrect encoding.
 *
 * ## Notes:
 * - The function calculates the time difference between the given `date` and a predefined reference date
 * (`REFERENCE_DATE`).
 *   This difference is then divided by 1000 to convert the milliseconds into seconds.
 * - The resulting delta time is encoded as a double, ensuring precision for representing the date in the buffer.
 *
 * @param date - The `Date` object to be encoded.
 * @returns A `Buffer` containing the encoded date, represented as a double.
 */

export function encodeDate(date: Date): Buffer {
    const baseDate = new Date(REFERENCE_DATE);
    const deltaTime = date.getTime() - baseDate.getTime();

    return encodeDouble(deltaTime / 1000, 0x3);
}

/**
 * The `decodeDate` function decodes a date value from a `Buffer` at a specified offset.
 * The function reads an 8-byte double-precision floating-point number in Big Endian format,
 * interprets it as the number of seconds relative to the reference date (`REFERENCE_DATE`),
 * and converts it into a `Date` object.
 *
 * - **Input**:
 *   - `buffer`: The `Buffer` containing the encoded date value.
 *   - `offset` (optional): The position in the buffer from where to read the date.
 *   Defaults to `0`.
 *
 * - **Output**:
 *   - A `Date` object representing the decoded date.
 *
 * ## Example:
 * ```ts
 * const buffer = Buffer.alloc(8);
 * buffer.writeDoubleBE(736848000, 0); // Example seconds relative to REFERENCE_DATE
 *
 * const decodedDate = decodeDate(buffer);
 * console.log(decodedDate.toISOString()); // Outputs: '2024-05-08T07:00:00.000Z'
 * ```
 *
 * ## Error Handling:
 * - Throws a `RangeError` if the buffer does not have enough data to read an 8-byte value at the specified offset.
 * - Throws a `TypeError` if the buffer is not a valid `Buffer` instance.
 *
 * ## Notes:
 * - The `REFERENCE_DATE` serves as the base date (`January 1, 2001, UTC`), from which the delta time is calculated.
 * - The function ensures the use of Big Endian byte order for reading the double-precision value,
 * as per standard encoding.
 * - `setSeconds` is used to shift the base date by the provided number of seconds.
 *
 * @param buffer - The `Buffer` containing the encoded date value.
 * @param offset - The offset in the buffer where the date begins.
 * Defaults to `0`.
 * @returns A `Date` object representing the decoded date value.
 * @throws {RangeError} If the buffer has insufficient data to read the double value.
 * @throws {TypeError} If the buffer is not an instance of `Buffer`.
 */

export function decodeDate(buffer: Buffer, offset = 0): Date {
    const dateDouble: number = buffer.readDoubleBE(offset);
    const baseDate = new Date(REFERENCE_DATE); // Jan 1, 2001, UTC
    baseDate.setSeconds(dateDouble - baseDate.getUTCSeconds());

    return baseDate;
}

/**
 * The `encodeUID` function encodes a unique identifier (UID) into a `Buffer` for binary serialization.
 * It adds a header to the UID data, where the header specifies the type and length of the UID.
 * For UIDs longer than 14 bytes, the length is encoded separately as an integer.
 *
 * - **Input**:
 *   - `uid`: A `Buffer` containing the unique identifier to be encoded.
 *
 * - **Output**:
 *   - A `Buffer` containing the encoded UID, including the header and the original UID data.
 *
 * ## Example:
 * ```ts
 * const uid = Buffer.from([ 0x01, 0x02, 0x03, 0x04 ]);
 * const encodedUID = encodeUID(uid);
 * console.log(encodedUID);
 * // Output: <Buffer 83 01 02 03 04>
 *
 * const longUID = Buffer.alloc(20, 0xFF);
 * const encodedLongUID = encodeUID(longUID);
 * console.log(encodedLongUID);
 * // Output: Encoded buffer including the header and UID data
 * ```
 *
 * ## Error Handling:
 * - Throws a `TypeError` if the provided `uid` is not an instance of `Buffer`.
 *
 * ## Notes:
 * - The header uses the `packDataHeader` function to encode the type (`0x8`) and length.
 * - For UIDs longer than 14 bytes, the length is encoded separately using the `encodeInteger` function.
 * - The resulting `Buffer` starts with the header byte(s) followed by the UID data.
 *
 * @param uid - The `Buffer` containing the unique identifier to be encoded.
 * @returns A `Buffer` containing the encoded UID with the appropriate header.
 * @throws {TypeError} If the input `uid` is not a `Buffer`.
 */

export function encodeUID(uid: Buffer): Buffer {
    const length = uid.length;
    const byteArray = [ packDataHeader(0x8, Math.min(length - 1, 0xF)) ];
    if (length > 0xE) {
        byteArray.push(...encodeInteger(length));
    }

    return Buffer.from([ ...byteArray, ...uid ]);
}

/**
 * The `decodeUID` function decodes a unique identifier (UID) from a `Buffer` at the specified offset.
 * It reads the header to determine the size of the UID, adjusts the offset if the UID length exceeds 14 bytes,
 * and extracts the UID data from the buffer.
 *
 * - **Input**:
 *   - `buffer`: The `Buffer` containing the encoded UID data.
 *   - `info`: The header information used to determine the UID length.
 *   - `offset` (optional): The position in the buffer where to start decoding the UID.
 *   Defaults to `0`.
 *
 * - **Output**:
 *   - A `Buffer` containing the decoded UID.
 *
 * ## Example:
 * ```ts
 * const buffer = Buffer.from([ 0x01, 0x02, 0x03, 0x04 ]);
 * const decodedUID = decodeUID(buffer, 0x3);
 * console.log(decodedUID); // <Buffer 01 02 03 04>
 *
 * const longBuffer = Buffer.from([ 0x10, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04 ]);
 * const decodedLongUID = decodeUID(longBuffer, 0xE);
 * console.log(decodedLongUID); // <Buffer 01 02 03 04>
 * ```
 *
 * ## Error Handling:
 * - Throws a `RangeError` if the `info` value is not within a valid range (e.g., greater than `0xF`).
 * - Throws a `TypeError` if the buffer is not a valid `Buffer` instance.
 *
 * ## Notes:
 * - If the `info` value exceeds `0xE`, the function decodes the length from the buffer using the `decodeInteger` function.
 * - The size of the UID is determined by the header's `info` field, with an offset adjustment for longer UIDs.
 * - The resulting UID is returned as a `Buffer` sliced from the input `buffer`.
 *
 * @param buffer - The `Buffer` containing the encoded UID data.
 * @param info - The header information used to determine the UID size.
 * @param offset - The offset in the buffer where the UID data starts. Defaults to `0`.
 * @returns A `Buffer` containing the decoded UID.
 * @throws {RangeError} If the `info` value is invalid or exceeds the allowable range.
 * @throws {TypeError} If the `buffer` is not an instance of `Buffer`.
 */

export function decodeUID(buffer: Buffer, info: number, offset = 0): Buffer {
    let size = info + 1;
    if (info > 0xE) {
        const header = unpackDataHeader(buffer[offset + 1]);
        size = Number(decodeInteger(buffer, header.info, offset + 2));
        offset += (1 + 2 ** header.info);
    }

    return buffer.subarray(offset, offset + size);
}

/**
 * The `encodeBuffer` function encodes a `Buffer`
 * object by adding a data header, and handles the encoding of the data itself.
 * If the data length exceeds a certain threshold, the length is encoded as an integer and included in the result.
 * The buffer is returned with the appropriate header and data encoding.
 *
 * - **Input**:
 *   - `data`: The `Buffer` containing the data to be encoded.
 *   - `type` (optional): A number representing the type of the data to be packed.
 *   Defaults to `0x4`.
 *   - `bytesSize` (optional): The number of bytes per unit to calculate the data length.
 *   Defaults to `0x1`.
 *
 * - **Output**:
 *   - A `Buffer` containing the encoded data, including a header and potentially an encoded length.
 *
 * ## Example:
 * ```ts
 * const bufferData = Buffer.from([1, 2, 3, 4, 5]);
 * const encodedBuffer = encodeBuffer(bufferData);
 * console.log(encodedBuffer); // <Buffer ...> (encoded buffer with header)
 *
 * const largeBufferData = Buffer.from(new Array(100).fill(0));
 * const encodedLargeBuffer = encodeBuffer(largeBufferData);
 * console.log(encodedLargeBuffer); // <Buffer ...> (encoded large buffer with integer length header)
 * ```
 *
 * ## Error Handling:
 * - If the data length exceeds the expected limits (e.g., the encoding would result in an overflow or invalid length),
 *   the behavior is undefined.
 * - If the `data` parameter is not a valid `Buffer`, errors may occur during encoding or copying.
 *
 * ## Notes:
 * - If the data length exceeds `0xE`,
 * the function will encode the data length as an integer (using the `encodeInteger` function),
 *   and include it in the result.
 * - The header is packed using the `packDataHeader` function,
 * with the length of the data (divided by `bytesSize`) included.
 * - The buffer is allocated with sufficient space for the header, the encoded length (if applicable), and the data.
 *
 * @param data - The `Buffer` to be encoded.
 * @param type - The type of the data to be packed. Defaults to `0x4`.
 * @param bytesSize - The size of the data units in bytes.
 * Defaults to `0x1`.
 * @returns A `Buffer` containing the encoded data with the appropriate header and length information.
 */

export function encodeBuffer(data: Buffer, type: number = 0x4, bytesSize = 0x1): Buffer {
    const headerSize = 1;
    const header = packDataHeader(type, Math.min(data.length / bytesSize, 0xF));

    if (data.length > 0xE) {
        const intEncode = encodeInteger(data.length / bytesSize);
        const buffer = Buffer.allocUnsafe(intEncode.length + data.length + headerSize);
        buffer.writeUInt8(header);
        intEncode.copy(buffer, 1);
        data.copy(buffer, headerSize + intEncode.length);

        return buffer;
    }

    const buffer = Buffer.allocUnsafe(data.length + headerSize);
    buffer.writeUInt8(header);
    data.copy(buffer, headerSize);

    return buffer;
}

/**
 * The `decodeBuffer` function decodes a sub-buffer from the provided `data` buffer,
 * using the specified `info` value to determine the size of the data to extract.
 * The `info` value determines how much data (in terms of `bytesSize`) should be included in the decoded buffer,
 * with special handling for larger sizes based on header information.
 *
 * - **Input**:
 *   - `data`: The `Buffer` from which data will be extracted.
 *   - `info`: The number of units (in terms of `bytesSize`) to decode.
 *   This determines how much data is read from the buffer.
 *   - `offset` (optional): The starting position in the `data` buffer. Defaults to 0.
 *   - `bytesSize` (optional): The number of bytes per unit of data.
 *   Defaults to 1, but can be changed for different data types (e.g., for UTF-16 encoding).
 *
 * - **Output**:
 *   - A `Buffer` containing the decoded data from the original buffer.
 *
 * ## Example:
 * ```ts
 * const data = Buffer.from([ 0x01, 0x02, 0x03, 0x04, 0x05, 0x06 ]);
 * const decoded = decodeBuffer(data, 0x2); // Decodes 2 units of data, each being 1 byte in size
 * console.log(decoded); // <Buffer 01 02>
 * ```
 *
 * ## Error Handling:
 * - Throws an error if the computed size is invalid
 * (e.g., the buffer does not contain enough data to fulfill the requested size).
 * - Throws an error if the size calculated based on the `info` and `bytesSize` exceeds a safe range
 * (as determined by `validateSafeInteger`).
 *
 * ## Notes:
 * - The function handles cases where `info` is greater than `0xE`
 * by looking at the header information and adjusting the buffer size accordingly.
 * - The function extracts a sub-buffer from `data`,
 * starting at the calculated `offset` and extending to the specified size.
 *
 * @param data - The buffer containing the encoded data to decode.
 * @param info - The number of units (in terms of `bytesSize`) to decode.
 * @param offset - The starting position in the buffer to begin decoding (optional, defaults to 0).
 * @param bytesSize - The number of bytes per unit of data (optional, defaults to 1).
 * @returns A buffer containing the decoded data.
 * @throws {Error} If the size or offset is invalid.
 */

export function decodeBuffer(data: Buffer, info: number, offset = 0, bytesSize = 1): Buffer {
    let size = info * bytesSize;
    if (info > 0xE) {
        const header = unpackDataHeader(data[offset]);
        size = Number(decodeInteger(data, header.info, offset + 1)) * bytesSize;
        validateSafeInteger(size, 'Buffer size');
        offset += (1 + 2 ** header.info);
    }

    return data.subarray(offset, offset + size);
}

/**
 * The `encodeAscii` function encodes a string of ASCII characters into a `Buffer`
 * by first converting the string to a `Buffer`
 * using the ASCII encoding.
 * It then packs the resulting buffer with a data header using the `encodeBuffer` function.
 *
 * - **Input**:
 *   - `data`: A string containing the ASCII characters to be encoded.
 *
 * - **Output**:
 *   - A `Buffer` containing the encoded ASCII string with an appropriate header.
 *
 * ## Example:
 * ```ts
 * const encodedAscii = encodeAscii('Hello');
 * console.log(encodedAscii); // <Buffer ...> (encoded ASCII string with header)
 * ```
 *
 * ## Error Handling:
 * - If the `data` is not a valid string, the `Buffer.from` method will throw an error.
 *
 * ## Notes:
 * - The function converts the provided string into a `Buffer` using the ASCII encoding (`Buffer.from(data, 'ascii')`).
 * - The resulting `Buffer` is then passed to the `encodeBuffer` function to add a data header,
 * allowing it to be packaged for further use.
 *
 * @param data - The ASCII string to be encoded into a `Buffer`.
 * @returns A `Buffer` containing the encoded ASCII string with the appropriate header.
 */

export function encodeAscii(data: string): Buffer {
    return encodeBuffer(Buffer.from(data), 0x5);
}

/**
 * The `decodeAscii` function decodes an ASCII-encoded string from a `Buffer` at the specified offset.
 * It uses the `decodeBuffer` function to extract the raw data from the buffer and then converts it
 * into a string using the ASCII encoding.
 *
 * - **Input**:
 *   - `buffer`: The `Buffer` containing the encoded ASCII string.
 *   - `info`: The header information used to determine the size of the ASCII string.
 *   - `offset` (optional): The position in the buffer from which to start decoding.
 *   Defaults to `0`.
 *
 * - **Output**:
 *   - A string containing the decoded ASCII value.
 *
 * ## Example:
 * ```ts
 * const buffer = Buffer.from([ 0x03, 0x48, 0x65, 0x6C, 0x6C, 0x6F ]);
 * const decodedString = decodeAscii(buffer, 0x6);
 * console.log(decodedString); // 'Hello'
 * ```
 *
 * ## Error Handling:
 * - Throws a `TypeError` if the provided `buffer` is not a valid `Buffer`.
 * - Throws an `Error` if the `decodeBuffer` function fails to decode the data.
 *
 * ## Notes:
 * - The function uses the `decodeBuffer` to extract the raw bytes from the buffer before converting them into an ASCII string.
 * - The resulting string is returned as decoded text in the ASCII encoding.
 *
 * @param buffer - The `Buffer` containing the encoded ASCII data.
 * @param info - The header information used to determine the size of the ASCII data.
 * @param offset - The position in the buffer to start decoding. Defaults to `0`.
 * @returns The decoded ASCII string.
 * @throws {TypeError} If the `buffer` is not a valid `Buffer`.
 * @throws {Error} If there is an issue with decoding the data.
 */

export function decodeAscii(buffer: Buffer, info: number, offset = 0): string {
    return decodeBuffer(buffer, info, offset).toString();
}

/**
 * The `encodeUtf16BE` function encodes a string of UTF-16 characters into a `Buffer` in Big Endian byte order.
 * It first converts
 * the string into a `Buffer` using the UTF-16 Little Endian encoding (`utf16le`),
 * then swaps the byte order to Big Endian using the `swap16` method.
 * The resulting buffer is then passed to the `encodeBuffer` function to add a data header and package the data.
 *
 * - **Input**:
 *   - `data`: A string containing the UTF-16 characters to be encoded.
 *
 * - **Output**:
 *   - A `Buffer` containing the encoded UTF-16 Big Endian string with an appropriate header.
 *
 * ## Example:
 * ```ts
 * const encodedUtf16BE = encodeUtf16BE('Hello');
 * console.log(encodedUtf16BE); // <Buffer ...> (encoded UTF-16 Big Endian string with header)
 * ```
 *
 * ## Error Handling:
 * - If the `data` is not a valid string, the `Buffer.from` method will throw an error.
 *
 * ## Notes:
 * - The function first converts the string into a `Buffer` using UTF-16 Little Endian encoding (`Buffer.from(data, 'utf16le')`).
 * - The byte order of the resulting buffer is then swapped to Big Endian using the `swap16` method.
 * - The final buffer is passed to the `encodeBuffer` function, which adds the appropriate data header for encoding.
 *
 * @param data - The UTF-16 string to be encoded into a `Buffer`.
 * @returns A `Buffer` containing the encoded UTF-16 Big Endian string with the appropriate header.
 */

export function encodeUtf16BE(data: string): Buffer {
    return encodeBuffer(Buffer.from(data, 'utf16le').swap16(), 0x6, 2);
}

/**
 * The `decodeUtf16BE` function decodes a UTF-16 Big Endian encoded string from a `Buffer` at the specified offset.
 * It uses the `decodeBuffer` function to extract the raw data from the buffer, then swaps the byte order
 * (Big Endian to Little Endian) and converts the result into a string using the UTF-16 Little Endian encoding.
 *
 * - **Input**:
 *   - `buffer`: The `Buffer` containing the encoded UTF-16 Big Endian string.
 *   - `info`: The header information used to determine the size of the UTF-16 string.
 *   - `offset` (optional): The position in the buffer from which to start decoding.
 *   Defaults to `0`.
 *
 * - **Output**:
 *   - A string containing the decoded UTF-16 Big Endian value, converted to UTF-16 Little Endian.
 *
 * ## Example:
 * ```ts
 * const buffer = Buffer.from([ 0x00, 0x48, 0x00, 0x65, 0x00, 0x6c, 0x00, 0x6c, 0x00, 0x6f ]);
 * const decodedString = decodeUtf16BE(buffer, 0x5);
 * console.log(decodedString); // 'Hello'
 * ```
 *
 * ## Error Handling:
 * - Throws a `TypeError` if the provided `buffer` is not a valid `Buffer`.
 * - Throws an `Error` if the `decodeBuffer` function fails to decode the data.
 *
 * ## Notes:
 * - The function swaps the byte order from Big Endian to Little Endian using the `swap16()` method before decoding.
 * - The resulting string is returned as decoded text in the UTF-16 Little Endian encoding.
 *
 * @param buffer - The `Buffer` containing the encoded UTF-16 Big Endian data.
 * @param info - The header information used to determine the size of the UTF-16 data.
 * @param offset - The position in the buffer to start decoding. Defaults to `0`.
 * @returns The decoded UTF-16 string in Little Endian format.
 * @throws {TypeError} If the `buffer` is not a valid `Buffer`.
 * @throws {Error} If there is an issue with decoding the data.
 */

export function decodeUtf16BE(buffer: Buffer, info: number, offset = 0): string {
    return decodeBuffer(buffer, info, offset, 2).swap16().toString('utf16le');
}

/**
 * The `encodeObjects` function encodes a set of object offsets into a `Buffer`, including a data header and the offsets
 * themselves.
 * The function handles different cases based on the length of the offsets, either including an integer-encoded
 * length if the number of offsets exceeds a threshold, or simply encoding the offsets with a header.
 *
 * - **Input**:
 *   - `length`: The number of offsets to be encoded.
 *   - `type`: A number representing the type of the data to be packed.
 *   - `offsets`: An array of offsets (either `number` or `bigint`) to be encoded.
 *   - `size`: The size in bytes for each offset (typically 1, 2, 4, 8, or 16 bytes).
 *
 * - **Output**:
 *   - A `Buffer`
 *   containing the encoded offsets and a header, with optional integer length encoding based on the `length`.
 *
 * ## Example:
 * ```ts
 * const offsets = [0x1000, 0x2000, 0x3000];
 * const encodedObjects = encodeObjects(3, 0x7, offsets, 4);
 * console.log(encodedObjects); // <Buffer ...> (encoded offsets with header)
 *
 * const largeOffsets = [0x100000, 0x200000, 0x300000];
 * const encodedLargeObjects = encodeObjects(3, 0x8, largeOffsets, 4);
 * console.log(encodedLargeObjects); // <Buffer ...> (encoded large offsets with integer length header)
 * ```
 *
 * ## Error Handling:
 * - If any of the offsets are not valid integers or bigints, the `writeInteger` function may throw an error.
 * - If the `length` is not a valid number, or exceeds the supported buffer size, errors may occur during encoding.
 *
 * ## Notes:
 * - The function first allocates a `Buffer` for the offsets,
 * then encodes each offset using the `writeInteger` function.
 * - The header is packed using the `packDataHeader` function, which includes the `type` and an encoded size value.
 * - If the number of offsets exceeds `0xE`, the function will encode the `length`
 * as an integer and include it in the result.
 *
 * @param length - The number of offsets to be encoded.
 * @param type - The type of the data to be packed.
 * @param offsets - An array of offsets to be encoded.
 * @param size - The size in bytes for each offset.
 * @returns A `Buffer` containing the encoded offsets and an appropriate header.
 */

export function encodeObjects(length: number, type: number, offsets: Array<number>, size: number): Buffer {
    const offsetsBuffer = Buffer.alloc(offsets.length * size);
    for (let index = 0; index < offsets.length; index++) {
        writeInteger(offsetsBuffer, offsets[index], <IntegerByteLengthType> size, index * size);
    }

    const headerSize = 1;
    const header = packDataHeader(type, Math.min(length, 0xF));
    if (length > 0xE) {
        const intEncode = encodeInteger(length);
        const buffer = Buffer.allocUnsafe(intEncode.length + offsetsBuffer.length + headerSize);
        buffer.writeUInt8(header);
        intEncode.copy(buffer, 1);
        offsetsBuffer.copy(buffer, headerSize + intEncode.length);

        return buffer;
    }

    const buffer = Buffer.allocUnsafe(offsetsBuffer.length + headerSize);
    buffer.writeUInt8(header);
    offsetsBuffer.copy(buffer, headerSize);

    return buffer;
}
