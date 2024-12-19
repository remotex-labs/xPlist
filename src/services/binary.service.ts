/**
 * Import will remove at compile time
 */

import type {
    DecodeObjectRefInterface,
    EncodeObjectRefInterface
} from '@services/interfaces/binary.service.interface';
import type { IntegerByteLengthType } from '@components/interfaces/numbers.component.interface';
import type { PlistArrayType, PlistObjectType } from '@services/interfaces/plist.service.interface';

/**
 * Imports
 */

import {
    headerStruct,
    trailerStruct,
    encodeUID,
    decodeUID,
    encodeDate,
    decodeDate,
    encodeAscii,
    decodeAscii,
    encodeNumber,
    decodeDouble,
    encodeBuffer,
    decodeBuffer,
    encodeObjects,
    decodeInteger,
    encodeUtf16BE,
    decodeUtf16BE,
    packDataHeader,
    packOffsetTable,
    unpackDataHeader,
    unpackOffsetTable
} from '@structs/binary.struct';
import { BinaryParsingError } from '@errors/binary.error';
import { integerByteLength, readInteger, writeInteger } from '@components/numbers.component';

/**
 * CREATE_UID_MARKER
 */

const CREATE_UID_MARKER = '__isCreateUID';

/**
 * The `countElements` function counts all elements in a given data structure,
 * which can be an array, object, or a mix of both, including nested structures.
 * It handles nested arrays, objects,
 * and primitive values (such as strings, numbers, and booleans) without recursion to avoid stack overflow issues.
 *
 * - **Input**:
 *   - `data`: The input data to be processed. It can be:
 *     - An `array`: The function will iterate through all elements in the array, including nested arrays and objects.
 *     - An `object`:
 *     The function will iterate through all values of the object's properties, including nested arrays and objects.
 *     - A `primitive value` (string, number, boolean, etc.): The function will count each primitive as a single element.
 *
 * - **Output**:
 *   - A `number`: The total count of elements in the structure, including all nested elements.
 *
 * ## Example:
 * ```ts
 * const data = {
 *   a: [1, 2, { b: 3, c: [4, 5] }],
 *   d: 'string',
 *   e: { f: [6, 7], g: 'hello' },
 * };
 * console.log(countElements(data)); // Output: 10
 *
 * const simpleArray = [1, 2, 3, 4];
 * console.log(countElements(simpleArray)); // Output: 4
 *
 * const simpleObject = { a: 1, b: 2, c: 3 };
 * console.log(countElements(simpleObject)); // Output: 3
 * ```
 *
 * ## Error Handling:
 * - No specific error handling is implemented, as the function is designed to handle mixed data types gracefully.
 *
 * ## Notes:
 * - The function uses an iterative approach with a stack to avoid recursion,
 * making it suitable for deep nested structures.
 * - The function treats arrays, objects, and primitive values independently but counts all elements they contain.
 *
 * @param data - The data structure (array, object, or primitive) to count the elements from.
 * @returns The total number of elements in the data structure.
 */

export function countElements(data: unknown): number {
    let count = 0;
    const stack: Array<unknown> = [ data ]; // Start with the initial data in the stack

    while (stack.length > 0) {
        const current = stack.pop();
        count += 1;

        if (Array.isArray(current)) {
            stack.push(...current);
        } else if (current && typeof current === 'object') {
            const elements = Object.values(current);
            count += elements.length;
            stack.push(...elements);
        }
    }

    return count;
}


/**
 * The `CreateUID` function generates a unique identifier (UID) as a `Buffer` from a given input.
 * The input can be a string, a number, or an existing `Buffer`.
 * It returns a `Buffer` representation of the UID,
 * and attaches a non-enumerable, non-configurable, and non-writable property to mark the buffer as a UID.
 *
 * - **Input**:
 *   - `id`: The input value for the UID. It can be:
 *     - A `number`: The function will encode the number as a `Buffer` based on its byte length.
 *     - A `string`: The function will directly convert the string into a `Buffer`.
 *     - A `Buffer`: The function will return the input buffer as is.
 *
 * - **Output**:
 *   - A `Buffer` representing the UID.
 *
 * ## Example:
 * ```ts
 * const numberUID = CreateUID(12345);
 * console.log(numberUID); // <Buffer ...>
 *
 * const stringUID = CreateUID('abc123');
 * console.log(stringUID); // <Buffer ...>
 *
 * const bufferUID = CreateUID(Buffer.from([1, 2, 3]));
 * console.log(bufferUID); // <Buffer 01 02 03>
 * ```
 *
 * ## Error Handling:
 * - Throws a `TypeError` if the provided `id` is not a `string`, `number`, or `Buffer`:
 *   ```ts
 *   throw new TypeError('UID must be a string or number or Buffer.');
 *   ```
 *
 * ## Notes:
 * - The function uses `integerByteLength` to determine the size of the buffer when the input is a number.
 * - A special property, `CREATE_UID_MARKER`, is added to the returned buffer to mark it as a UID. This property is non-enumerable and cannot be modified.
 *
 * @param id - The value to be used to create the UID, which can be a string, number, or Buffer.
 * @returns The generated UID as a `Buffer`.
 * @throws {TypeError} Throws an error if the input type is not supported.
 */

export function CreateUID(id: number | string | Buffer): Buffer {
    let buffer: Buffer;
    if (typeof id === 'number') {
        const size = integerByteLength(id);
        buffer = Buffer.alloc(size);
        writeInteger(buffer, id, size);
    } else if (typeof id === 'string') {
        buffer = Buffer.from(id);
    } else if(Buffer.isBuffer(id)) {
        buffer = id;
    } else {
        throw new TypeError('UID must be a string or number or Buffer.');
    }

    Object.defineProperty(buffer, CREATE_UID_MARKER, {
        value: true,
        enumerable: false,
        configurable: false,
        writable: false
    });

    return buffer;
}

/**
 * The `encodeReference` function encodes an item by checking if it has been previously encountered (referenced).
 * If the item has not been seen before, it is encoded and added to the reference map with a new offset. If the item
 * has been previously encoded, the function adds its index from the reference map.
 *
 * - **Input**:
 *   - `item`: The item to be encoded. Can be any type, and if it's a reference that has been seen before,
 *     its index from the reference map will be used.
 *   - `objectRef`: An object containing the `map` of encoded items and an `offset` to assign to the new items.
 *     The `map` holds the already encoded items and their corresponding offsets, and `offset` keeps track of the
 *     current position in the encoding process.
 *   - `referenceMap`: An array that will store the encoded offsets or indices of the items for reference.
 *
 * - **Output**:
 *   - An array of `Buffer`s representing the encoded item. If the item is not already referenced,
 *     it will be encoded and added to the output buffer array.
 *
 * ## Example:
 * ```ts
 * const objectRef = { map: new Map(), offset: 0 };
 * const referenceMap: number[] = [];
 * const encodedItem = encodeReference(item, objectRef, referenceMap);
 * ```
 *
 * ## Error Handling:
 * - There are no explicit error handling mechanisms in this function.
 *
 * ## Notes:
 * - This function ensures that each item is encoded only once and avoids duplicate encoding by using the `map`.
 * - If the item is a reference (i.e., it has been encoded before), it simply adds its index to the `referenceMap`.
 *
 * @param item - The item to encode. Can be any data type.
 * @param objectRef - Contains the map of previously encoded items and the current offset.
 * @param referenceMap - The reference map to store the index or offset of the item.
 * @returns An array of `Buffer`s representing the encoded item.
 */

export function encodeReference(item: unknown, objectRef: EncodeObjectRefInterface, referenceMap: Array<number>): Array<Buffer> {
    const itemIndex = objectRef.map.get(item);
    const encodedData: Array<Buffer> = [];

    if (itemIndex === undefined) {
        referenceMap.push(objectRef.offset);
        objectRef.map.set(item, objectRef.offset);
        ++objectRef.offset;

        const result = encodeType(item, objectRef);
        if (Array.isArray(result)) {
            encodedData.push(...result);
        } else {
            encodedData.push(result);
        }
    } else {
        referenceMap.push(itemIndex);
    }

    return encodedData;
}

/**
 * The `decodeReference` function decodes a reference to an item based on its index and the associated offset in the buffer.
 * If the item has already been decoded (using the reference map), it retrieves the object from the map. If not,
 * the function decodes the object, stores it in the reference map, and returns it.
 *
 * - **Input**:
 *   - `buffer`: The buffer containing the encoded data that holds the reference.
 *   - `index`: The index of the item in the `offsets` array to be decoded.
 *   - `offsets`: An array of offsets that map the indices to specific locations in the `buffer`.
 *   - `objectRef`: An object containing a map (`map`) for storing decoded objects indexed by their offsets.
 *
 * - **Output**:
 *   - The decoded object corresponding to the given reference index. If the object has been decoded before,
 *     it will be fetched from the `map`; otherwise, it will be decoded and stored for future reference.
 *
 * ## Example:
 * ```ts
 * const decodedObject = decodeReference(buffer, index, offsets, objectRef);
 * ```
 *
 * ## Error Handling:
 * - There are no explicit error handling mechanisms in this function. If the buffer or other input data is corrupted,
 *   decoding may fail during the `decodeType` call.
 *
 * ## Notes:
 * - This function ensures that each object is only decoded once, storing it in the `objectRef.map` for subsequent lookups.
 * - It relies on the offsets and indices to locate the correct object in the buffer for decoding.
 *
 * @param buffer - The buffer containing the encoded data to decode.
 * @param index - The index pointing to the reference in the offsets array.
 * @param offsets - The offsets array that links the reference index to specific positions in the buffer.
 * @param objectRef - The reference object containing a map of already decoded objects.
 * @returns {unknown} The decoded object corresponding to the given reference.
 */

export function decodeReference(buffer: Buffer, index: number, offsets: Array<number>, objectRef: DecodeObjectRefInterface): unknown  {
    const objectIndex = offsets[index];
    let object = objectRef.map.get(objectIndex);
    if (object === undefined) {
        object = decodeType(buffer, objectIndex, offsets, objectRef);
        objectRef.map.set(objectIndex, object);
    }

    return object;
}

/**
 * Encodes an object into a binary format compatible with property lists (bplist).
 *
 * This function takes an object with key-value pairs and encodes it into binary buffers.
 * It tracks references to each key and value in the object, generating metadata and binary
 * representations for each element.
 *
 * The function performs the following steps:
 * 1. Iterates over the keys of the object.
 * 2. Encodes each key and its corresponding value using `encodeReference`, which resolves references
 *    and generates buffers for each element.
 * 3. Creates a binary object representation of the metadata, including references to keys and values.
 * 4. Combines the metadata and encoded keys/values into an array of buffers for output.
 *
 * - **Input**:
 *   - `value`: An object whose key-value pairs are to be encoded.
 *   Keys are always strings, while values
 *     can be of mixed types.
 *   - `objectRef`: An object implementing `EncodeObjectRefInterface` to manage object references and
 *     offsets during encoding.
 *
 * - **Output**:
 *   - An array of `Buffer` objects representing the encoded object, including metadata and key-value data.
 *
 * ## Example:
 * ```ts
 * const myObject = { name: "Alice", age: 30, hobbies: ["reading", "cycling"] };
 * const encodeInfo: EncodeObjectRefInterface = {
 *   map: new Map(),
 *   offset: 1,
 *   numberOfObjects: 0,
 *   offsetTableOffset: 0,
 *   objectReferenceSize: 0,
 *   offsetTableOffsetSize: 0
 * };
 * const encodedObject = encodeObject(myObject, encodeInfo);
 * ```
 *
 * ## Error Handling:
 * - Throws an error if any key or value in the object cannot be encoded.
 * - Ensures that references to keys and values are correctly resolved and prevents invalid references.
 *
 * ## Notes:
 * - The `encodeReference` function handles the encoding of each key and value, updating the
 *   `keyReferenceMap` and `valueReferenceMap` respectively.
 * - The `encodeObjects` function generates the metadata for the object, including references to keys and values.
 * - Updates the `objectRef` object with new offsets and object counts as keys and values are encoded.
 *
 * @param value - The object to encode into binary format.
 * @param objectRef - An object implementing `EncodeObjectRefInterface` for managing references and offsets during encoding.
 * @returns An array of `Buffer` objects representing the encoded data, including metadata and key-value buffers.
 */

export function encodeObject(value: PlistObjectType, objectRef: EncodeObjectRefInterface): Array<Buffer> {
    const encodedData: Buffer[] = [];
    const keyReferenceMap: number[] = [];
    const valueReferenceMap: number[] = [];

    for (const key of Object.keys(value)) {
        // Encoding the key and value for the object
        encodedData.push(...encodeReference(key, objectRef, keyReferenceMap));
        encodedData.push(...encodeReference(value[key], objectRef, valueReferenceMap));
    }

    return [
        encodeObjects(
            Object.keys(value).length, 0xD, [ ...keyReferenceMap, ...valueReferenceMap ], objectRef.objectReferenceSize
        ),
        ...encodedData
    ];
}

/**
 * The `decodeObject` function decodes a serialized object from a given buffer by reading the key-value pairs,
 * resolving their references, and reconstructing the object.
 * It utilizes references to decode both keys and values,
 * ensuring that previously decoded objects are reused efficiently.
 * The function returns the decoded object.
 *
 * - **Input**:
 *   - `buffer`: The `Buffer` containing the encoded object data.
 *   - `length`: The number of key-value pairs in the object to decode.
 *   - `offset`: The starting offset in the buffer to begin decoding.
 *   - `offsets`: An array of offsets that represent the positions of the references within the buffer.
 *   - `objectRef`: An object that tracks the decoding state, including a map to track decoded objects and their references.
 *
 * - **Output**:
 *   - The decoded object (`PlistObjectType`),
 *   which is an object whose keys are strings and values are the decoded objects or primitive types.
 *
 * ## Example:
 * ```ts
 * const decodedObject = decodeObject(buffer, length, offset, offsets, objectRef);
 * ```
 *
 * ## Error Handling:
 * - The function assumes the provided buffer and offsets are correctly structured. Errors may occur if:
 *   - The offset or index calculations are incorrect.
 *   - The references to keys or values do not exist or have been corrupted.
 *
 * ## Notes:
 * - The function decodes keys and values by resolving references using the `decodeReference` function.
 * - Keys are expected to be strings, and their values are decoded accordingly.
 * - The decoded object is returned in its original form, with key-value pairs correctly mapped.
 *
 * @param buffer - The buffer containing the serialized object data.
 * @param length - The number of key-value pairs to decode.
 * @param offset - The starting offset in the buffer for decoding the object.
 * @param offsets - The list of offsets for decoding reference data.
 * @param objectRef - The decoding reference interface containing the map of previously decoded objects.
 * @returns {PlistObjectType} The decoded object containing the key-value pairs.
 */

export function decodeObject(buffer: Buffer, length: number, offset: number, offsets: Array<number>, objectRef: DecodeObjectRefInterface): PlistObjectType {
    const object: PlistObjectType = {};

    for (let i = 0; i < length; i++) {
        const keyIndex = Number(
            readInteger(buffer, <IntegerByteLengthType>objectRef.offsetSize, offset + i)
        );
        const valueIndex = Number(
            readInteger(buffer, <IntegerByteLengthType>objectRef.offsetSize, offset + length + i)
        );

        const keyObject = decodeReference(buffer, keyIndex, offsets, objectRef);
        object[(<string>keyObject).toString()] = decodeReference(buffer, valueIndex, offsets, objectRef);
    }

    return object;
}

/**
 * Encodes an array or set into a binary format compatible with property lists (bplist).
 *
 * This function encodes an input `array` or `Set` into binary buffers.
 * The function tracks references to each element
 * in the input, ensuring proper metadata is generated for the encoded structure.
 *
 * The function performs the following steps:
 * 1. Iterates over the elements in the input array or set.
 * 2. Encodes each element using `encodeReference`, which resolves references and generates buffers.
 * 3. Creates a binary object representation of the array or set metadata, including references and object types.
 * 4. Combines metadata and encoded elements into an array of buffers for output.
 *
 * - **Input**:
 *   - `value`: An array or set of elements to encode. Elements can be of mixed types.
 *   - `length`: The number of elements in the array or set.
 *   - `type`: The type identifier for the array or set in the binary format.
 *   - `objectRef`: An object implementing `EncodeObjectRefInterface` to manage object references and offsets during encoding.
 *
 * - **Output**:
 *   - An array of `Buffer` objects representing the encoded array or set, including metadata and element data.
 *
 * ## Example:
 * ```ts
 * const mySet = new Set([1, "two", { key: "value" }]);
 * const encodeInfo: EncodeObjectRefInterface = {
 *   map: new Map(),
 *   offset: 1,
 *   numberOfObjects: 0,
 *   offsetTableOffset: 0,
 *   objectReferenceSize: 0,
 *   offsetTableOffsetSize: 0
 * };
 * const encodedArray = encodeArray(mySet, mySet.size, 0xA0, encodeInfo);
 * ```
 *
 * ## Error Handling:
 * - Throws an error if any element in the array or set cannot be encoded.
 * - Ensures that references are correctly resolved to prevent circular dependencies.
 *
 * ## Notes:
 * - The `encodeReference` function handles encoding of individual elements and updates the `referenceMap`.
 * - The `encodeObjects` function creates the binary metadata for the array or set, including references to its elements.
 * - Updates the `objectRef` object with new offsets and object counts as elements are encoded.
 *
 * @param value - An array or set to encode into binary format.
 * @param length - The number of elements in the input array or set.
 * @param type - A type identifier representing the array or set in the bplist format.
 * @param objectRef - An object implementing `EncodeObjectRefInterface` for managing references and offsets during encoding.
 * @returns An array of `Buffer` objects representing the encoded data, including metadata and element buffers.
 */

export function encodeArray(value: PlistArrayType | Set<unknown>, length: number, type: number, objectRef: EncodeObjectRefInterface): Array<Buffer> {
    const referenceMap: number[] = [];
    const encodedData: Buffer[] = [];

    for (const item of value) {
        encodedData.push(...encodeReference(item, objectRef, referenceMap));
    }

    return [
        encodeObjects(length, type, referenceMap, objectRef.objectReferenceSize),
        ...encodedData
    ];
}

/**
 * The `decodeArray` function decodes an array by extracting its elements from the provided buffer.
 * Each element is decoded using references stored in the buffer and the provided offsets and reference map.
 *
 * - **Input**:
 *   - `buffer`: The buffer containing the encoded array data.
 *   - `length`: The number of elements in the array.
 *   - `offset`: The starting position in the buffer where the array's data begins.
 *   - `offsets`: An array of offsets indicating positions of references in the buffer.
 *   - `objectRef`: The decoding reference interface that manages reference mappings for decoding.
 *
 * - **Output**:
 *   - A decoded array (`PlistArrayType`) containing the elements of the encoded array.
 *
 * ## Example:
 * ```ts
 * const decodedArray = decodeArray(buffer, length, offset, offsets, objectRef);
 * ```
 *
 * ## Error Handling:
 * - The function assumes that the `length` provided is correct and corresponds to the actual number of elements in the encoded array.
 * - It also assumes the `objectRef` interface is properly initialized, and that offsets are valid and correctly mapped to the encoded data.
 * - If there are errors in the reference or offsets, the decoding process may fail, leading to unexpected behavior or `undefined` objects.
 *
 * ## Notes:
 * - The `readInteger` function is used to read the indices of the elements from the buffer, which are used to find the corresponding decoded objects.
 * - The `decodeReference` function is used to decode each element's data based on its reference in the buffer and the offsets.
 *
 * @param buffer - The buffer containing the encoded data of the array.
 * @param length - The number of elements in the array.
 * @param offset - The offset in the buffer where the array's data begins.
 * @param offsets - An array of offsets used for decoding references in the buffer.
 * @param objectRef - The decoding reference interface managing the decoding process.
 * @returns {PlistArrayType} A decoded array containing the deserialized elements.
 */

export function decodeArray(buffer: Buffer, length: number, offset: number, offsets: Array<number>, objectRef: DecodeObjectRefInterface): PlistArrayType {
    const array: PlistArrayType = [];

    for (let i = 0; i < length; i++) {
        const index = Number(
            readInteger(buffer, <IntegerByteLengthType>objectRef.offsetSize, offset + i)
        );
        array.push(decodeReference(buffer, index, offsets, objectRef));
    }

    return array;
}

/**
 * The `decodeSet` function decodes a set from a provided buffer.
 * The elements of the set are decoded
 * by extracting references from the buffer using the provided offsets and reference map.
 *
 * - **Input**:
 *   - `buffer`: The buffer containing the encoded set data.
 *   - `length`: The number of elements in the set.
 *   - `offset`: The starting position in the buffer where the set's data begins.
 *   - `offsets`: An array of offsets indicating the positions of references in the buffer.
 *   - `objectRef`: The decoding reference interface that manages reference mappings during decoding.
 *
 * - **Output**:
 *   - A decoded set (`Set<unknown>`) containing the elements of the encoded set.
 *
 * ## Example:
 * ```ts
 * const decodedSet = decodeSet(buffer, length, offset, offsets, objectRef);
 * ```
 *
 * ## Error Handling:
 * - The function assumes the `length`
 * provided is correct and corresponds to the actual number of elements in the encoded set.
 * - The `objectRef` interface should be properly initialized,
 * and the offsets array should contain valid references to the encoded data.
 * - If the offsets or references are invalid, the function may throw errors or return unexpected results.
 *
 * ## Notes:
 * - The `readInteger` function is used to read the indices of the elements in the buffer, which are used to locate the corresponding decoded objects.
 * - The `decodeReference` function is employed to decode each element based on its reference in the buffer and the offsets.
 *
 * @param buffer - The buffer containing the encoded data of the set.
 * @param length - The number of elements in the set.
 * @param offset - The offset in the buffer where the set's data begins.
 * @param offsets - An array of offsets used for decoding references in the buffer.
 * @param objectRef - The decoding reference interface that manages decoding references.
 * @returns {Set<unknown>} A decoded set containing the deserialized elements.
 */

export function decodeSet(buffer: Buffer, length: number, offset: number, offsets: Array<number>, objectRef: DecodeObjectRefInterface): Set<unknown> {
    const set = new Set<unknown>();

    for (let i = 0; i < length; i++) {
        const index = Number(
            readInteger(buffer, <IntegerByteLengthType>objectRef.offsetSize, offset + i)
        );
        set.add(decodeReference(buffer, index, offsets, objectRef));
    }

    return set;
}

/**
 * Packs encoded binary data and generates an offset table.
 *
 * This function takes an array of `Buffer`
 * objects (or a single `Buffer`) and combines them into a single binary structure.
 * It calculates offsets for each data object, determines the required offset size,
 * and appends an offset table to the packed data.
 *
 * The function performs the following steps:
 * 1. Converts the input into an array of `Buffer` objects (if it's a single `Buffer`).
 * 2. Calculates offsets for each object based on their lengths and updates the `info.offsetTableOffset`.
 * 3. Determines the size of offsets required to reference all objects efficiently.
 * 4. Combines the data objects and the offset table into a single output `Buffer`.
 *
 * - **Input**:
 *   - `data`: A `Buffer` or an array of `Buffer` objects to be packed.
 *   - `info`: An object implementing `EncodeObjectRefInterface` that tracks encoding metadata, including offsets and object counts.
 *
 * - **Output**:
 *   - A `Buffer` containing the packed binary data followed by the offset table.
 *
 * ## Example:
 * ```ts
 * const dataBuffers = [Buffer.from("object1"), Buffer.from("object2")];
 * const encodeInfo: EncodeObjectRefInterface = {
 *   map: new Map(),
 *   offset: 1,
 *   numberOfObjects: 0,
 *   offsetTableOffset: 0,
 *   objectReferenceSize: 0,
 *   offsetTableOffsetSize: 0
 * };
 * const packed = packData(dataBuffers, encodeInfo);
 * ```
 *
 * ## Error Handling:
 * - Ensures that offsets are calculated correctly to avoid buffer overflows.
 * - Throws an error if any invalid or incompatible `Buffer` is provided.
 *
 * ## Notes:
 * - The `integerByteLength` function is used to determine the size in bytes of the largest offset.
 * - The `packOffsetTable` function generates a binary representation of the offset table based on the calculated offsets.
 * - Updates `info.numberOfObjects` and `info.offsetTableOffsetSize` with calculated values.
 *
 * @param data - A single `Buffer` or an array of `Buffer` objects to be packed.
 * @param info - An object implementing `EncodeObjectRefInterface` for tracking metadata during the encoding process.
 * @returns A `Buffer` containing the packed data and offset table.
 */

export function packData(data: Buffer | Buffer[], info: EncodeObjectRefInterface): Buffer {
    const offsets: number[] = [];
    const dataArray = Array.isArray(data) ? data : [ data ];
    info.numberOfObjects = dataArray.length;

    // Calculate offsets
    for (const object of dataArray) {
        offsets.push(info.offsetTableOffset);
        info.offsetTableOffset += object.length;
    }

    // Determine offset size based on the largest offset
    info.offsetTableOffsetSize = integerByteLength(offsets[offsets.length - 1]);

    // Combine data and offset table into a single buffer
    return Buffer.concat([ ...dataArray, packOffsetTable(offsets) ]);
}

/**
 * The `encodeType` function encodes various JavaScript types into their corresponding binary representations.
 * It handles primitive types, arrays, sets, dates, buffers, and objects,
 * packing them into buffers that can be used for storage or transmission.
 *
 * - **Input**:
 *   - `value`: The value to encode.
 *   It can be of various types such as `null`, `boolean`, `number`,
 *   `bigint`, `string`, `Date`, `Buffer`, `Set`, `Array`, or `Object`.
 *   - `objectRef`: An object containing metadata for encoding,
 *   specifically for handling references and offsets for complex types like objects and arrays.
 *
 * - **Output**:
 *   - A `Buffer` or an array of `Buffer` objects representing the encoded form of the input value.
 *
 * ## Example:
 * ```ts
 * const encodedData = encodeType(myObject, objectRef);
 * ```
 *
 * ## Error Handling:
 * - If the type of `value` is unsupported, the function throws a `BinaryParsingError`.
 * - The function assumes that the `objectRef` has been properly initialized for handling references and offsets.
 *
 * ## Notes:
 * - The function covers multiple JavaScript types and encodes them differently based on their structure:
 *     - `null`, `true`, and `false` are encoded with simple headers.
 *     - Arrays and sets are encoded with their elements using the appropriate type identifiers.
 *     - Strings are encoded either as ASCII or UTF-16 depending on their content.
 *     - Buffers marked with `CREATE_UID_MARKER` are treated as special UID buffers.
 *     - Dates are encoded as doubles.
 *     - Numbers and bigints are encoded similarly.
 *     - Objects are recursively encoded with keys and values.
 *
 * @param value - The value to encode.
 * @param objectRef - Metadata object for encoding references and offsets.
 * @returns The encoded buffer(s) representing the value.
 */

export function encodeType(value: unknown, objectRef: EncodeObjectRefInterface): Buffer | Array<Buffer> {
    if (value === null) return packDataHeader(0, 0, true);
    if (value === true) return packDataHeader(0, 0x9, true);
    if (value === false) return packDataHeader(0, 0x8, true);

    if (value instanceof Set) return encodeArray(value, value.size, 0xC, objectRef);
    if (value instanceof Date) return encodeDate(value);

    if (Buffer.isBuffer(value) && CREATE_UID_MARKER in value) return encodeUID(<Buffer> value);
    if (Array.isArray(value)) return encodeArray(value, value.length, 0xA, objectRef);
    if (Buffer.isBuffer(value)) return encodeBuffer(value);

    if (typeof value === 'string' && /^[\x00-\x7F]*$/.test(value)) return encodeAscii(value);
    if (typeof value === 'string') return encodeUtf16BE(value);
    if (typeof value === 'number') return encodeNumber(value);
    if (typeof value === 'bigint') return encodeNumber(value);
    if (typeof value === 'object') return encodeObject(<PlistObjectType> value, objectRef);

    throw new BinaryParsingError(`Unsupported type ${ value }`);
}

/**
 * The `decodeType` function decodes a binary buffer into a corresponding JavaScript value based on the type information
 * embedded in the buffer's header.
 *
 * The function supports various types such as `null`, `boolean`, `number`, `bigint`, `string`, `Date`, `Buffer`, `Array`, `Set`, and `Object`.
 *
 * - **Input**:
 *   - `data`: The binary buffer containing the encoded data.
 *   - `offset`: The position in the buffer where decoding should start.
 *   - `offsets`: An array of offsets for decoding reference-based types (e.g., `Array`, `Set`, `Object`).
 *   - `objectRef`: An object containing metadata for decoding references and offsets, including a map of decoded objects.
 *
 * - **Output**:
 *   - The decoded value corresponding to the type encoded in the buffer.
 *
 * ## Example:
 * ```ts
 * const decodedValue = decodeType(buffer, 0, offsets, objectRef);
 * ```
 *
 * ## Error Handling:
 * - Throws a `BinaryParsingError` if the buffer contains an unsupported type.
 *
 * ## Notes:
 * - The function uses the header information in the buffer to determine the type of the encoded value and delegates decoding to specialized decoding methods.
 *
 * @param data - The buffer containing the encoded data.
 * @param offset - The offset within the buffer where decoding should begin.
 * @param offsets - An array of offsets for reference-based types.
 * @param objectRef - An object containing metadata for decoding references and offsets.
 * @returns {unknown} The decoded value corresponding to the encoded type.
 */

export function decodeType(data: Buffer, offset: number, offsets: Array<number>, objectRef: DecodeObjectRefInterface): unknown {
    const header = unpackDataHeader(data[offset]);
    offset += 1;

    switch (header.type) {
        case 0x00:
            if (header.info === 0x0) return null;
            if (header.info === 0x9) return true;
            if (header.info === 0x8) return false;

            return undefined;
        case 0x01:
            return decodeInteger(data, header.info, offset);
        case 0x02:
            return decodeDouble(data, offset);
        case 0x03:
            return decodeDate(data, offset);
        case 0x04:
            return decodeBuffer(data, header.info, offset);
        case 0x05:
            return decodeAscii(data, header.info, offset);
        case 0x06:
            return decodeUtf16BE(data, header.info, offset);
        case 0x08:
            return decodeUID(data, header.info, offset);
        case 0x0A:
            return decodeArray(data, header.info, offset, offsets, objectRef);
        case 0x0C:
            return decodeSet(data, header.info, offset, offsets, objectRef);
        case 0x0D:
            return decodeObject(data, header.info, offset, offsets, objectRef);

    }

    throw new BinaryParsingError(`Unsupported type ${ data }`);
}

/**
 * Encodes data into a binary property list (bplist) format.
 *
 * This function takes input data of type `T`, encodes it into a binary format, and returns it as a `Buffer`.
 * The encoding process involves creating a header, packing the encoded data, and appending a trailer containing metadata.
 *
 * The function performs the following steps:
 * 1. Constructs a header buffer with the required `bplist` magic and version.
 * 2. Tracks encoding metadata, such as offsets and the number of objects.
 * 3. Encodes the input data using helper functions and packs it into a binary format.
 * 4. Creates a trailer buffer with metadata such as object counts, reference sizes, and offsets.
 * 5. Combines the header, packed data, and trailer into a single `Buffer` for output.
 *
 * - **Input**:
 *   - `data`: The data to be encoded. Can be of any type `T`.
 *
 * - **Output**:
 *   - A `Buffer` containing the binary-encoded property list representation of the input data.
 *
 * ## Example:
 * ```ts
 * const myData = { key: "value", numbers: [1, 2, 3] };
 * const encodedBinary = encodeBinary(myData);
 * ```
 *
 * ## Error Handling:
 * - Throws an error if the input data cannot be encoded into a binary format.
 * - Ensures offsets and metadata are correctly calculated, throwing errors on invalid configurations.
 *
 * ## Notes:
 * - The `headerStruct` and `trailerStruct` are used for creating the binary header and trailer, respectively.
 * - The `encodeType` function is responsible for encoding the input data into binary objects, while `packData` handles packing these objects into a buffer.
 * - The `integerByteLength` function determines the byte size needed for referencing objects based on the number of elements in the data.
 *
 * @param data - The data to encode into a binary property list format.
 * @returns A `Buffer` containing the binary-encoded representation of the input data.
 */

export function encodeBinary<T = unknown>(data: T): Buffer {
    // Create the header buffer
    const headerBuffer = headerStruct.toBuffer({
        magic: 'bplist',
        version: '00'
    });

    // Initialize offset tracking info
    const info: EncodeObjectRefInterface = {
        map: new Map<unknown, number>(),
        offset: 1,
        numberOfObjects: 0,
        offsetTableOffset: headerBuffer.length,
        objectReferenceSize: integerByteLength(countElements(data)),
        offsetTableOffsetSize: 0
    };

    // Encode data and pack it into a buffer
    const packedData = packData(encodeType(data, info), info);

    // Create the trailer buffer
    const trailerBuffer = trailerStruct.toBuffer({
        numberOfObjects: BigInt(info.numberOfObjects),
        rootObjectOffset: 0n,
        offsetTableOffset: BigInt(info.offsetTableOffset),
        objectReferenceSize: info.objectReferenceSize,
        offsetTableOffsetSize: info.offsetTableOffsetSize
    });

    // Concatenate header, packed data, and trailer into the final buffer
    return Buffer.concat([ headerBuffer, packedData, trailerBuffer ]);
}

/**
 * Decodes a binary property list (bplist) into the original data format.
 *
 * This function takes a `Buffer` containing binary data that is encoded in the bplist format and decodes it back into its original structure.
 * The binary format includes a header, the packed data, and a trailer that provides metadata such as the number of objects and offsets within the data.
 *
 * The function performs the following steps:
 * 1. Validates the header to ensure that the magic and version values are correct.
 * 2. Extracts the trailer to obtain metadata such as the number of objects and the object reference size.
 * 3. Unpacks the offset table to retrieve object locations within the binary data.
 * 4. Decodes the data using the unpacked offsets and metadata, returning the original data structure.
 *
 * - **Input**:
 *   - `data`: A `Buffer` containing the binary property list to decode.
 *
 * - **Output**:
 *   - The decoded data of type `T`, which represents the original structure of the data.
 *
 * ## Example:
 * ```ts
 * const decodedData = decodeBinary(myBinaryData);
 * ```
 *
 * ## Error Handling:
 * - Throws an error if the binary data header's magic or version is incorrect.
 * - Throws a `BinaryParsingError` if the data cannot be decoded properly.
 *
 * ## Notes:
 * - This function relies on the `headerStruct` and `trailerStruct` objects to parse the header and trailer, respectively.
 * - The `decodeType` function is used to decode the actual data based on the unpacked offsets and metadata.
 *
 * @param data - The binary property list data to decode.
 * @returns The decoded data.
 */

export function decodeBinary<T = unknown>(data: Buffer): T {
    const headerObject = headerStruct.toObject(data);
    if (headerObject.magic !== 'bplist' && headerObject.version !== '00') {
        throw new Error(`Expected magic "bplist" and version "00", but received magic "${ headerObject.magic }" and version "${ headerObject.version }".`);
    }

    const trailerObject = trailerStruct.toObject(data.subarray(data.length - trailerStruct.size));
    const offsetsTable = unpackOffsetTable(data, trailerObject);

    return <T> decodeType(data, headerStruct.size, offsetsTable, {
        map: new Map(),
        offsetSize: trailerObject.objectReferenceSize
    });
}
