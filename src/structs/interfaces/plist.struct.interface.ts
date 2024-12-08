/**
 * The `RawNodeInterface` represents a raw node extracted from a string (e.g., XML or plist data). It contains
 * information about the tag, the raw string associated with the node, and its position within the data.
 *
 * This interface is useful for handling and processing raw nodes while parsing structured data, allowing you to
 * retrieve the tag name, raw content, and the positions within the input string.
 *
 * - **Properties**:
 *   - `tag`: The name of the tag associated with the node (e.g., "key", "value").
 *   - `raw`: The raw string representation of the node, including both the start and end tags.
 *   - `index`: The index in the input string where the tag appears.
 *   - `offset`: The position in the input string where the node's content begins.
 *
 * ## Example:
 * ```ts
 * const node: RawNodeInterface = {
 *    tag: 'tag',
 *    raw: '</tag>',
 *    index: 17,
 *    offset: 0
 * };
 * ```
 */

export interface RawNodeInterface {
    tag: string;
    raw: string;
    index: number;
    offset: number;
}
