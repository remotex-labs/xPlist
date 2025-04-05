/**
 * Imports
 */

import {
    decodeAscii,
    decodeBuffer,
    decodeDate,
    decodeDouble,
    decodeInteger,
    decodeUID,
    decodeUtf16BE,
    encodeAscii,
    encodeBuffer,
    encodeDate,
    encodeDouble,
    encodeInteger,
    encodeNumber,
    encodeObjects,
    encodeUID,
    encodeUtf16BE,
    packDataHeader,
    packOffsetTable,
    unpackDataHeader,
    unpackOffsetTable
} from '@structs/binary.struct';
import { integerByteLength } from '@components/numbers.component';

/**
 * Defines
 */

const REFERENCE_DATE = Date.UTC(2001, 0, 1);

/**
 * Tests
 */

describe('packDataHeader', () => {
    test.each([
        [ 0, 0, false, 0 ],              // type: 0, info: 0, asBuffer: false -> expected number: 0
        [ 15, 15, false, 255 ],           // type: 15, info: 15, asBuffer: false -> expected number: 255
        [ 1, 2, false, 18 ],              // type: 1, info: 2, asBuffer: false -> expected number: 18
        [ 1, 2, true, Buffer.from([ 18 ]) ], // type: 1, info: 2, asBuffer: true -> expected Buffer: [18]
        [ 15, 0, true, Buffer.from([ 240 ]) ] // type: 15, info: 0, asBuffer: true -> expected Buffer: [240]
    ])(
        'should return correct result for type=%i, info=%i, asBuffer=%p',
        (type, info, asBuffer, expectedResult) => {
            expect(packDataHeader(type, info, <any> asBuffer)).toEqual(expectedResult);
        }
    );

    test.each([
        [ -1, 0 ],     // Invalid type: -1
        [ 0, -1 ],     // Invalid info: -1
        [ 16, 0 ],     // Invalid type: 16
        [ 0, 16 ]      // Invalid info: 16
    ])(
        'should throw RangeError for invalid type=%i, info=%i',
        (type, info) => {
            expect(() => packDataHeader(type, info)).toThrow(RangeError);
        }
    );
});

describe('unpackDataHeader', () => {
    // Test valid byte values and expected type and info values
    test.each([
        [ 0, { type: 0, info: 0 }],      // byte: 0 -> type: 0, info: 0
        [ 255, { type: 15, info: 15 }],   // byte: 255 -> type: 15, info: 15
        [ 18, { type: 1, info: 2 }],      // byte: 18 -> type: 1, info: 2
        [ 240, { type: 15, info: 0 }],    // byte: 240 -> type: 15, info: 0
        [ 130, { type: 8, info: 2 }]     // byte: 130 -> type: 8, info: 2
    ])(
        'should unpack byte=%i to correct type and info',
        (byte, expectedResult) => {
            expect(unpackDataHeader(byte)).toEqual(expectedResult);
        }
    );
});

describe('packOffsetTable', () => {
    test.each([
        [ [ 0 ], Buffer.from([ 0 ]) ],                      // Single offset: 0 -> Buffer: [0]
        [ [ 1 ], Buffer.from([ 1 ]) ],                      // Single offset: 1 -> Buffer: [1]
        [ [ 255 ], Buffer.from([ 255 ]) ],                  // Single offset: 255 -> Buffer: [255]
        [ [ 0, 1 ], Buffer.from([ 0, 1 ]) ],                // Two offsets: 0, 1 -> Buffer: [0, 1]
        [ [ 1, 255 ], Buffer.from([ 1, 255 ]) ],            // Two offsets: 1, 255 -> Buffer: [1, 255]
        [ [ 1, 256 ], Buffer.from([ 0, 1, 1, 0 ]) ],        // Two offsets: 1, 256 -> Buffer: [0, 1, 1, 0]
        [ [ 1000n, 1000000n ], Buffer.from([ 0, 0, 3, 232, 0, 15, 66, 64 ]) ] // BigInt offsets: 1000n, 1000000n -> Buffer: [0, 0, 3, 232, 0, 15, 66, 64]
    ])(
        'should correctly pack offsets=%p into a buffer',
        (offsets, expectedBuffer) => {
            const result = packOffsetTable(offsets);
            expect(result).toEqual(expectedBuffer);
        }
    );

    test('should return an empty buffer for an empty offsets array', () => {
        expect(packOffsetTable([])).toEqual(Buffer.alloc(0));
    });
});

describe('unpackOffsetTable', () => {
    test.each([
        [
            Buffer.from([ 0, 0, 0, 5, 0, 10, 0, 15 ]),
            { numberOfObjects: 3, offsetTableOffset: 2, offsetTableOffsetSize: 2 },  // Trailer properties
            [ 5, 10, 15 ]  // Expected result
        ],
        [
            Buffer.from([ 0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 0, 3 ]),  // Buffer containing 32-bit offsets
            { numberOfObjects: 3, offsetTableOffset: 0, offsetTableOffsetSize: 4 },
            [ 1, 2, 3 ]
        ],
        [
            Buffer.from([ 1, 2, 3, 4, 5, 6 ]),  // Another example with 8-bit offsets
            { numberOfObjects: 3, offsetTableOffset: 0, offsetTableOffsetSize: 1 },
            [ 1, 2, 3 ]
        ]
    ])(
        'should unpack offset table correctly with buffer=%p and trailer=%p',
        (data, trailer, expectedOffsets) => {
            const result = unpackOffsetTable(data, <any> trailer);
            expect(result).toEqual(expectedOffsets);
        }
    );

    test.each([
        [
            Buffer.from([ 0, 0, 0, 5, 0, 10, 0, 15 ]),
            { numberOfObjects: -1, offsetTableOffset: 4, offsetTableOffsetSize: 2 },
            'Invalid number of objects'
        ],
        [
            Buffer.from([ 0, 0, 0, 5, 0, 10, 0, 15 ]),
            { numberOfObjects: 3, offsetTableOffset: 4, offsetTableOffsetSize: 4 },
            'The value of "offset" is out of range. It must be >= 0 and <= 4. Received 8'
        ],
        [
            Buffer.from([ 0, 0, 0, 5, 0, 10, 0, 15 ]),
            { numberOfObjects: 3, offsetTableOffset: 4, offsetTableOffsetSize: 0 },
            'Unsupported size. Supported sizes are 1, 2, 4, 8 or 16 bytes'
        ]
    ])(
        'should throw error when trailer is invalid with buffer=%p and trailer=%p',
        (data, trailer, expectedError) => {
            expect(() => unpackOffsetTable(data, <any> trailer)).toThrowError(expectedError);
        }
    );
});

describe('encodeInteger', () => {
    const createExpectedBuffer = (header: number, integer: number | bigint, size: number) => {
        const buffer = Buffer.alloc(size + 1);
        buffer.writeUInt8(header, 0); // Write the header byte at the beginning
        buffer.writeUIntBE(Number(integer), 1, size);

        return buffer;
    };

    test.each([
        [ 123, 0x1, (header: number) => createExpectedBuffer(header, 123, integerByteLength(123)) ],
        [ 255, 0x1, (header: number) => createExpectedBuffer(header, 255, integerByteLength(255)) ],
        [ 1000n, 0x1, (header: number) => createExpectedBuffer(header, 1000n, integerByteLength(1000n)) ],
        [ 1000000, 0x2, (header: number) => createExpectedBuffer(header, 1000000, integerByteLength(1000000)) ],
        [ 0, 0x1, (header: number) => createExpectedBuffer(header, 0, integerByteLength(0)) ],
        [ 1, 0x1, (header: number) => createExpectedBuffer(header, 1, integerByteLength(1)) ]
    ])(
        'should correctly encode integer=%p with type=%p',
        (integer, type, expectedBufferCallback) => {
            // Calculate the size for the integer
            const size = integerByteLength(integer);
            const header = packDataHeader(type, Math.round(Math.sqrt(size - 1))); // Calculate header based on the size

            // Get the expected buffer using the callback
            const expectedBuffer = expectedBufferCallback(header);

            // Encode the integer and check if the result matches the expected buffer
            const result = encodeInteger(integer, type);
            expect(result).toEqual(expectedBuffer);
        }
    );
});

describe('decodeInteger', () => {
    test.each([
        [
            Buffer.from([ 0x01, 0x02 ]),  // Buffer containing a 2-byte integer
            1,  // info value corresponds to 2^1 = 2 bytes
            0,  // offset where the integer starts in the buffer
            258  // Expected decoded value (0x0102)
        ],
        [
            Buffer.from([ 0x00, 0x00, 0x04, 0xD2 ]),  // Buffer containing a 4-byte integer
            2,  // info value corresponds to 2^2 = 4 bytes
            0,  // offset where the integer starts in the buffer
            1234  // Expected decoded value (0x000004D2)
        ],
        [
            Buffer.from([ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01 ]),  // Buffer containing an 8-byte integer
            3,  // info value corresponds to 2^3 = 8 bytes
            0,  // offset where the integer starts in the buffer
            1n  // Expected decoded value (0x0000000000000001) as BigInt
        ],
        [
            Buffer.from([ 0x01 ]),  // Buffer containing a 1-byte integer
            0,  // info value corresponds to 2^0 = 1 byte
            0,  // offset where the integer starts in the buffer
            1  // Expected decoded value (0x01)
        ]
    ])(
        'should correctly decode buffer=%p with info=%p at offset=%p to expected result=%p',
        (buffer, info, offset, expectedResult) => {
            // Decode the integer from the buffer
            const result = decodeInteger(buffer, info, offset);
            expect(result).toEqual(expectedResult);  // Verify the decoded result matches the expected value
        }
    );

    // Additional test case for invalid offset (if relevant for your code)
    it('should throw an error for invalid offset', () => {
        const buffer = Buffer.from([ 0x01, 0x02, 0x03 ]);
        const info = 1;  // 2 bytes
        const invalidOffset = 5;  // Offset beyond the buffer size

        expect(() => decodeInteger(buffer, info, invalidOffset))
            .toThrowError('The value of "offset" is out of range. It must be >= 0 and <= 1. Received 5');
    });
});

describe('encodeDouble', () => {
    test.each([
        // [double, type, expectedBuffer]
        [ 1.23, 0x2, (header: number) => {
            const buffer = Buffer.alloc(9);
            buffer.writeUInt8(header, 0);
            buffer.writeDoubleBE(1.23, 1); // Writing 1.23 as a double starting at index 1

            return buffer;
        } ],
        [ 0, 0x2, (header) => {
            const buffer = Buffer.alloc(9);
            buffer.writeUInt8(header, 0);
            buffer.writeDoubleBE(0, 1); // Writing 0 as a double starting at index 1

            return buffer;
        } ],
        [ -5.67, 0x2, (header) => {
            const buffer = Buffer.alloc(9);
            buffer.writeUInt8(header, 0);
            buffer.writeDoubleBE(-5.67, 1); // Writing -5.67 as a double starting at index 1

            return buffer;
        } ],
        [ 1e10, 0x2, (header) => {
            const buffer = Buffer.alloc(9);
            buffer.writeUInt8(header, 0);
            buffer.writeDoubleBE(1e10, 1); // Writing 1e10 as a double starting at index 1

            return buffer;
        } ],
        [ -1e10, 0x3, (header) => {
            const buffer = Buffer.alloc(9);
            buffer.writeUInt8(header, 0);
            buffer.writeDoubleBE(-1e10, 1); // Writing -1e10 as a double starting at index 1

            return buffer;
        } ]
    ])(
        'should correctly encode double=%p with type=%p',
        (double, type, expectedBufferCallback) => {
            const header = packDataHeader(type, 0x3); // Header is generated based on type
            const expectedBuffer = expectedBufferCallback(header);

            const result = encodeDouble(double, type);
            expect(result).toEqual(expectedBuffer);
        }
    );

    test('should encode double with default type 0x2', () => {
        const double = 3.14159;
        const header = packDataHeader(0x2, 0x3);

        const expectedBuffer = Buffer.alloc(9);
        expectedBuffer.writeUInt8(header, 0);
        expectedBuffer.writeDoubleBE(double, 1);

        const result = encodeDouble(double);
        expect(result).toEqual(expectedBuffer);
    });
});

describe('decodeDouble', () => {
    // Test cases using test.each
    test.each([
        [
            Buffer.from([ 0x40, 0x09, 0x21, 0xFB, 0x54, 0x44, 0x2D, 0x18 ]), // Buffer for 3.14159
            0,  // Offset where the double starts in the buffer
            3.141592653589793  // Expected decoded result
        ],
        [
            Buffer.from([ 0x3F, 0xF0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 ]), // Buffer for 1.0
            0,  // Offset where the double starts in the buffer
            1.0  // Expected decoded result
        ],
        [
            Buffer.from([ 0xFF, 0xF0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 ]), // Buffer for -1.0
            0,  // Offset where the double starts in the buffer
            -Infinity  // Expected decoded result
        ],
        [
            Buffer.from([ 0x41, 0x32, 0xd6, 0x87, 0x1f, 0x9a, 0xdb, 0xb9 ]), // Buffer for 1234567.1234567
            0,  // Offset where the double starts in the buffer
            1234567.1234567  // Expected decoded result
        ],
        [
            Buffer.from([ 0x7F, 0xF0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 ]), // Buffer for Infinity
            0,  // Offset where the double starts in the buffer
            Infinity  // Expected decoded result
        ],
        [
            Buffer.from([ 0xFF, 0xF0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 ]), // Buffer for -Infinity
            0,  // Offset where the double starts in the buffer
            -Infinity  // Expected decoded result
        ]
    ])(
        'should correctly decode buffer=%p at offset=%p to expected result=%p',
        (buffer, offset, expectedResult) => {
            // Decode the double from the buffer
            const result = decodeDouble(buffer, offset);
            expect(result).toEqual(expectedResult);  // Verify the decoded result matches the expected value
        }
    );

    // Additional test case for non-zero offset
    test('should correctly decode double from non-zero offset', () => {
        const buffer = Buffer.from([
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,  // Padding bytes
            0x40, 0x09, 0x21, 0xFB, 0x54, 0x44, 0x2D, 0x18   // Double value (3.14159)
        ]);
        const offset = 8;  // Offset where the double starts in the buffer
        const expected = 3.141592653589793;

        const result = decodeDouble(buffer, offset);
        expect(result).toEqual(expected);
    });
});

describe('encodeNumber', () => {
    test.each([
        [
            42,
            encodeInteger(42)
        ],
        [
            123456789n,
            encodeInteger(123456789n)
        ],
        [
            3.14159,
            encodeDouble(3.14159)
        ],
        [
            0,
            encodeInteger(0)
        ],
        [
            -12345,
            encodeInteger(-12345)
        ],
        [
            1e10,
            encodeInteger(1e10)
        ],
        [
            Infinity,
            encodeDouble(Infinity)
        ],
        [
            -Infinity,
            encodeDouble(-Infinity)
        ],
        [
            NaN,
            encodeDouble(NaN) // Encoding NaN (floating-point)
        ]
    ])(
        'should correctly encode number=%p',
        (number, expectedBuffer) => {
            const result = encodeNumber(number);

            // Verify the result matches the expected buffer
            expect(result).toEqual(expectedBuffer);
        }
    );
});


describe('encodeDate', () => {
    test.each([
        // [date, expectedBuffer]
        [
            new Date('2024-12-18T00:00:00Z'),
            encodeDouble((new Date('2024-12-18T00:00:00Z').getTime() - new Date(REFERENCE_DATE).getTime()) / 1000, 0x3)
        ],
        [
            new Date('2001-01-01T00:00:01Z'),
            encodeDouble(1, 0x3)  // 1 second after REFERENCE_DATE
        ],
        [
            new Date(REFERENCE_DATE),
            encodeDouble(0, 0x3)  // Exactly at REFERENCE_DATE
        ],
        [
            new Date('1990-01-01T00:00:00Z'),
            encodeDouble((new Date('1990-01-01T00:00:00Z').getTime() - new Date(REFERENCE_DATE).getTime()) / 1000, 0x3)
        ],
        [
            new Date('2050-01-01T00:00:00Z'),
            encodeDouble((new Date('2050-01-01T00:00:00Z').getTime() - new Date(REFERENCE_DATE).getTime()) / 1000, 0x3)
        ]
    ])(
        'should correctly encode date=%p',
        (date, expectedBuffer) => {
            const result = encodeDate(date);
            expect(result).toEqual(expectedBuffer);  // Compare the result buffer to the expected buffer
        }
    );
});

describe('decodeDate', () => {
    test.each([
        // [encodedDate, expectedDecodedDate]
        [
            encodeDate(new Date('2024-12-18T00:00:00Z')),
            new Date('2024-12-18T00:00:00Z')  // Test exact date match
        ],
        [
            encodeDate(new Date('1970-01-01T00:00:01Z')),
            new Date('1970-01-01T00:00:01Z')  // 1 second after REFERENCE_DATE
        ],
        [
            encodeDate(new Date('1990-01-01T00:00:00Z')),
            new Date('1990-01-01T00:00:00Z')  // Date in the past
        ],
        [
            encodeDate(new Date('2050-01-01T00:00:00Z')),
            new Date('2050-01-01T00:00:00Z')  // Date in the future
        ]
    ])(
        'should correctly decode the encoded date and match the original date',
        (encodedBuffer, expectedDecodedDate) => {
            const result = decodeDate(encodedBuffer, 1);
            expect(result).toEqual(expectedDecodedDate);  // Compare the result date with the expected date
        }
    );

    test('should decode the reference date correctly', () => {
        const encodedBuffer = encodeDate(new Date(REFERENCE_DATE));
        const decodedDate = decodeDate(encodedBuffer);
        expect(decodedDate).toEqual(new Date(REFERENCE_DATE)); // Should decode back to the reference date
    });
});


describe('encodeUID', () => {
    test.each([
        // [uid, expectedBuffer]
        [
            Buffer.from([ 0x01, 0x02 ]), // Small UID (length <= 0xE)
            Buffer.concat([ Buffer.from([ 0x81 ]), Buffer.from([ 0x01, 0x02 ]) ])
        ],
        [
            Buffer.from([ 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F ]), // Small UID (length == 0xF)
            Buffer.concat([ Buffer.from([ 0x8e, 0x10, 0x0F ]), Buffer.from([ 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F ]) ])
        ],
        [
            Buffer.from([ 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F, 0x10 ]), // Large UID (length > 0xE)
            Buffer.concat([
                Buffer.from([ 0x8F ]),
                encodeInteger(16),
                Buffer.from([ 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F, 0x10 ])
            ])
        ]
    ])(
        'should correctly encode UID of length %p',
        (uid, expectedBuffer) => {
            const result = encodeUID(uid);
            expect(result).toEqual(expectedBuffer);  // Compare the result buffer with the expected buffer
        }
    );

    test('should throw RangeError for empty UID', () => {
        const uid = Buffer.from([]);
        expect(() => encodeUID(uid)).toThrow(RangeError);  // Expect a RangeError to be thrown
        expect(() => encodeUID(uid)).toThrow('Both type and info must be in the range 0-15.');
    });
});

describe('decodeUID', () => {
    test.each([
        // [encodedBuffer, expectedDecodedBuffer]
        [
            encodeUID(Buffer.from([ 0x01, 0x02 ])), // Small UID (length <= 0xE)
            Buffer.from([ 0x01, 0x02 ]), // Expected decoded UID
            0x2,
            1
        ],
        [
            encodeUID(Buffer.from([ 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F ])),
            Buffer.from([ 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F ]),
            0xE,
            3
        ],
        [
            encodeUID(Buffer.from([ 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E ])), // Large UID (length > 0xE)
            Buffer.from([ 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E ]),
            0xD,
            1
        ]
    ])(
        'should correctly decode the UID from the buffer',
        (encodedBuffer, expectedDecodedBuffer, info, offset) => {
            const result = decodeUID(encodedBuffer, info, offset);  // `info` is passed as 0xF for this case
            expect(result).toEqual(expectedDecodedBuffer);  // Compare the result buffer with the expected buffer
        }
    );

    // Edge case for UID with length 0 (empty buffer)
    test('should return an empty buffer for an empty UID', () => {
        const emptyBuffer = Buffer.from([ 0x80 ]);  // UID with no data, should have a size of 0
        const result = decodeUID(emptyBuffer, 0x0, 1);  // Expecting an empty buffer for length 0
        expect(result).toEqual(Buffer.from([])); // The result should be an empty buffer
    });

    // Edge case for invalid UID (buffer too small)
    test('should throw an error for invalid buffer size', () => {
        const invalidBuffer = Buffer.from([ 0x81, 0x01 ]); // Too small buffer to decode correctly
        expect(() => decodeUID(invalidBuffer, 0xF)).toThrow('The value of "offset" is out of range. It must be >= 0 and <= 0. Received 2'); // Expecting a RangeError
    });
});

describe('decodeUID', () => {
    test('should return an empty buffer for an empty UID', () => {
        const emptyBuffer = Buffer.from([ 0x81 ]);  // UID with no data, should have a size of 0
        const result = decodeUID(emptyBuffer, 0x0, 1);  // Expecting an empty buffer for length 0
        expect(result).toEqual(Buffer.from([])); // The result should be an empty buffer
    });

    // Edge case for invalid buffer size (buffer too small)
    test('should throw an error for invalid buffer size', () => {
        const invalidBuffer = Buffer.from([ 0x81, 0x01 ]); // Too small buffer to decode correctly
        expect(() => decodeUID(invalidBuffer, 0xF, 1)).toThrow('The value of "offset" is out of range. It must be >= 0 and <= 1. Received 3'); // Expecting a RangeError
    });
});

describe('encodeBuffer', () => {
    test.each([
        // [data, type, bytesSize, expectedEncodedBuffer]
        [
            Buffer.from([ 0x01, 0x02 ]), // Small buffer (length <= 0xE)
            0x4,  // Default type
            0x1,  // Default bytesSize
            Buffer.from([ 0x42, 0x01, 0x02 ])  // Encoded buffer (header + data)
        ],
        [
            Buffer.from([ 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F, 0x10 ]), // Large buffer (length > 0xE)
            0x4,  // Default type
            0x1,  // Default bytesSize
            Buffer.concat([
                Buffer.from([ 0x4F ]),
                encodeInteger(16),
                Buffer.from([ 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F, 0x10 ])
            ])  // Encoded buffer (header + encoded length + data)
        ],
        [
            Buffer.from([ 0x01, 0x02, 0x03 ]),  // Small buffer with custom bytesSize
            0x4,  // Default type
            0x2,  // Custom bytesSize
            Buffer.from([ 0x41, 0x01, 0x02, 0x03 ]) // Encoded buffer with custom bytesSize
        ],
        [
            Buffer.from([]),  // Empty buffer
            0x4,  // Default type
            0x1,  // Default bytesSize
            Buffer.from([ 0x40 ]) // Encoded buffer with just the header for an empty buffer
        ]
    ])(
        'should correctly encode the buffer (type: %p, bytesSize: %p)',
        (data, type, bytesSize, expectedEncodedBuffer) => {
            const result = encodeBuffer(data, type, bytesSize);
            expect(result).toEqual(expectedEncodedBuffer);
        }
    );
});

describe('decodeBuffer', () => {
    test.each([
        // [encodedBuffer, info, offset, bytesSize, expectedDecodedBuffer]
        [
            encodeBuffer(Buffer.from([ 0x01, 0x02 ])), // Small buffer (length <= 0xE)
            0x2,  // Info
            1,    // Offset
            0x1,  // Default bytesSize
            Buffer.from([ 0x01, 0x02 ])  // Expected decoded buffer
        ],
        [
            encodeBuffer(Buffer.from([ 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F, 0x10 ])), // Large buffer (length > 0xE)
            0xF,  // Info
            1,    // Offset
            0x1,  // Default bytesSize
            Buffer.from([ 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F, 0x10 ])  // Expected decoded buffer
        ],
        [
            encodeBuffer(Buffer.from([ 0x01, 0x02, 0x03 ])),  // Small buffer with custom bytesSize
            0x3,  // Info (2 bytes per element)
            1,    // Offset
            0x1,  // Custom bytesSize
            Buffer.from([ 0x01, 0x02, 0x03 ]) // Expected decoded buffer with custom bytesSize
        ],
        [
            encodeBuffer(Buffer.from([])),  // Empty buffer
            0x0,  // Info (no data)
            0,    // Offset
            0x1,  // Default bytesSize
            Buffer.from([])  // Expected decoded buffer (empty)
        ]
    ])(
        'should correctly decode the buffer with info %p, offset %p, bytesSize %p',
        (encodedBuffer, info, offset, bytesSize, expectedDecodedBuffer) => {
            const result = decodeBuffer(encodedBuffer, info, offset, bytesSize);
            expect(result).toEqual(expectedDecodedBuffer);  // Check if the decoded buffer matches the expected result
        }
    );
});


describe('encodeAscii', () => {
    test.each([
        // [inputString, expectedEncodedBuffer]
        [
            'Hello',  // Normal ASCII string
            Buffer.from([ 0x55, ...Buffer.from('Hello', 'ascii') ])
        ],
        [
            '',  // Empty string
            Buffer.from([ 0x50 ])  // Expected encoded buffer with just the header for an empty string
        ],
        [
            'Special!@#$',  // String with special ASCII characters
            Buffer.from([ 0x5B, ...Buffer.from('Special!@#$', 'ascii') ])
        ]
    ])(
        'should correctly encode ASCII string: "%s"',
        (inputString, expectedEncodedBuffer) => {
            const result = encodeAscii(inputString);
            expect(result).toEqual(expectedEncodedBuffer);  // Check if the encoded buffer matches the expected result
        }
    );
});

describe('decodeAscii', () => {
    test.each([
        // [encodedBuffer, info, offset, expectedDecodedString]
        [
            encodeBuffer(Buffer.from('Hello', 'ascii'), 0x5), // Normal ASCII string
            0x5,   // Info
            'Hello' // Expected decoded string
        ],
        [
            encodeBuffer(Buffer.from('', 'ascii'), 0x5), // Empty string
            0x5,   // Info
            ''      // Expected decoded string (empty string)
        ],
        [
            encodeBuffer(Buffer.from('Special!@#$', 'ascii'), 0x5), // String with special ASCII characters
            0xb,   // Info
            'Special!@#$' // Expected decoded string
        ],
        [
            encodeBuffer(Buffer.from('Hello World', 'ascii'), 0x5), // Normal ASCII string with spaces
            0xb,   // Info
            'Hello World' // Expected decoded string
        ],
        [
            encodeBuffer(Buffer.from([ 0x48, 0x65, 0x6C, 0x6C, 0x6F ]), 0x5), // Buffer with ASCII values directly
            0x5,   // Info
            'Hello' // Expected decoded string
        ]
    ])(
        'should correctly decode the ASCII data with info %p, offset %p',
        (encodedBuffer, info, expectedDecodedString) => {
            const result = decodeAscii(encodedBuffer, info, 1);
            expect(result).toEqual(expectedDecodedString);  // Check if the decoded string matches the expected result
        }
    );

    // Edge case for invalid ASCII data (non-ASCII characters)
    test('should decode buffer with invalid ASCII data', () => {
        const buffer = Buffer.from([ 0xFF, 0xFE, 0xFD ]);  // Invalid ASCII values (non-printable)
        const result = decodeAscii(buffer, 0x5);
        expect(result).toEqual('\uFFFD\uFFFD\uFFFD');  // Invalid ASCII characters will be replaced with replacement character
    });
});

describe('encodeUtf16BE', () => {
    test.each([
        // [inputString, expectedEncodedBuffer]
        [
            'Hello',  // Normal UTF-16 string
            Buffer.from([ 0x00, 0x48, 0x00, 0x65, 0x00, 0x6C, 0x00, 0x6C, 0x00, 0x6F ]) // Expected UTF-16 Big Endian encoded buffer
        ],
        [
            '',  // Empty string
            Buffer.from([]) // Expected encoded buffer for an empty string with header
        ],
        [
            '𐍈',  // String with surrogate pair (UTF-16 character outside BMP)
            Buffer.from([ 0xD8, 0x0, 0xDF, 0x48 ]) // Expected UTF-16 Big Endian encoded surrogate pair
        ]
    ])(
        'should correctly encode UTF-16 string: "%s"',
        (inputString, expectedEncodedBuffer) => {
            const result = encodeUtf16BE(inputString).subarray(1);
            expect(result).toEqual(expectedEncodedBuffer);  // Check if the encoded buffer matches the expected result
        }
    );
});

describe('decodeUtf16BE', () => {
    test.each([
        // [encodedBuffer, info, offset, expectedDecodedString]
        [
            Buffer.from([ 0x00, 0x48, 0x00, 0x65, 0x00, 0x6c, 0x00, 0x6c, 0x00, 0x6f ]), // Normal UTF-16 Big Endian encoded buffer
            0x5,  // Info
            'Hello' // Expected decoded string
        ],
        [
            Buffer.from([ 0x60 ]), // Empty string encoded buffer (with just the header)
            0x0,  // Info
            ''     // Expected decoded string (empty string)
        ],
        [
            Buffer.from([ 0xd8, 0x00, 0xdf, 0x48 ]), // UTF-16 Big Endian encoded surrogate pair
            0x2,  // Info
            '𐍈'  // Expected decoded string (surrogate pair)
        ]
    ])(
        'should correctly decode the UTF-16 Big Endian data with info %p, offset %p',
        (encodedBuffer, info, expectedDecodedString) => {
            const result = decodeUtf16BE(encodedBuffer, info, 0);
            expect(result).toEqual(expectedDecodedString);  // Check if the decoded string matches the expected result
        }
    );

    // Edge case for invalid UTF-16 data (invalid byte sequence)
    test('should decode buffer with invalid UTF-16 data', () => {
        const buffer = Buffer.from([ 0xff, 0xfd, 0xff, 0xfd, 0xff, 0xfd ]);  // Invalid UTF-16 data
        const result = decodeUtf16BE(buffer, 0x3);
        expect(result).toEqual('\uFFFD\uFFFD\uFFFD');  // Invalid characters will be replaced with replacement character
    });
});

describe('encodeObjects', () => {
    test.each([
        // [length, type, offsets, size, expectedEncodedBuffer]
        [
            5,                    // length
            0x1,                  // type
            [ 0, 1, 2, 3, 4 ],      // offsets
            2,                    // size (byte size of each offset)
            Buffer.from([ 0x15, 0x00, 0x00, 0x00, 0x01, 0x00, 0x02, 0x00, 0x03, 0x00, 0x04 ])  // expected encoded buffer
        ],
        [
            15,                   // length
            0x2,                  // type
            [ 10, 20, 30, 40 ],     // offsets
            4,                    // size (byte size of each offset)
            Buffer.from([ 0x2f, 0x10, 0x0f, 0x00, 0x00, 0x00, 0x0a, 0x00, 0x00, 0x00, 0x14, 0x00, 0x00, 0x00, 0x1e, 0x00, 0x00, 0x00, 0x28 ]) // expected encoded buffer
        ],
        [
            16,                   // length (greater than 0xE)
            0x3,                  // type
            [ 100, 200, 300 ],      // offsets
            8,                    // size (byte size of each offset)
            // eslint-disable-next-line max-len
            Buffer.from([ 0x3f, 0x10, 0x10, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x64, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xc8, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x2c ]) // expected encoded buffer (with length encoding)
        ],
        [
            10,                   // length (<= 0xE)
            0x4,                  // type
            [ 500, 1000 ],          // offsets
            4,                    // size (byte size of each offset)
            Buffer.from([ 0x4a, 0x00, 0x00, 0x01, 0xf4, 0x00, 0x00, 0x03, 0xe8 ]) // expected encoded buffer (without length encoding)
        ]
    ])(
        'should correctly encode objects with length %p, type %p, offsets %p, size %p',
        (length, type, offsets, size, expectedEncodedBuffer) => {
            const result = encodeObjects(length, type, offsets, size);
            expect(result).toEqual(expectedEncodedBuffer);  // Check if the encoded buffer matches the expected result
        }
    );

    // Edge case with empty offsets
    test('should handle empty offsets array', () => {
        const length = 0;
        const type = 0x5;
        const offsets: any = [];
        const size = 2;
        const expectedBuffer = Buffer.from([ 0x50 ]);  // Assuming header only
        const result = encodeObjects(length, type, <any> offsets, size);
        expect(result).toEqual(expectedBuffer);
    });
});
