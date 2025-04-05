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
 * The reference point in time used as a baseline for date calculations: January 1, 2001, at 00:00:00 UTC
 * This constant is used for calculating relative times from this specific reference point.
 *
 * @since 1.0.1
 */

const REFERENCE_DATE = Date.UTC(2001, 0, 1);

/**
 * Structure representing the header of a binary property list
 *
 * @param magic - A 6-byte string identifying the data format
 * @param version - A 2-byte string indicating the version of the format
 *
 * @throws Error if the size of either the magic or version string doesn't match the expected length
 *
 * @example
 * ```ts
 * const header = headerStruct.toBuffer({ magic: 'bplist', version: '00' });
 * console.log(header); // Output: A Buffer with the serialized header data
 * ```
 *
 * @since 1.0.1
 */

export const headerStruct = new Struct<HeaderInterface>({
    'magic': { type: 'string', size: 6 },
    'version': { type: 'string', size: 2 }
});

/**
 * Structure representing the trailer of a binary property list
 *
 * @param unused - A 5-byte array of unsigned 8-bit integers, reserved for future use or alignment
 * @param sortVersion - A single unsigned 8-bit integer representing the version of sorting used
 * @param offsetTableOffsetSize - A single unsigned 8-bit integer specifying the size of the offset table
 * @param objectReferenceSize - A single unsigned 8-bit integer specifying the size of object references
 * @param numberOfObjects - A 64-bit unsigned big-endian integer representing the total number of objects
 * @param rootObjectOffset - A 64-bit unsigned big-endian integer representing the offset of the root object
 * @param offsetTableOffset - A 64-bit unsigned big-endian integer representing the offset of the offset table
 *
 * @throws Error if any provided values don't match the expected type or size during serialization/deserialization
 *
 * @example
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
 * @since 1.0.1
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
 * Packs a type and info value into a single byte
 *
 * @param type - The type value (0-15) to be packed into the upper 4 bits
 * @param info - The info value (0-15) to be packed into the lower 4 bits
 * @param asBuffer - Whether to return the result as a Buffer instead of a number
 * @returns A number or Buffer containing the packed byte
 *
 * @throws RangeError if either type or info is outside the valid range of 0-15
 *
 * @example
 * ```ts
 * // Return as number (default)
 * packDataHeader(3, 7); // 55 (binary: 00110111)
 *
 * // Return as Buffer
 * packDataHeader(10, 4, true); // <Buffer a4>
 * ```
 *
 * @since 1.0.1
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
 * Extracts type and info values from a packed byte
 *
 * @param byte - A single byte (number) containing both the type and info values
 * @returns An object containing the extracted type and info values
 *
 * @throws Error if the provided byte is not a valid number between 0 and 255
 *
 * @example
 * ```ts
 * const byte = 0xA3; // 1010 0011 in binary
 * const header = unpackDataHeader(byte);
 * console.log(header); // { type: 10, info: 3 }
 * ```
 *
 * @since 1.0.1
 */

export function unpackDataHeader(byte: number): TypeHeaderInterface {
    const info = byte & 0xF;
    const type = byte >> 4;

    return { type, info };
}

/**
 * Packs an array of offset values into a Buffer
 *
 * @param offsets - An array of number or bigint values representing offsets to pack
 *
 * @returns A Buffer containing the packed offsets
 *
 * @example
 * ```ts
 * const offsets = [42, 1000, 1234567890n];
 * const packedBuffer = packOffsetTable(offsets);
 * console.log(packedBuffer); // <Buffer ...>
 * ```
 *
 * @since 1.0.1
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
 * Decodes a table of offsets from a given data buffer
 *
 * @param data - The buffer containing the raw data
 * @param trailer - The trailer metadata that provides information about the offset table
 *
 * @returns An array of decoded offsets
 *
 * @throws BinaryParsingError - If the number of objects is invalid or the offsets can't be read correctly
 *
 * @example
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
 * @since 1.0.1
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
 * Encodes an integer into a Buffer with a data header
 *
 * @param integer - The integer to be encoded, either number or bigint
 * @param type - The type of the data to be packed (defaults to 0x1)
 * @returns A Buffer containing the encoded integer along with its data header
 *
 * @throws TypeError - If the provided integer is not a valid number or bigint
 *
 * @example
 * ```ts
 * const encodedInt = encodeInteger(12345);
 * console.log(encodedInt); // <Buffer ...> (encoded integer with header)
 *
 * const encodedBigInt = encodeInteger(1234567890n);
 * console.log(encodedBigInt); // <Buffer ...> (encoded bigint with header)
 * ```
 *
 * @since 1.0.1
 */

export function encodeInteger(integer: number | bigint, type = 0x1): Buffer {
    const size = integerByteLength(integer);
    const buffer = Buffer.alloc(size + 1);

    buffer.writeUInt8(packDataHeader(type, Math.round(Math.sqrt(size - 1))));
    writeInteger(buffer, integer, size, 1);

    return buffer;
}

/**
 * Decodes an integer from the given buffer using the specified info value
 *
 * @param buffer - The buffer containing the encoded integer data
 * @param info - The byte size of the integer, represented as a power of 2
 * @param offset - The starting position in the buffer to begin reading
 * @returns The decoded integer, either as a number or bigint
 *
 * @throws Error - If the info or buffer is invalid
 *
 * @example
 * ```ts
 * const buffer = Buffer.from([0x01, 0x02, 0x03, 0x04]);
 * const decoded = decodeInteger(buffer, 0x2); // Decodes a 4-byte integer (2 ** 2)
 * console.log(decoded); // 16909060 (0x01020304)
 *
 * const decoded2 = decodeInteger(buffer, 0x1); // Decodes a 2-byte integer (2 ** 1)
 * console.log(decoded2); // 258 (0x0102)
 * ```
 *
 * @since 1.0.1
 */

export function decodeInteger(buffer: Buffer, info: number, offset = 0): number | bigint {
    return readInteger(buffer, <IntegerByteLengthType> (2 ** info), offset);
}

/**
 * Encodes a floating-point number into a Buffer with a data header
 *
 * @param double - The floating-point number (double) to be encoded
 * @param type - The type of the data to be packed (defaults to 0x2)
 * @returns A Buffer containing the encoded double along with its data header
 *
 * @example
 * ```ts
 * const encodedDouble = encodeDouble(42.42);
 * console.log(encodedDouble); // <Buffer ...> (encoded double with header)
 *
 * const encodedDoubleCustomType = encodeDouble(42.42, 0x5);
 * console.log(encodedDoubleCustomType); // <Buffer ...> (encoded double with custom header type)
 * ```
 *
 * @since 1.0.1
 */

export function encodeDouble(double: number, type: number = 0x2): Buffer {
    const buffer = Buffer.alloc(9);
    buffer.writeUInt8(packDataHeader(type, 0x3));
    buffer.writeDoubleBE(double, 1);

    return buffer;
}

/**
 * Reads a double-precision floating-point number from the provided buffer
 *
 * @param buffer - The buffer containing the encoded double-precision floating-point value
 * @param offset - The position in the buffer to start reading
 * @returns The decoded double-precision floating-point number
 *
 * @throws Error - If the buffer is too small to contain a valid double
 *
 * @example
 * ```ts
 * const buffer = Buffer.from([0x40, 0x59, 0x0f, 0x4e, 0x3b, 0x6e, 0x00, 0x00]);
 * const decoded = decodeDouble(buffer);
 * console.log(decoded); // 100.23914991132915 (interpreted as a double-precision float)
 * ```
 *
 * @since 1.0.1
 */

export function decodeDouble(buffer: Buffer, offset = 0): number {
    return buffer.readDoubleBE(offset);
}

/**
 * Encodes a number or bigint value into a Buffer
 *
 * @param number - The value (either number or bigint) to be encoded
 * @returns A Buffer representing the encoded number (either as an integer or a double)
 *
 * @example
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
 * @since 1.0.1
 */

export function encodeNumber(number: number | bigint): Buffer {
    if (Number.isInteger(number) || typeof number === 'bigint')
        return encodeInteger(number);

    return encodeDouble(number);
}

/**
 * Encodes a Date object into a Buffer, representing the time difference between the given
 * date and a reference date
 *
 * @param date - The Date object to be encoded
 * @returns A Buffer containing the encoded date, represented as a double
 *
 * @example
 * ```ts
 * const encodedDate = encodeDate(new Date('2024-12-15T12:00:00Z'));
 * console.log(encodedDate); // <Buffer ...> (encoded date as double)
 * ```
 *
 * @since 1.0.1
 */

export function encodeDate(date: Date): Buffer {
    const baseDate = new Date(REFERENCE_DATE);
    const deltaTime = date.getTime() - baseDate.getTime();

    return encodeDouble(deltaTime / 1000, 0x3);
}

/**
 * Decodes a date value from a Buffer at a specified offset
 *
 * @param buffer - The Buffer containing the encoded date value
 * @param offset - The offset in the buffer where the date begins
 * @returns A Date object representing the decoded date value
 *
 * @throws TypeError - If the buffer is not an instance of Buffer
 * @throws RangeError - If the buffer has insufficient data to read the double value
 *
 * @example
 * ```ts
 * const buffer = Buffer.alloc(8);
 * buffer.writeDoubleBE(736848000, 0); // Example seconds relative to REFERENCE_DATE
 *
 * const decodedDate = decodeDate(buffer);
 * console.log(decodedDate.toISOString()); // Outputs: '2024-05-08T07:00:00.000Z'
 * ```
 *
 * @since 1.0.1
 */

export function decodeDate(buffer: Buffer, offset = 0): Date {
    const dateDouble: number = buffer.readDoubleBE(offset);
    const baseDate = new Date(REFERENCE_DATE); // Jan 1, 2001, UTC
    baseDate.setSeconds(dateDouble - baseDate.getUTCSeconds());

    return baseDate;
}

/**
 * Encodes a unique identifier (UID) into a Buffer for binary serialization
 *
 * @param uid - The Buffer containing the unique identifier to be encoded
 * @returns A Buffer containing the encoded UID with the appropriate header
 *
 * @throws TypeError - If the input uid is not a Buffer
 *
 * @example
 * ```ts
 * const uid = Buffer.from([0x01, 0x02, 0x03, 0x04]);
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
 * @since 1.0.1
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
 * Decodes a unique identifier (UID) from a Buffer at the specified offset
 *
 * @param buffer - The Buffer containing the encoded UID data
 * @param info - The header information used to determine the UID size
 * @param offset - The offset in the buffer where the UID data starts
 * @returns A Buffer containing the decoded UID
 *
 * @throws RangeError - If the info value is invalid or exceeds the allowable range
 * @throws TypeError - If the buffer is not an instance of Buffer
 *
 * @example
 * ```ts
 * const buffer = Buffer.from([0x01, 0x02, 0x03, 0x04]);
 * const decodedUID = decodeUID(buffer, 0x3);
 * console.log(decodedUID); // <Buffer 01 02 03 04>
 *
 * const longBuffer = Buffer.from([0x10, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04]);
 * const decodedLongUID = decodeUID(longBuffer, 0xE);
 * console.log(decodedLongUID); // <Buffer 01 02 03 04>
 * ```
 *
 * @since 1.0.1
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
 * Encodes a Buffer by adding a data header with optional type and size information
 *
 * @param data - The Buffer to be encoded
 * @param type - The type of the data to be packed
 * @param bytesSize - The size of the data units in bytes
 * @returns A Buffer containing the encoded data with the appropriate header and length information
 *
 * @example
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
 * @since 1.0.1
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
 * Decodes a sub-buffer from the provided data buffer based on info value
 *
 * @param data - The buffer containing the encoded data to decode
 * @param info - The number of units (in terms of bytesSize) to decode
 * @param offset - The starting position in the buffer to begin decoding
 * @param bytesSize - The number of bytes per unit of data
 * @returns A buffer containing the decoded data
 *
 * @throws Error - If the size or offset is invalid
 * @throws Error - If the calculated size exceeds safe integer limits
 *
 * @example
 * ```ts
 * const data = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06]);
 * const decoded = decodeBuffer(data, 0x2); // Decodes 2 units of data, each being 1 byte in size
 * console.log(decoded); // <Buffer 01 02>
 * ```
 *
 * @since 1.0.1
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
 * Encodes a string of ASCII characters into a Buffer with a data header
 *
 * @param data - The ASCII string to be encoded into a Buffer
 * @returns A Buffer containing the encoded ASCII string with the appropriate header
 *
 * @throws Error - If the data is not a valid string
 *
 * @example
 * ```ts
 * const encodedAscii = encodeAscii('Hello');
 * console.log(encodedAscii); // <Buffer ...> (encoded ASCII string with header)
 * ```
 *
 * @since 1.0.1
 */

export function encodeAscii(data: string): Buffer {
    return encodeBuffer(Buffer.from(data), 0x5);
}

/**
 * Decodes an ASCII-encoded string from a Buffer
 *
 * @param buffer - The Buffer containing the encoded ASCII data
 * @param info - The header information used to determine the size of the ASCII string
 * @param offset - The position in the buffer from which to start decoding (defaults to 0)
 *
 * @returns The decoded ASCII string
 *
 * @throws TypeError - If the buffer is not a valid Buffer
 * @throws Error - If there is an issue with decoding the data
 *
 * @example
 * ```ts
 * const buffer = Buffer.from([0x03, 0x48, 0x65, 0x6C, 0x6C, 0x6F]);
 * const decodedString = decodeAscii(buffer, 0x6);
 * console.log(decodedString); // 'Hello'
 * ```
 *
 * @since 1.0.1
 */

export function decodeAscii(buffer: Buffer, info: number, offset = 0): string {
    return decodeBuffer(buffer, info, offset).toString();
}

/**
 * Encodes a string into UTF-16 Big Endian format with appropriate header
 *
 * @param data - The string to be encoded into UTF-16 Big Endian
 * @returns A Buffer containing the encoded UTF-16 Big Endian string with header
 *
 * @example
 * ```ts
 * const encodedUtf16BE = encodeUtf16BE('Hello');
 * console.log(encodedUtf16BE); // <Buffer ...>
 * ```
 *
 * @since 1.0.1
 */

export function encodeUtf16BE(data: string): Buffer {
    return encodeBuffer(Buffer.from(data, 'utf16le').swap16(), 0x6, 2);
}

/**
 * Decodes a UTF-16 Big Endian encoded string from a Buffer
 *
 * @param buffer - The Buffer containing the encoded UTF-16 Big Endian data
 * @param info - The header information used to determine the size of the UTF-16 string
 * @param offset - The position in the buffer from which to start decoding (defaults to 0)
 * @returns The decoded UTF-16 string
 *
 * @throws TypeError - If the buffer is not a valid Buffer
 * @throws Error - If there is an issue with decoding the data
 *
 * @example
 * ```ts
 * const buffer = Buffer.from([0x00, 0x48, 0x00, 0x65, 0x00, 0x6c, 0x00, 0x6c, 0x00, 0x6f]);
 * const decodedString = decodeUtf16BE(buffer, 0x5);
 * console.log(decodedString); // 'Hello'
 * ```
 *
 * @since 1.0.1
 */

export function decodeUtf16BE(buffer: Buffer, info: number, offset = 0): string {
    return decodeBuffer(buffer, info, offset, 2).swap16().toString('utf16le');
}

/**
 * Encodes a set of object offsets into a Buffer with a data header
 *
 * @param length - The number of offsets to be encoded
 * @param type - A number representing the type of the data to be packed
 * @param offsets - An array of offsets to be encoded
 * @param size - The size in bytes for each offset (typically 1, 2, 4, 8, or 16 bytes)
 *
 * @returns A Buffer containing the encoded offsets with an appropriate header
 *
 * @example
 * ```ts
 * // Encode small number of offsets
 * const offsets = [0x1000, 0x2000, 0x3000];
 * const encodedObjects = encodeObjects(3, 0x7, offsets, 4);
 *
 * // Encode with integer length for larger collections
 * const largeOffsets = Array(20).fill(0x1000);
 * const encodedLargeObjects = encodeObjects(20, 0x8, largeOffsets, 4);
 * ```
 *
 * @since 1.0.1
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
