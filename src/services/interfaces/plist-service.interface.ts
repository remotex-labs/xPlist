/**
 * Represents an array type in a property list
 *
 * @remarks
 * This type alias defines the structure for arrays in a property list (plist).
 * A property list array can contain elements of any valid plist type, including
 * strings, numbers, booleans, dates, data (binary buffers), dictionaries, or
 * other arrays.
 *
 * In the context of a property list, arrays are ordered collections that maintain
 * the sequence of their elements. When encoded in XML or binary format, this
 * ordering is preserved.
 *
 * The `unknown` element type is used because property list arrays are heterogeneous
 * by nature - they can contain elements of different types within the same array.
 * During runtime, these elements will be properly typed as strings, numbers,
 * booleans, Date objects, Buffer objects, dictionaries, or nested arrays.
 *
 * @since 1.0.1
 */

export type PlistArrayType = Array<unknown>;

/**
 * Type representing a Property List object with string keys and unknown values
 *
 * @since 1.0.1
 */

export type PlistObjectType = { [key: string]: unknown };

/**
 * Type representing either a Property List array or a Property List object
 *
 * @since 1.0.1
 */

export type PlistObjectsType = PlistArrayType | PlistObjectType

/**
 * Interface representing a node in a Property List structure
 *
 * @property tag - The tag name of the node
 * @property content - The content of the node, which can be either a PlistArrayType or PlistObjectType
 *
 * @since 1.0.1
 */

export interface PlistNodeInterface {
    tag: string,
    content: PlistObjectsType,
}
