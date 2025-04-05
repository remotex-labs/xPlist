/**
 * Represents the possible byte lengths for integer values
 *
 * @remarks
 * This type represents the standard byte sizes used for integer representation in computer systems.
 * - 1 byte (8 bits): Can represent values from 0 to 255 (unsigned)
 * - 2 bytes (16 bits): Can represent values from 0 to 65,535 (unsigned)
 * - 4 bytes (32 bits): Can represent values from 0 to 4,294,967,295 (unsigned)
 * - 8 bytes (64 bits): Can represent values from 0 to 9,223,372,036,854,775,807 (unsigned)
 * - 16 bytes (128 bits): Can represent very large integers
 *
 * @example
 * ```ts
* function allocateBuffer(size: number, byteLength: IntegerByteLengthType): Buffer {
*   // Create a buffer with the appropriate byte length for each integer
*   return Buffer.alloc(size * byteLength);
* }
* ```
 *
 * @since 1.0.1
 */

export type IntegerByteLengthType = 1 | 2 | 4 | 8 | 16;
