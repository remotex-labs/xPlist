/**
 * Reference tracking system for binary property list decoding
 *
 * @remarks
 * This interface defines the structure used to track object references and
 * offset information during binary property list (bplist) decoding. It maintains
 * the state needed throughout the decoding process to:
 *
 * - Cache decoded objects to prevent duplicate parsing of the same object
 * - Track the byte size of offset references in the binary format
 *
 * During the decoding process, this structure is populated as objects are
 * decoded from the binary data. The reference map grows with each decoded
 * object, allowing efficient lookup when the same object is referenced
 * multiple times within the property list.
 *
 * The offset size is determined from the binary header information and helps
 * correctly parse object offset locations in the file.
 *
 * @example
 * ```ts
 * // Initialize decoding reference tracking
 * const refTracker: DecodeObjectRefInterface = {
 *   map: new Map(),
 *   offsetSize: 2 // From binary header information
 * };
 *
 * // As objects are decoded, they're stored in the map
 * const decodedObject = decodeObject(buffer, objectOffset);
 * refTracker.map.set(objectId, decodedObject);
 *
 * // Later, references to the same object can be resolved from the map
 * const objectReference = getObjectReference(buffer, referenceOffset);
 * const referencedObject = refTracker.map.get(objectReference);
 * ```
 *
 * @since 1.0.1
 */

export interface DecodeObjectRefInterface {
    map: Map<number, unknown>;
    offsetSize: number;
}

/**
 * Reference tracking system for binary property list encoding
 *
 * @remarks
 * This interface defines the structure used to track object references, offsets,
 * and metadata during binary property list (bplist) encoding. It maintains the
 * state needed throughout the encoding process to:
 *
 * - Track unique objects to prevent duplicate encoding
 * - Calculate and store offset positions for each encoded object
 * - Determine appropriate byte sizes for references and offsets
 * - Manage the overall binary structure and layout
 *
 * During the encoding process, this structure is continuously updated as objects
 * are processed. The reference map grows with each unique object, offsets are
 * incremented as bytes are written, and size parameters are adjusted based on
 * the total number of objects.
 *
 * @example
 * ```ts
 * // Initialize encoding reference tracking
 * const refTracker: EncodeObjectRefInterface = {
 *   map: new Map(),
 *   offset: 8, // Starting after header
 *   objectReferenceSize: 1,
 *   numberOfObjects: 0,
 *   offsetTableOffset: 0,
 *   offsetTableOffsetSize: 1
 * };
 *
 * // As objects are encoded, the structure is updated
 * refTracker.map.set(someObject, refTracker.numberOfObjects++);
 * refTracker.offset += bytesWritten;
 *
 * // Reference and offset sizes are adjusted based on total counts
 * if (refTracker.numberOfObjects > 255) {
 *   refTracker.objectReferenceSize = 2;
 * }
 * ```
 *
 * @since 1.0.1
 */

export interface EncodeObjectRefInterface {
    map: Map<unknown, number>;
    offset: number;
    numberOfObjects: number;
    offsetTableOffset: number;
    objectReferenceSize: number;
    offsetTableOffsetSize: number;
}
