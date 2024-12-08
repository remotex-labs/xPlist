/**
 * The `TrailerInterface` represents the structure of a Binary Property List (bplist) trailer.
 * The trailer is used in bplist files to store metadata about the objects, offsets, and sizes
 * necessary to decode the serialized data.
 *
 * - **Properties**:
 *   - `reserved`: An array of reserved bytes for padding or future use.
 *   - `sortVersion`: A `number` representing the version of the sorting algorithm used in the bplist.
 *   - `offsetTableOffsetSize`: A `number` indicating the size, in bytes, of each offset table entry.
 *   - `objectReferenceSize`: A `number` indicating the size, in bytes, of object references used in the bplist.
 *   - `numberOfObjects`: A `bigint` representing the total number of objects in the bplist.
 *   - `rootObjectOffset`: A `bigint` indicating the offset of the root object in the offset table.
 *   - `offsetTableOffset`: A `bigint` specifying the starting offset of the offset table in the bplist.
 *
 * ## Example:
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
 * console.log(trailer);
 * ```
 *
 * ## Notes:
 * - The `reserved` field is typically an array of five `0`s, though it may vary depending on implementation.
 * - The `sortVersion`, `offsetTableOffsetSize`, and `objectReferenceSize` fields provide essential metadata about the structure of the bplist file.
 * - The `numberOfObjects`, `rootObjectOffset`, and `offsetTableOffset` are encoded as `bigint` to accommodate large numbers.
 *
 * @interface
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
 * The `BplistHeader` interface represents the structure of a Binary Property List (bplist) header.
 * The header contains metadata that identifies the file format and specifies the version of the bplist.
 *
 * - **Properties**:
 *   - `magic`: A string that identifies the file as a Binary Property List. Typically, this value is `bplist`.
 *   - `version`: A string that specifies the version of the bplist format. Common versions include `00` or `01`.
 *
 * ## Example:
 * ```ts
 * const header: BplistHeader = {
 *     magic: "bplist",
 *     version: "00"
 * };
 * console.log(`Magic: ${header.magic}, Version: ${header.version}`);
 * ```
 *
 * ## Notes:
 * - The `magic` field is used to validate that the file is indeed a Binary Property List.
 * - The `version` field ensures compatibility with the specific serialization and deserialization logic for the bplist version.
 * - Both fields are mandatory for parsing and interpreting the bplist file correctly.
 *
 * @interface
 */

export interface HeaderInterface {
    magic: string,
    version: string
}

/**
 * The `TypeHeaderInterface` defines the structure for a type header, which consists of a `type` and `info` value.
 * It is used for encoding or decoding data where a specific type identifier (`type`) is paired with additional
 * metadata or size information (`info`).
 *
 * - **Properties**:
 *   - `type`: A number representing the type of the encoded data (e.g., string, number, buffer, etc.).
 *   - `info`: A number representing additional metadata or information related to the `type`, such as size or encoding options.
 *
 * ## Example:
 * ```ts
 * const header: TypeHeaderInterface = {
 *   type: 0x1, // Type for integers
 *   info: 0x3  // Information about the integer encoding or size
 * };
 *
 * console.log(header.type); // 1
 * console.log(header.info); // 3
 * ```
 *
 * ## Notes:
 * - The `type` and `info` fields are typically used together to specify the kind of data being encoded or decoded
 *   and any additional details necessary for processing the data correctly.
 *
 * @interface TypeHeaderInterface
 * @property {number} type - The type of the data being encoded/decoded.
 * @property {number} info - Additional metadata or size information for the data.
 */

export interface TypeHeaderInterface {
    type: number;
    info: number;
}
