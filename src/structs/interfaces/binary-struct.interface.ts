/**
 * Represents the structure of a Binary Property List (bplist) trailer
 *
 * @property reserved - An array of reserved bytes for padding or future use, typically an array of five zeros
 * @property sortVersion - The version of the sorting algorithm used in the bplist
 * @property offsetTableOffsetSize - The size, in bytes, of each offset table entry
 * @property objectReferenceSize - The size, in bytes, of object references used in the bplist
 * @property numberOfObjects - The total number of objects in the bplist
 * @property rootObjectOffset - The offset of the root object in the offset table
 * @property offsetTableOffset - The starting offset of the offset table in the bplist
 *
 * @example
 * ```ts
 * const trailer: TrailerInterface = {
 *     reserved: [0, 0, 0, 0, 0],
 *     sortVersion: 1,
 *     offsetTableOffsetSize: 2,
 *     objectReferenceSize: 2,
 *     numberOfObjects: 123n,
 *     rootObjectOffset: 15n,
 *     offsetTableOffset: 789n
 * };
 * ```
 *
 * @since 1.0.1
 */

export interface TrailerInterface {
    reserved?: Array<number>;
    sortVersion?: number;
    numberOfObjects: bigint;
    rootObjectOffset: bigint;
    offsetTableOffset: bigint;
    objectReferenceSize: number;
    offsetTableOffsetSize: number;
}

/**
 * Represents the structure of a Binary Property List (bplist) header
 *
 * @property magic - A string that identifies the file as a Binary Property List, typically "bplist"
 * @property version - A string that specifies the version of the bplist format (e.g., "00" or "01")
 *
 * @example
 * ```ts
 * const header: HeaderInterface = {
 *     magic: "bplist",
 *     version: "00"
 * };
 * ```
 *
 * @since 1.0.1
 */

export interface HeaderInterface {
    magic: string,
    version: string
}

/**
 * Defines the structure for a type header used for encoding or decoding data
 *
 * @property type - A number representing the type of the encoded data (e.g., string, number, buffer)
 * @property info - A number representing additional metadata or information related to the type, such as size or encoding options
 *
 * @example
 * ```ts
 * const header: TypeHeaderInterface = {
 *   type: 0x1, // Type for integers
 *   info: 0x3  // Information about the integer encoding or size
 * };
 * ```
 *
 * @since 1.0.1
 */

export interface TypeHeaderInterface {
    type: number;
    info: number;
}
