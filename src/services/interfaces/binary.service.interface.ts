export interface DecodeObjectRefInterface {
    map: Map<number, unknown>;
    offsetSize: number;
}

/**
 * Represents the reference and metadata tracking information used during binary encoding.
 *
 * This interface is used to manage and track various aspects of the binary encoding process, including
 * object references, offsets, and metadata required for constructing binary property lists (bplist).
 *
 * - **Properties**:
 *   - `map`: A `Map` that associates objects with their corresponding reference indices.
 *   - `offset`: The current offset position within the binary data.
 *   - `objectReferenceSize`: The size (in bytes) used for referencing objects in the binary structure.
 *   - `numberOfObjects`: The total number of objects being encoded.
 *   - `offsetTableOffset`: The cumulative offset where the offset table begins in the binary data.
 *   - `offsetTableOffsetSize`: The size (in bytes) used to represent offsets within the offset table.
 *
 * ## Example:
 * ```ts
 * const encodeInfo: EncodeObjectRefInterface = {
 *   map: new Map(),
 *   offset: 1,
 *   objectReferenceSize: 2,
 *   numberOfObjects: 0,
 *   offsetTableOffset: 0,
 *   offsetTableOffsetSize: 0
 * };
 * ```
 *
 * ## Usage Notes:
 * - The `map` property is used to track and avoid duplicate encoding of objects by associating them
 *   with a unique reference index.
 * - The `offset` property is incremented as objects are encoded, ensuring proper positioning within
 *   the binary data.
 * - The `objectReferenceSize` is dynamically calculated based on the total number of objects, ensuring
 *   efficient encoding.
 * - The `offsetTableOffsetSize` is determined based on the largest offset value in the offset table.
 *
 * @property map - A `Map` linking objects to their reference indices for efficient lookups.
 * @property offset - The current offset within the binary data during encoding.
 * @property objectReferenceSize - The byte size used for object references in the binary structure.
 * @property numberOfObjects - The total count of objects being encoded.
 * @property offsetTableOffset - The starting offset for the offset table within the binary data.
 * @property offsetTableOffsetSize - The byte size used for offsets in the offset table.
 */

export interface EncodeObjectRefInterface {
    map: Map<unknown, number>;
    offset: number;
    numberOfObjects: number;
    offsetTableOffset: number;
    objectReferenceSize: number;
    offsetTableOffsetSize: number;
}
