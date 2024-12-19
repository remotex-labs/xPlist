/**
 * Import will remove at compile time
 */

import type {
    PlistArrayType,
    PlistObjectType,
    PlistObjectsType,
    PlistNodeInterfaces
} from '@services/interfaces/plist.service.interface';

/**
 * Imports
 */

import { XMLParsingError } from '@errors/xml.error';
import { decodePrimitive, decodeTag, encodeValue } from '@structs/plist.struct';

/**
 * The `objectTags` constant is an array of strings representing XML or plist tags
 * that correspond to complex data structures, such as objects or arrays.
 *
 * ## Note
 * > `Array.prototype.includes` has linear time complexity O(n), where nn is the size of the array.
 * > A `Set` has constant time complexity O(1) for lookups.
 */

const objectTags = new Set([ 'dict', 'array' ]);

/**
 * The `decodePlistContent` function extracts the content inside `<plist>` tags from a given plist string. It first
 * removes any unnecessary whitespace between tags and then searches for the `<plist>` tags to capture the content
 * between them. If the `<plist>` tags are not found or the XML is malformed, the function throws an `XMLParsingError`.
 *
 * This function is useful for parsing plist data by isolating the content within the `<plist>` tags, which is often
 * the main structure in a plist file.
 *
 * - **Input**:
 *   - `plist`: A string representing a plist XML structure. The string is expected to contain `<plist>` tags around
 *     the actual content.
 *
 * - **Output**:
 *   - A string containing the content found between the `<plist>` tags.
 *
 * ## Example:
 * ```ts
 * const plistString = `
 *   <plist version="1.0">
 *     <dict>
 *       <key>Name</key>
 *       <string>John Doe</string>
 *     </dict>
 *   </plist>
 * `;
 * const content = decodePlistContent(plistString);
 * console.log(content); // '<dict><key>Name</key><string>John Doe</string></dict>'
 * ```
 *
 * ## Error Handling:
 * - If the input string does not contain valid `<plist>` tags or the XML is malformed, the function throws an
 *   `XMLParsingError` with the message:
 *   ```ts
 *   throw new XMLParsingError('Invalid plist: <plist> tags not found or malformed XML');
 *   ```
 * - The function trims any extra spaces between tags before performing the extraction.
 *
 * @param plist - The string containing the plist XML data.
 * @returns A string containing the content inside the `<plist>` tags.
 * @throws {XMLParsingError} Throws an `XMLParsingError` if the `<plist>` tags are not found or the XML is malformed.
 */

export function decodePlistContent(plist: string): string {
    plist = plist.replace(/>\s+</g, '><').trim();
    const regex = /<plist[^>]*>(.*?)<\/plist>/s;
    const match = plist.match(regex);
    if (!match)
        throw new XMLParsingError('Invalid plist: <plist> tags not found or malformed XML');

    return match[1];
}

/**
 * The `createNode` function creates a new node with the specified tag.
 * If the tag is `'dict'`, the node will have
 * an empty object as its content.
 * For other tags, the content will be an empty array.
 * This function is useful for
 * generating nodes that can later be populated with data, such as for building a plist structure.
 *
 * - **Input**:
 *   - `tag`: The name of the tag for the node.
 *   This determines the type of the content.
 *
 * - **Output**:
 *   - A `PlistNodeInterfaces` object representing the created node, with a `tag` and an appropriate `content` based
 *     on the tag type (`{}` for `'dict'`, `[]` for other tags).
 *
 * ## Example:
 * ```ts
 * const dictNode = createNode('dict');
 * console.log(dictNode); // { tag: 'dict', content: {} }
 *
 * const arrayNode = createNode('array');
 * console.log(arrayNode); // { tag: 'array', content: [] }
 * ```
 *
 * ## Notes:
 * - This function is commonly used for dynamically creating nodes that will later be populated with values,
 *   especially in the context of processing plist data.
 *
 * @param tag - The tag name for the node.
 * @returns A new node with the specified tag and an appropriate content type.
 */

export function createNode(tag: string): PlistNodeInterfaces {
    return {
        tag,
        content: tag === 'dict' ? {} : []
    };
}

/**
 * The `pushToObject` function adds a value to the `content` of the current node. The `content` can either be an array or
 * an object, depending on the tag of the node. If the `content` is an array, the function pushes the value to it. If
 * the `content` is an object, the function assigns the value to a key within the object. If the `content` type is neither
 * an array nor an object, an error is thrown.
 *
 * - **Input**:
 *   - `value`: The value to be added to the `content` of the node. This can be any type.
 *   - `current`: The current node (of type `PlistNodeInterfaces`) to which the value will be added.
 *   - `key`: An optional key used to assign the value when the `content` is an object. If omitted, an error will be thrown
 *     when the `content` is an object.
 *
 * - **Output**:
 *   - The function has no return value. It modifies the `content` of the `current` node.
 *
 * ## Example:
 * ```ts
 * const node = createNode('dict');
 * pushToObject('value1', node, 'key1');
 * console.log(node.content); // { key1: 'value1' }
 *
 * const arrayNode = createNode('array');
 * pushToObject('value1', arrayNode);
 * console.log(arrayNode.content); // ['value1']
 * ```
 *
 * ## Error Handling:
 * - If the `current.content` is an object and no key is provided, an `XMLParsingError` is thrown:
 *   ```ts
 *   throw new XMLParsingError('Object key cannot be empty. Provide a valid key.');
 *   ```
 * - If the `current.content` is neither an array nor an object, an `XMLParsingError` is thrown:
 *   ```ts
 *   throw new XMLParsingError('Unsupported current content type. Expected an array or object.');
 *   ```
 *
 * @param value - The value to be added to the node's content.
 * @param current - The current node to which the value will be added.
 * @param key - An optional key used when the `content` is an object.
 * @throws {XMLParsingError} Throws an error if the `current.content` is not an array or object, or if no key is provided
 * for an object.
 */

export function pushToObject(value: unknown, current: PlistNodeInterfaces, key = ''): void {
    if (Array.isArray(current.content)) {
        (<PlistArrayType> current.content).push(value);
    } else if (typeof current.content === 'object') {
        if (!key) throw new XMLParsingError('Object key cannot be empty. Provide a valid key.');
        (<PlistObjectType> current.content)[key] = value;
    } else {
        throw new XMLParsingError('Unsupported current content type. Expected an array or object.');
    }
}

/**
 * The `decodeKey` function extracts and processes a key-value pair from the provided data. It first decodes the key,
 * then extracts the corresponding value and adds it to the current node's content. If the value represents a structured
 * object (e.g., a dictionary or array), a new node is created and pushed to the stack for further processing.
 *
 * - **Input**:
 *   - `data`: The raw data string containing the key-value pair.
 *   - `regex`: A regular expression used for extracting keys and values from the data.
 *   - `startTag`: The tag representing the start of the key to be extracted.
 *   - `current`: The current node (of type `PlistNodeInterfaces`) where the decoded value will be added.
 *   - `stack`: A stack of nodes that stores nodes for nested structures like dictionaries or arrays.
 *
 * - **Output**:
 *   - This function does not return a value. It modifies the `current` node by adding the decoded key-value pair to its
 *     `content`. If the value is a nested object or array, it pushes a new node to the stack.
 *
 * ## Example:
 * ```ts
 * const regex = /<key>(.*?)<\/key>/;
 * const data = '<key>name</key><string>John Doe</string>';
 * const currentNode = createNode('dict');
 * const stack: Array<PlistNodeInterfaces> = [];
 * decodeKey(data, regex, 'key', currentNode, stack);
 * console.log(currentNode.content); // { name: 'John Doe' }
 * ```
 *
 * ## Error Handling:
 * - If the extracted key is empty, an `XMLParsingError` is thrown:
 *   ```ts
 *   throw new XMLParsingError('Extracted key is empty. Verify the input plist.');
 *   ```
 * - If the corresponding value for the key is not found, an `XMLParsingError` is thrown:
 *   ```ts
 *   throw new XMLParsingError(`Value not found for key "${ key }". Ensure the data is correctly formatted.`);
 *   ```
 *
 * ## Notes:
 * - This function relies on regular expressions to extract keys and values from the data string.
 * - It supports handling nested objects and arrays by pushing new nodes to the stack.
 *
 * @param data - The raw data containing the key-value pair.
 * @param regex - The regular expression used to extract the key and value.
 * @param startTag - The tag representing the start of the key.
 * @param current - The current node to which the decoded key-value pair will be added.
 * @param stack - A stack that holds nodes for nested structures like dictionaries or arrays.
 * @throws {XMLParsingError} Throws an error if the extracted key is empty, if the value is missing, or if there is an
 * unexpected structure in the data.
 */

export function decodeKey(data: string, regex: RegExp, startTag: string, current: PlistNodeInterfaces, stack: Array<PlistNodeInterfaces>): void {
    const key = decodeTag(data, regex, startTag);
    if (!key)
        throw new XMLParsingError('Extracted key is empty. Verify the input plist.');

    const nextValue = regex.exec(data);
    if (!nextValue)
        throw new XMLParsingError(`Value not found for key "${ key }". Ensure the data is correctly formatted.`);

    const value = nextValue[2];
    if (objectTags.has(value)) {
        const node = createNode(value);
        if (!nextValue[4]) stack.push(node);

        return pushToObject(node.content, current, key);
    }

    pushToObject(
        decodePrimitive(decodeTag(data, regex, value, !!nextValue[4]), value),
        current,
        key
    );
}

/**
 * The `decodeObjects` function processes a string of data and extracts objects based on a provided regular expression
 * and tag. It supports handling nested structures, such as dictionaries and arrays, and validates the structure to
 * ensure correct data processing. The function works by using a stack to manage nested nodes, adding and removing nodes
 * as necessary based on opening and closing tags.
 *
 * - **Input**:
 *   - `data`: The raw data string to be processed. It contains key-value pairs and tags that represent the objects.
 *   - `regex`: The regular expression used for matching tags and determining the structure of the data.
 *   - `tag`: The root tag of the object to be decoded (e.g., `'dict'` or `'array'`).
 *
 * - **Output**:
 *   - A decoded object of type `XMLObjectsType`, which can be a dictionary or an array containing the processed data.
 *
 * ## Example:
 * ```ts
 * const regex = /<key>(.*?)<\/key><(.*?)>(.*?)<\/\1>/g;
 * const data = '<dict><key>name</key><string>John</string><key>age</key><integer>30</integer></dict>';
 * const result = decodeObjects(data, regex, 'dict');
 * console.log(result); // { name: 'John', age: 30 }
 * ```
 *
 * ## Error Handling:
 * - If the structure of the `dict` is invalid (e.g., a "key" is missing where it should be), an `XMLParsingError` is thrown:
 *   ```ts
 *   throw new XMLParsingError('Invalid structure: "dict" requires "key" as the first tag.');
 *   ```
 * - If there is an unexpected closing tag or mismatched structure, an `XMLParsingError` is thrown.
 *
 * ## Notes:
 * - This function supports both dictionaries (`dict`) and arrays (`array`). When a tag is encountered that represents
 *   a new object, a new node is created and added to the stack.
 * - The stack allows for handling nested structures, ensuring that the correct context is maintained as the function
 *   processes the data.
 *
 * @param data - The raw data string containing the tags and values to be decoded.
 * @param regex - The regular expression used to match tags and content in the data.
 * @param tag - The root tag (e.g., `'dict'` or `'array'`) indicating the type of the object to decode.
 * @returns The decoded object represented by the root node's content.
 * @throws {XMLParsingError} Throws an error if the structure is invalid or if an unexpected tag is encountered.
 */

export function decodeObjects(data: string, regex: RegExp, tag: string): PlistObjectsType {
    const root = createNode(tag);
    const stack: Array<PlistNodeInterfaces> = [ root ];

    let match: RegExpExecArray | null;
    while ((match = regex.exec(data)) !== null) {
        const [ , isClosing, tag, , selfClose ] = match;
        const current = stack[stack.length - 1];
        if (isClosing && objectTags.has(tag)) {
            stack.pop();
            if (stack.length === 0) break;
            continue;
        }

        if (current.tag === 'dict' && tag !== 'key')
            throw new XMLParsingError('Invalid structure: "dict" requires "key" as the first tag.');

        if (current.tag === 'dict') {
            decodeKey(data, regex, tag, current, stack);
            continue;
        }

        if (objectTags.has(tag)) {
            const node = createNode(tag);
            pushToObject(node.content, current);
            if (!selfClose) stack.push(node);

            continue;
        }

        pushToObject(decodePrimitive(
            decodeTag(data, regex, tag, !!selfClose), tag
        ), current);
    }

    return root.content;
}

/**
 * The `decodeTags` function processes a string of XML-like content, extracting and decoding tags and their associated
 * data.
 * It identifies the type of tag (e.g., primitive or object) and calls the appropriate decoding function for each
 * tag, such as `decodeObjects` for objects or `decodePrimitive` for primitive values.
 *
 * The function uses a regular expression to match tags in the content, handles both opening and closing tags, and
 * ensures that the correct decoding process is applied based on the tag type.
 * If no valid tags are found, or if the
 * structure is malformed, an error is thrown.
 *
 * - **Input**:
 *   - `contents`: The raw string content containing XML-like tags to be decoded.
 *   It may include both opening and closing
 *     tags, as well as the associated data.
 *
 * - **Output**:
 *   - The decoded value corresponding to the extracted tag,
 *   which can be either a primitive value or a structured object
 *     (e.g., dictionary, array).
 *
 * ## Example:
 * ```ts
 * const contents = '<string>hello</string>';
 * const result = decodeTags(contents);
 * console.log(result); // 'hello'
 *
 * const objectContents = '<dict><key>name</key><string>John</string></dict>';
 * const resultObj = decodeTags(objectContents);
 * console.log(resultObj); // { name: 'John' }
 * ```
 *
 * ## Error Handling:
 * - If no valid tags are found in the input `contents`, an `XMLParsingError` is thrown:
 *   ```ts
 *   throw new XMLParsingError('Malformed XML: No valid tags found.', `Input content: "${ contents.trim() }"`);
 *   ```
 * - If an invalid or unexpected tag is encountered, the function will delegate the error to the respective decoding
 *   functions, such as `decodeObjects` or `decodePrimitive`, which may throw additional errors based on the tag type.
 *
 * ## Notes:
 * - The function differentiates between object tags (such as `dict`, `array`) and primitive tags (such as `string`,
 *   `integer`).
 *   It processes these types accordingly.
 * - The function assumes the input `contents` follows a format similar to XML, with properly opened and closed tags.
 *
 * @param contents - The raw string content containing XML-like tags to be decoded.
 * @returns The decoded value, which can either be a primitive or an object.
 * @throws {XMLParsingError} Throws an error if no valid tags are found or if the content is malformed.
 */

export function decodeTags(contents: string): unknown {
    const regex = /<(\/?)([a-zA-Z0-9]+)([^\/>]*)(\/?)>/g;
    const tagData = regex.exec(contents);
    if (!tagData)
        throw new XMLParsingError(
            'Malformed XML: No valid tags found.',
            `Input content: "${ contents.trim() }"`
        );

    const tag = tagData[2];
    if (objectTags.has(tag))
        return decodeObjects(contents, regex, tag);

    return decodePrimitive(
        decodeTag(contents, regex, tag, !!tagData[4]), tag
    );
}

/**
 * The `encodePlist` function serializes a JavaScript object into a Property List (plist) format,
 * ensuring that the correct XML declaration, document type, and plist structure are included in the output.
 * The function encodes the provided data using the `encodeValue` function and returns the serialized plist
 * string representation of the object.
 *
 * - **Input**:
 *   - `data`: A JavaScript object of any type (`T`) that will be serialized into plist format.
 *     This can be a string, number, boolean, array, object, or other supported types.
 *
 * - **Output**:
 *   - A string representing the encoded plist,
 *   including the XML declaration, document type, and the serialized object.
 *
 * ## Example:
 * ```ts
 * const data = { name: 'John', age: 30 };
 * console.log(encodePlist(data));
 * // Output:
 * // <?xml version="1.0" encoding="UTF-8"?>
 * // <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
 * // <plist version="1.0"><dict><key>name</key><string>John</string><key>age</key><integer>30</integer></dict></plist>
 * ```
 *
 * ## Error Handling:
 * - If the provided `data` is `null`, an error is thrown:
 *   ```ts
 *   throw new Error('Invalid input: Expected a non-null JavaScript object.');
 *   ```
 *
 * ## Notes:
 * - The function wraps the encoded data with the appropriate XML declaration (`<?xml version="1.0" encoding="UTF-8"?>`),
 *   document type (`<!DOCTYPE plist ...>`), and plist structure (`<plist version="1.0">`).
 *
 * @param data - The object to be serialized into plist format.
 * @returns A string containing the serialized plist.
 */

export function encodePlist<T = unknown>(data: T): string {
    if (data === null)
        throw new XMLParsingError('Invalid input: Expected a non-null JavaScript object.');

    const plist = '<plist version="1.0">';
    const version = '<?xml version="1.0" encoding="UTF-8"?>';
    const doctype = '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">';

    return `${ version }${ doctype }${ plist }${ encodeValue(data) }</plist>`;
}

/**
 * The `decodePlist` function processes a plist (Property List) string, decoding it into the corresponding JavaScript
 * object or primitive value.
 * It validates the input to ensure it is a string, extracts the plist content, and then
 * decodes the tags within the plist using the `decodeTags` function.
 * The result is cast to the specified type `T`,
 * allowing for flexible return types.
 *
 * - **Input**:
 *   - `plist`: A string containing the plist data to be decoded.
 *   The string is expected to be in XML-like format,
 *     with tags representing the plist structure.
 *
 * - **Output**:
 *   - A decoded object or value, represented by the type `T`, based on the content of the plist.
 *
 * ## Example:
 * ```ts
 * const plist = '<dict><key>name</key><string>John</string></dict>';
 * const result = decodePlist(plist);
 * console.log(result); // { name: 'John' }
 *
 * const plistString = '<string>hello</string>';
 * const resultString = decodePlist(plistString);
 * console.log(resultString); // 'hello'
 * ```
 *
 * ## Error Handling:
 * - If the input `plist` is not a string, an `XMLParsingError` is thrown:
 *   ```ts
 *   throw new XMLParsingError(`Invalid input type for plist: expected a string but received ${ typeof plist }`);
 *   ```
 * - If there is an issue with the plist format or tag decoding, errors will be handled by the `decodeTags` function,
 *   which may throw additional parsing errors.
 *
 * ## Notes:
 * - The function allows for generic typing by specifying the type `T`, which can represent the expected decoded
 *   structure (e.g., `Record<string, unknown>` or a custom interface).
 * - The plist data is first processed to remove unnecessary whitespace and extract the content before being decoded.
 *
 * @param plist - The plist string to be decoded.
 * @returns The decoded object or primitive value, cast to type `T`.
 * @throws {XMLParsingError} Throws an error if the input is not a string or if the plist structure is invalid.
 */

export function decodePlist<T = unknown>(plist: string): T {
    if (typeof plist !== 'string')
        throw new XMLParsingError(`Invalid input type for plist: expected a string but received ${ typeof plist }`);

    return <T> decodeTags(decodePlistContent(plist));
}
