/**
 * Imports
 */

import { BinaryParsingError } from '@errors/binary.error';
import { CreateUID, decodeType, encodeType } from '@services/binary.service';

/**
 * Tests
 */

describe('encodeType', () => {
    test('except to get null byte', () => {
        expect(encodeType(null, <any> {})[0]).toBe(0);
    });

    test('except to get true byte', () => {
        expect(encodeType(true, <any> {})[0]).toBe(9);
    });

    test('except to get false byte', () => {
        expect(encodeType(false, <any> {})[0]).toBe(8);
    });

    test.each([
        [ 1, Buffer.from([ 0x10, 0x01 ]), 2 ],
        [ 0xFF, Buffer.from([ 0x10, 0xFF ]), 2 ],
        [ 0x100, Buffer.from([ 0x11, 0x01, 0x00 ]), 3 ],
        [ 0xFFFF, Buffer.from([ 0x11, 0xFF, 0xFF ]), 3 ],
        [ 0x10000, Buffer.from([ 0x12, 0x00, 0x01, 0x00, 0x00 ]), 5 ],
        [ 0xFFFFFF, Buffer.from([ 0x12, 0x00, 0xFF, 0xFF, 0xFF ]), 5 ],
        [ 0x1000000, Buffer.from([ 0x12, 0x01, 0x00, 0x00, 0x00 ]), 5 ],
        [ 0xFFFFFFFF, Buffer.from([ 0x12, 0xFF, 0xFF, 0xFF, 0xFF ]), 5 ],
        [ -1, Buffer.from([ 0x13, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF ]), 9 ],
        [ 0x100000000, Buffer.from([ 0x13, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00 ]), 9 ],
        [ 1.456, Buffer.from([ 0x23, 0x3F, 0xF7, 0x4B, 0xC6, 0xA7, 0xEF, 0x9D, 0xB2 ]), 9 ],
        [ -1.456, Buffer.from([ 0x23, 0xBF, 0xF7, 0x4B, 0xC6, 0xA7, 0xEF, 0x9D, 0xB2 ]), 9 ],
        [ 1.123456789101112, Buffer.from([ 0x23, 0x3F, 0xF1, 0xF9, 0xAD, 0xD3, 0x7A, 0x88, 0xFE ]), 9 ],
        [ -1.123456789101112, Buffer.from([ 0x23, 0xBF, 0xF1, 0xF9, 0xAD, 0xD3, 0x7A, 0x88, 0xFE ]), 9 ],
        [ 0xFFFFFFFFFFFFFFFFn,
            Buffer.from(
                [ 0x14, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF ]
            ), 17
        ]
    ])('%# except integer(%d) encode as %o', (number: unknown, encodeBuffer: Buffer, length: number) => {
        const encoded = <Buffer> encodeType(number, <any> {});

        expect(encoded).toEqual(encodeBuffer);
        expect(encoded.length).toBe(length);
    });

    test('expect Date object bytes', () => {
        const data = new Date('2024-12-16 20:36:38Z');
        const encoded = <Buffer> encodeType(data, <any> {});

        expect(encoded).toEqual(Buffer.from([ 0x33, 0x41, 0xC6, 0x88, 0x63, 0x6B, 0x00, 0x00, 0x00 ]));
        expect(encoded.length).toBe(9);
    });

    test.each([
        [ Buffer.from([ 0x41 ]), Buffer.from([ 0x41, 0x41 ]), 2 ],
        [ CreateUID(1234), Buffer.from([ 0x81, 0x4, 0xD2 ]), 3 ],
        [ Buffer.from([ 0x41, 0x42, 0x43 ]), Buffer.from([ 0x43, 0x41, 0x42, 0x43 ]), 4 ],
        [
            Buffer.from([ 0x41, 0x42, 0x43, 0x44, 0x45, 0x41, 0x42, 0x43, 0x44, 0x45, 0x41, 0x42, 0x43, 0x44, 0x45 ]),
            Buffer.from([ 0x4F, 0x10, 0x0f, 0x41, 0x42, 0x43, 0x44, 0x45, 0x41, 0x42, 0x43, 0x44, 0x45, 0x41, 0x42, 0x43, 0x44, 0x45 ]),
            18
        ]
    ])('%# except Buffer(%o) encode as %o', (buffer: Buffer, encodeBuffer: Buffer, length: number) => {
        const encoded = <Buffer> encodeType(buffer, <any> {});

        expect(encoded).toEqual(encodeBuffer);
        expect(encoded.length).toBe(length);
    });

    test.each([
        [ 'ϿϾ', Buffer.from([ 0x62, 0x03, 0xFF, 0x03, 0xFE ]), 5 ],
        [ 'test', Buffer.from([ 0x54, 0x74, 0x65, 0x73, 0x74 ]), 5 ],
        [
            'testtesttesttest',
            Buffer.from([
                0x5F, 0x10, 0x10, 0x74, 0x65, 0x73, 0x74,
                0x74, 0x65, 0x73, 0x74, 0x74, 0x65, 0x73, 0x74, 0x74, 0x65, 0x73, 0x74
            ]),
            19
        ],
        [
            'ϿϾϿϾϿϾϿϾϿϾϿϾϿϾϿϾϿϾ',
            Buffer.from([
                0x6F, 0x10, 0x12, 0x03, 0xFF, 0x03, 0xFE,
                0x03, 0xFF, 0x03, 0xFE, 0x03, 0xFF, 0x03, 0xFE, 0x03, 0xFF, 0x03, 0xFE,
                0x03, 0xFF, 0x03, 0xFE, 0x03, 0xFF, 0x03, 0xFE, 0x03, 0xFF, 0x03, 0xFE,
                0x03, 0xFF, 0x03, 0xFE, 0x03, 0xFF, 0x03, 0xFE
            ]),
            39
        ]
    ])('%# except %s encode as %o', (string: string, encodeBuffer: Buffer, length: number) => {
        const encoded = <Buffer> encodeType(string, <any> {});

        expect(encoded).toEqual(encodeBuffer);
        expect(encoded.length).toBe(length);
    });
});

describe('decodeType', () => {
    test.each([
        [ Buffer.from([ 0x00 ]), null ], // Decoding null (0x00 type, 0x00 info)
        [ Buffer.from([ 0x09 ]), true ], // Decoding true (0x00 type, 0x09 info)
        [ Buffer.from([ 0x08 ]), false ], // Decoding false (0x00 type, 0x08 info)
        [ Buffer.from([ 0x0F ]), undefined ] // Decoding undefined (0x00 type, 0xFF info)
    ])('should decode %s correctly', (buffer, expected) => {
        expect(decodeType(buffer, 0, [], <any> {})).toBe(expected);
    });

    test('should throw an error for unsupported types', () => {
        const buffer = Buffer.from([ 0xFF, 0x01 ]); // Unsupported type 0xFF
        expect(() => decodeType(buffer, 0, [], <any> {})).toThrow(BinaryParsingError);
        expect(() => decodeType(buffer, 0, [], <any> {})).toThrow('Unsupported type');
    });
});
