/**
 * Import will remove at compile time
 */

import type {
    PlistArrayType,
    PlistObjectType,
    PlistObjectsType,
    PlistNodeInterface
} from '@services/interfaces/plist-service.interface';

/**
 * Imports
 */

import { XMLParsingError } from '@errors/xml.error';
import { decodePrimitive, decodeTag, encodeValue } from '@structs/plist.struct';

/**
 * Set of XML tags that represent complex data structures in property lists
 *
 * @remarks
 * This constant defines a Set containing the XML tag names that represent
 * complex/container data structures in property lists. These tags require
 * special handling during parsing and serialization because they contain
 * nested elements rather than simple primitive values.
 *
 * The Set includes:
 * - `dict`: Represents dictionary/object structures with key-value pairs
 * - `array`: Represents ordered collections of elements
 *
 * Using a Set data structure provides constant-time O(1) lookups, which
 * is more efficient than using an array with `includes()` (which has
 * linear time complexity O(n)) when checking if a tag represents a
 * complex structure.
 *
 * This Set is primarily used during XML parsing to determine whether
 * a tag should be processed as a container with child elements or as
 * a primitive value.
 *
 * @example
 * ```ts
 * // Checking if a tag represents a complex structure
 * function isComplexType(tagName: string): boolean {
 *   return objectTags.has(tagName);
 * }
 *
 * console.log(isComplexType('dict'));  // true
 * console.log(isComplexType('array')); // true
 * console.log(isComplexType('string')); // false
 * ```
 *
 * @since 1.0.1
 */

const objectTags = new Set([ 'dict', 'array' ]);

/**
 * Extracts content from between plist XML tags
 *
 * @param plist - String containing the XML plist data
 * @returns The XML content found between the plist tags
 * @throws XMLParsingError - When plist tags are missing or XML is malformed
 *
 * @remarks
 * This function isolates and returns the XML content contained within the
 * `<plist>` tags of a property list XML string. Before extraction, the function
 * normalizes the XML by removing whitespace between tags to simplify processing.
 *
 * The function uses a regular expression to match the content between opening
 * and closing plist tags, accounting for any attributes in the opening tag
 * (like version information).
 *
 * Property list files typically wrap their actual content (dictionaries, arrays, etc.)
 * within these `<plist>` tags, so this function is an important first step in
 * parsing plist data.
 *
 * @example
 * ```ts
 * const plistString = `
 *   <plist version="1.0">
 *     <dict>
 *       <key>Name</key>
 *       <string>John Doe</string>
 *     </dict>
 *   </plist>
 * `;
 *
 * try {
 *   const content = decodePlistContent(plistString);
 *   console.log(content);
 *   // Output: '<dict><key>Name</key><string>John Doe</string></dict>'
 * } catch (error) {
 *   console.error("Failed to parse plist:", error.message);
 * }
 * ```
 *
 * @since 1.0.1
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
 * Creates a new node with the specified tag
 *
 * @param tag - The tag name for the node
 * @returns A new node with the specified tag and appropriate content type
 *
 * @remarks
 * If the tag is 'dict', the node will have an empty object as its content.
 * For other tags, the content will be an empty array. This function is useful for
 * generating nodes that can later be populated with data, such as when building
 * a plist structure.
 *
 * @example
 * ```ts
 * const dictNode = createNode('dict');
 * console.log(dictNode); // { tag: 'dict', content: {} }
 *
 * const arrayNode = createNode('array');
 * console.log(arrayNode); // { tag: 'array', content: [] }
 * ```
 * @see PlistNodeInterface
 * @since 1.0.1
 */

export function createNode(tag: string): PlistNodeInterface {
    return {
        tag,
        content: tag === 'dict' ? {} : []
    };
}

/**
 * Adds a value to the content of a node
 *
 * @param value - The value to be added to the node's content
 * @param current - The current node to which the value will be added
 * @param key - An optional key used when the content is an object
 * @throws XMLParsingError - When the current.content is not an array or object, or when no key is provided for an object
 *
 * @remarks
 * The function modifies the content of the current node based on its type:
 * - If content is an array, the value is pushed to the array
 * - If content is an object, the value is assigned to the specified key
 * - For any other content type, an error is thrown
 *
 * @example
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
 * @see PlistNodeInterface
 * @since 1.0.1
 */

export function pushToObject(value: unknown, current: PlistNodeInterface, key = ''): void {
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
 * Extracts and processes a key-value pair from the provided data
 *
 * @param data - The raw data containing the key-value pair
 * @param regex - The regular expression used to extract the key and value
 * @param startTag - The tag representing the start of the key
 * @param current - The current node to which the decoded key-value pair will be added
 * @param stack - A stack that holds nodes for nested structures like dictionaries or arrays
 *
 * @throws XMLParsingError - When the extracted key is empty, the value is missing, or there is an unexpected structure in the data
 *
 * @remarks
 * This function first decodes the key from the data, then extracts the corresponding value
 * and adds it to the current node's content. If the value represents a structured
 * object (like a dictionary or array), a new node is created and pushed to the stack
 * for further processing. The function relies on regular expressions to extract keys
 * and values from the data string and supports handling nested objects by pushing
 * new nodes to the stack.
 *
 * @example
 * ```ts
 * const regex = /<key>(.*?)<\/key>/;
 * const data = '<key>name</key><string>John Doe</string>';
 * const currentNode = createNode('dict');
 * const stack: Array<PlistNodeInterfaces> = [];
 * decodeKey(data, regex, 'key', currentNode, stack);
 * console.log(currentNode.content); // { name: 'John Doe' }
 * ```
 *
 * @since 1.0.1
 */

export function decodeKey(data: string, regex: RegExp, startTag: string, current: PlistNodeInterface, stack: Array<PlistNodeInterface>): void {
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
 * Processes a string of data and extracts objects based on a provided regular expression and tag
 *
 * @param data - The raw data string containing the tags and values to be decoded
 * @param regex - The regular expression used to match tags and content in the data
 * @param tag - The root tag (e.g., 'dict' or 'array') indicating the type of the object to decode
 * @returns The decoded object represented by the root node's content
 * @throws XMLParsingError - When the structure is invalid or an unexpected tag is encountered
 *
 * @remarks
 * This function supports handling nested structures such as dictionaries and arrays by using
 * a stack to manage nested nodes. It validates the structure to ensure correct data processing,
 * adding and removing nodes as necessary based on opening and closing tags. The stack approach
 * maintains the correct context as the function processes the data, ensuring proper hierarchy.
 *
 * @example
 * ```ts
 * const regex = /<key>(.*?)<\/key><(.*?)>(.*?)<\/\1>/g;
 * const data = '<dict><key>name</key><string>John</string><key>age</key><integer>30</integer></dict>';
 * const result = decodeObjects(data, regex, 'dict');
 * console.log(result); // { name: 'John', age: 30 }
 * ```
 *
 * @since 1.0.1
 */

export function decodeObjects(data: string, regex: RegExp, tag: string): PlistObjectsType {
    const root = createNode(tag);
    const stack: Array<PlistNodeInterface> = [ root ];

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
 * Processes a string of XML-like content, extracting and decoding tags and their associated data
 *
 * @param contents - The raw string content containing XML-like tags to be decoded
 * @returns The decoded value, which can either be a primitive or an object
 * @throws XMLParsingError - When no valid tags are found or if the content is malformed
 *
 * @remarks
 * This function identifies the type of tag (primitive or object) and calls the appropriate
 * decoding function for each tag. It uses a regular expression to match tags in the content,
 * handles both opening and closing tags, and ensures that the correct decoding process is
 * applied based on the tag type. The function assumes the input follows a format similar
 * to XML, with properly opened and closed tags.
 *
 * @example
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
 * @since 1.0.1
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
 * Serializes a JavaScript object into a Property List (plist) format
 *
 * @param data - The object to be serialized into plist format
 * @returns A string containing the serialized plist
 * @throws XMLParsingError - When the provided data is null
 *
 * @remarks
 * This function ensures that the correct XML declaration, document type, and plist structure
 * are included in the output. It encodes the provided data using the `encodeValue` function
 * and returns the serialized plist string representation of the object.
 *
 * @example
 * ```ts
 * const data = { name: 'John', age: 30 };
 * console.log(encodePlist(data));
 * // Output:
 * // <?xml version="1.0" encoding="UTF-8"?>
 * // <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
 * // <plist version="1.0"><dict><key>name</key><string>John</string><key>age</key><integer>30</integer></dict></plist>
 * ```
 *
 * @since 1.0.1
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
 * Processes a plist (Property List) string, decoding it into the corresponding JavaScript object or primitive value
 *
 * @param plist - The plist string to be decoded
 * @returns The decoded object or primitive value, cast to type `T`
 * @throws XMLParsingError - When the input is not a string or if the plist structure is invalid
 *
 * @remarks
 * This function validates the input to ensure it is a string, extracts the plist content,
 * and then decodes the tags within the plist. The function allows for generic typing by
 * specifying the type `T`, which can represent the expected decoded structure.
 *
 * @example
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
 * @since 1.0.1
 */

export function decodePlist<T = unknown>(plist: string): T {
    if (typeof plist !== 'string')
        throw new XMLParsingError(`Invalid input type for plist: expected a string but received ${ typeof plist }`);

    return <T> decodeTags(decodePlistContent(plist));
}
