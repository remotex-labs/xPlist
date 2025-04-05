/**
 * Import will remove at compile time
 */

import type {
    DecodeObjectRefInterface,
    EncodeObjectRefInterface
} from '@services/interfaces/binary-service.interface';
import type { IntegerByteLengthType } from '@components/interfaces/numbers-component.interface';
import type { PlistArrayType, PlistObjectType } from '@services/interfaces/plist-service.interface';

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
import { integerByteLength, readInteger, validateSafeInteger, writeInteger } from '@components/numbers.component';

/**
 * CREATE_UID_MARKER
 */

const CREATE_UID_MARKER = '__isCreateUID';

/**
 * Counts all elements in a given data structure
 *
 * @param data - The data structure (array, object, or primitive) to count the elements from
 * @returns The total number of elements in the data structure
 *
 * @example
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
 * @since 1.0.1
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
 * Generates a unique identifier (UID) as a Buffer
 *
 * @param id - The value to create the UID from (string, number, or Buffer)
 * @returns The generated UID as a Buffer
 *
 * @throws TypeError - If the input type is not supported
 *
 * @example
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
 * @since 1.0.1
 */

export function CreateUID(id: number | string | Buffer): Buffer {
    let buffer: Buffer;
    if (typeof id === 'number') {
        const size = integerByteLength(id);
        buffer = Buffer.alloc(size);
        writeInteger(buffer, id, size);
    } else if (typeof id === 'string') {
        buffer = Buffer.from(id);
    } else if (Buffer.isBuffer(id)) {
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
 * Encodes an item by checking if it has been previously encountered (referenced)
 *
 * @param item - The item to encode. Can be any data type
 * @param objectRef - Contains the map of previously encoded items and the current offset
 * @param referenceMap - The reference map to store the index or offset of the item
 * @returns An array of Buffers representing the encoded item
 *
 * @remarks
 * If the item has not been seen before, it is encoded and added to the reference map with a new offset.
 * If the item has been previously encoded, the function adds its index from the reference map.
 * This ensures that each item is encoded only once and avoids duplicate encoding.
 *
 * @example
 * ```ts
 * const objectRef = { map: new Map(), offset: 0 };
 * const referenceMap: number[] = [];
 * const encodedItem = encodeReference(item, objectRef, referenceMap);
 * ```
 *
 * @see EncodeObjectRefInterface
 * @since 1.0.1
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
 * Decodes a reference to an item based on its index and the associated offset in the buffer
 *
 * @param buffer - The buffer containing the encoded data to decode
 * @param index - The index pointing to the reference in the offsets array
 * @param offsets - The offsets array that links the reference index to specific positions in the buffer
 * @param objectRef - The reference object containing a map of already decoded objects
 *
 * @returns The decoded object corresponding to the given reference
 *
 * @remarks
 * If the item has already been decoded (using the reference map), it retrieves the object from the map.
 * If not, the function decodes the object, stores it in the reference map, and returns it.
 * This ensures that each object is only decoded once, storing it in the objectRef.map for subsequent lookups.
 *
 * @example
 * ```ts
 * const decodedObject = decodeReference(buffer, index, offsets, objectRef);
 * ```
 *
 * @see DecodeObjectRefInterface
 * @since 1.0.1
 */

export function decodeReference(buffer: Buffer, index: number, offsets: Array<number>, objectRef: DecodeObjectRefInterface): unknown {
    const objectIndex = offsets[index];
    let object = objectRef.map.get(objectIndex);
    if (object === undefined) {
        object = decodeType(buffer, objectIndex, offsets, objectRef);
        objectRef.map.set(objectIndex, object);
    }

    return object;
}

/**
 * Encodes an object into a binary format compatible with property lists (bplist)
 *
 * @param value - The object to encode into binary format
 * @param objectRef - An object implementing EncodeObjectRefInterface for managing references and offsets during encoding
 *
 * @returns An array of Buffer objects representing the encoded data, including metadata and key-value buffers
 *
 * @remarks
 * This function takes an object with key-value pairs and encodes it into binary buffers.
 * It tracks references to each key and value in the object, generating metadata and binary
 * representations for each element.
 *
 * The function performs the following steps:
 * 1. Iterates over the keys of the object.
 * 2. Encodes each key and its corresponding value using encodeReference, which resolves references
 *    and generates buffers for each element.
 * 3. Creates a binary object representation of the metadata, including references to keys and values.
 * 4. Combines the metadata and encoded keys/values into an array of buffers for output.
 *
 * @throws Will throw an error if any key or value in the object cannot be encoded
 *
 * @example
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
 * @see PlistObjectType
 * @see EncodeObjectRefInterface
 *
 * @since 1.0.1
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
 * Decodes a serialized object from a given buffer by reading the key-value pairs
 *
 * @param buffer - The buffer containing the serialized object data
 * @param length - The number of key-value pairs to decode
 * @param offset - The starting offset in the buffer for decoding the object
 * @param offsets - The list of offsets for decoding reference data
 * @param objectRef - The decoding reference interface containing the map of previously decoded objects
 *
 * @returns The decoded object containing the key-value pairs
 *
 * @remarks
 * This function resolves references to decode both keys and values, ensuring that previously
 * decoded objects are reused efficiently. Keys are expected to be strings, and their values
 * are decoded accordingly. It utilizes the decodeReference function to resolve references for
 * both keys and values.
 *
 * @throws May throw errors if offset or index calculations are incorrect, or if references to
 * keys or values do not exist or have been corrupted
 *
 * @example
 * ```ts
 * const decodedObject = decodeObject(buffer, length, offset, offsets, objectRef);
 * ```
 * @see PlistObjectType
 * @see DecodeObjectRefInterface
 *
 * @since 1.0.1
 */

export function decodeObject(buffer: Buffer, length: number, offset: number, offsets: Array<number>, objectRef: DecodeObjectRefInterface): PlistObjectType {
    const object: PlistObjectType = {};
    let bytesLength = length * objectRef.offsetSize;

    if (length > 0xE) {
        const intHeader = unpackDataHeader(buffer[offset]);
        const size = decodeInteger(buffer, intHeader.info, offset + 1);
        validateSafeInteger(size, 'decodeObject offsets size');

        offset += (1 + 2 ** intHeader.info);
        bytesLength = Number(size) * objectRef.offsetSize;
    }

    for (let i = 0; i < bytesLength; i += objectRef.offsetSize) {
        const keyIndex = Number(
            readInteger(buffer, <IntegerByteLengthType>objectRef.offsetSize, offset + i)
        );
        const valueIndex = Number(
            readInteger(buffer, <IntegerByteLengthType>objectRef.offsetSize, offset + bytesLength + i)
        );

        const keyObject = decodeReference(buffer, keyIndex, offsets, objectRef);
        object[(<string>keyObject).toString()] = decodeReference(buffer, valueIndex, offsets, objectRef);
    }

    return object;
}

/**
 * Encodes an array or set into a binary format compatible with property lists (bplist)
 *
 * @param value - An array or set to encode into binary format
 * @param length - The number of elements in the input array or set
 * @param type - A type identifier representing the array or set in the bplist format
 * @param objectRef - An object implementing EncodeObjectRefInterface for managing references and offsets during encoding
 *
 * @returns An array of Buffer objects representing the encoded data, including metadata and element buffers
 *
 * @remarks
 * This function tracks references to each element in the input, ensuring proper metadata is generated
 * for the encoded structure.
 *
 * @throws Will throw an error if any element in the array or set cannot be encoded
 *
 * @example
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
 * @see encodeObject - Related function for encoding objects
 * @see encodeObjects - Function used to create binary metadata
 * @see encodeReference - Function used to encode individual elements
 * @see EncodeObjectRefInterface - Interface for managing references
 *
 * @since 1.0.1
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
 * Decodes an array by extracting its elements from the provided buffer
 *
 * @param buffer - The buffer containing the encoded data of the array
 * @param length - The number of elements in the array
 * @param offset - The offset in the buffer where the array's data begins
 * @param offsets - An array of offsets used for decoding references in the buffer
 * @param objectRef - The decoding reference interface managing the decoding process
 *
 * @returns A decoded array containing the deserialized elements
 *
 * @remarks
 * Each element is decoded using references stored in the buffer and the provided offsets and reference map.
 * The function processes the buffer data to extract indices of elements and then uses those indices to
 * retrieve and decode the actual element data.
 *
 * @throws May throw errors if the reference or offsets are invalid or if integer values exceed safe limits
 *
 * @example
 * ```ts
 * const decodedArray = decodeArray(buffer, length, offset, offsets, objectRef);
 * ```
 *
 * @see PlistArrayType
 * @see DecodeObjectRefInterface
 *
 * @since 1.0.1
 */

export function decodeArray(buffer: Buffer, length: number, offset: number, offsets: Array<number>, objectRef: DecodeObjectRefInterface): PlistArrayType {
    const array: PlistArrayType = [];
    let bytesLength = length * objectRef.offsetSize;

    if (length > 0xE) {
        const intHeader = unpackDataHeader(buffer[offset]);
        const size = decodeInteger(buffer, intHeader.info, offset + 1);
        validateSafeInteger(size, 'DecodeArray offsets size');

        offset += (1 + 2 ** intHeader.info);
        bytesLength = Number(size) * objectRef.offsetSize;
    }

    for (let i = 0; i < bytesLength; i += objectRef.offsetSize) {
        const index = Number(
            readInteger(buffer, <IntegerByteLengthType>objectRef.offsetSize, offset + i)
        );
        array.push(decodeReference(buffer, index, offsets, objectRef));
    }

    return array;
}

/**
 * Decodes a set from a provided buffer
 *
 * @param buffer - The buffer containing the encoded data of the set
 * @param length - The number of elements in the set
 * @param offset - The offset in the buffer where the set's data begins
 * @param offsets - An array of offsets used for decoding references in the buffer
 * @param objectRef - The decoding reference interface that manages decoding references
 *
 * @returns A decoded set containing the deserialized elements
 *
 * @remarks
 * The elements of the set are decoded by extracting references from the buffer using
 * the provided offsets and reference map. The function processes the buffer data to
 * extract indices of elements and then uses those indices to retrieve and decode the
 * actual element data.
 *
 * @throws May throw errors if the reference or offsets are invalid or if integer values
 * exceed safe limits
 *
 * @example
 * ```ts
 * const decodedSet = decodeSet(buffer, length, offset, offsets, objectRef);
 * ```
 *
 * @see DecodeObjectRefInterface
 *
 * @since 1.0.1
 */

export function decodeSet(buffer: Buffer, length: number, offset: number, offsets: Array<number>, objectRef: DecodeObjectRefInterface): Set<unknown> {
    const set = new Set<unknown>();
    let bytesLength = length * objectRef.offsetSize;

    if (length > 0xE) {
        const intHeader = unpackDataHeader(buffer[offset]);
        const size = decodeInteger(buffer, intHeader.info, offset + 1);
        validateSafeInteger(size, 'decodeSet offsets size');

        offset += (1 + 2 ** intHeader.info);
        bytesLength = Number(size) * objectRef.offsetSize;
    }

    for (let i = 0; i < bytesLength; i += objectRef.offsetSize) {
        const index = Number(
            readInteger(buffer, <IntegerByteLengthType>objectRef.offsetSize, offset + i)
        );
        set.add(decodeReference(buffer, index, offsets, objectRef));
    }

    return set;
}

/**
 * Packs encoded binary data and generates an offset table
 *
 * @param data - A single Buffer or an array of Buffer objects to be packed
 * @param info - An object implementing EncodeObjectRefInterface for tracking metadata during the encoding process
 * @returns A Buffer containing the packed data and offset table
 *
 * @remarks
 * This function combines multiple Buffer objects into a single binary structure with an offset table.
 * It calculates offsets for each data object, determines the required offset size,
 * and appends an offset table to the packed data. The process involves:
 * 1. Converting the input into an array of Buffer objects (if it's a single Buffer)
 * 2. Calculating offsets for each object based on their lengths
 * 3. Determining the size of offsets required to reference all objects efficiently
 * 4. Combining the data objects and the offset table into a single output Buffer
 *
 * @throws Will throw an error if any invalid or incompatible Buffer is provided
 *
 * @example
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
 * @see EncodeObjectRefInterface - Interface for tracking encoding metadata
 *
 * @since 1.0.1
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
 * Encodes various JavaScript types into their corresponding binary representations
 *
 * @param value - The value to encode, which can be null, boolean, number, bigint, string, Date, Buffer, Set, Array, or Object
 * @param objectRef - Metadata object for encoding references and offsets
 *
 * @returns The encoded buffer(s) representing the value
 *
 * @throws BinaryParsingError - If the type of value is unsupported
 *
 * @remarks
 * This function handles a wide range of JavaScript types and encodes them differently based on their structure:
 * - null, true, and false are encoded with simple headers
 * - Arrays and sets are encoded with their elements using the appropriate type identifiers
 * - Strings are encoded either as ASCII or UTF-16 depending on their content
 * - Buffers marked with CREATE_UID_MARKER are treated as special UID buffers
 * - Dates are encoded as doubles
 * - Numbers and bigint are encoded appropriately
 * - Objects are recursively encoded with keys and values
 *
 * @example
 * ```ts
 * const encodedData = encodeType(myObject, objectRef);
 * ```
 *
 * @see EncodeObjectRefInterface
 *
 * @since 1.0.1
 */

export function encodeType(value: unknown, objectRef: EncodeObjectRefInterface): Buffer | Array<Buffer> {
    if (value === null) return packDataHeader(0, 0, true);
    if (value === true) return packDataHeader(0, 0x9, true);
    if (value === false) return packDataHeader(0, 0x8, true);

    if (value instanceof Set) return encodeArray(value, value.size, 0xC, objectRef);
    if (value instanceof Date) return encodeDate(value);

    if (Buffer.isBuffer(value) && CREATE_UID_MARKER in value) return encodeUID(<Buffer>value);
    if (Array.isArray(value)) return encodeArray(value, value.length, 0xA, objectRef);
    if (Buffer.isBuffer(value)) return encodeBuffer(value);

    if (typeof value === 'string' && /^[\x00-\x7F]*$/.test(value)) return encodeAscii(value);
    if (typeof value === 'string') return encodeUtf16BE(value);
    if (typeof value === 'number') return encodeNumber(value);
    if (typeof value === 'bigint') return encodeNumber(value);
    if (typeof value === 'object') return encodeObject(<PlistObjectType>value, objectRef);

    throw new BinaryParsingError(`Unsupported type ${ value }`);
}

/**
 * Decodes a binary buffer into a corresponding JavaScript value based on the type information embedded in the buffer's header
 *
 * @param data - The buffer containing the encoded data
 * @param offset - The offset within the buffer where decoding should begin
 * @param offsets - An array of offsets for reference-based types
 * @param objectRef - An object containing metadata for decoding references and offsets
 *
 * @returns The decoded value corresponding to the encoded type
 *
 * @throws BinaryParsingError - If the buffer contains an unsupported type
 *
 * @remarks
 * The function supports various types such as null, boolean, number, bigint, string, Date, Buffer, Array, Set, and Object.
 * It uses the header information in the buffer to determine the type of the encoded value and delegates decoding to specialized decoding methods.
 *
 * @example
 * ```ts
 * const decodedValue = decodeType(buffer, 0, offsets, objectRef);
 * ```
 *
 * @see DecodeObjectRefInterface
 *
 * @since 1.0.1
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
 * Encodes data into a binary property list (bplist) format
 *
 * @param data - The data to encode into a binary property list format
 *
 * @returns A Buffer containing the binary-encoded representation of the input data
 *
 * @throws Error if the input data cannot be encoded into a binary format
 *
 * @remarks
 * The encoding process involves creating a header, packing the encoded data, and appending a trailer containing metadata.
 * The function performs the following steps:
 * 1. Constructs a header buffer with the required 'bplist' magic and version
 * 2. Tracks encoding metadata, such as offsets and the number of objects
 * 3. Encodes the input data using helper functions and packs it into a binary format
 * 4. Creates a trailer buffer with metadata such as object counts, reference sizes, and offsets
 * 5. Combines the header, packed data, and trailer into a single Buffer for output
 *
 * @example
 * ```ts
 * const myData = { key: "value", numbers: [1, 2, 3] };
 * const encodedBinary = encodeBinary(myData);
 * ```
 *
 * @since 1.0.1
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
 * Decodes a binary property list (bplist) into the original data format
 *
 * @param data - The binary property list data to decode
 *
 * @returns The decoded data
 *
 * @throws Error - If the binary data header's magic or version is incorrect
 * @throws BinaryParsingError - If the data cannot be decoded properly
 *
 * @remarks
 * This function takes a Buffer containing binary data that is encoded in the bplist format and decodes it back into its original structure.
 * The binary format includes a header, the packed data, and a trailer that provides metadata such as the number of objects and offsets within the data.
 * The function performs the following steps:
 * 1. Validates the header to ensure that the magic and version values are correct
 * 2. Extracts the trailer to obtain metadata such as the number of objects and the object reference size
 * 3. Unpacks the offset table to retrieve object locations within the binary data
 * 4. Decodes the data using the unpacked offsets and metadata, returning the original data structure
 *
 * @example
 * ```ts
 * const decodedData = decodeBinary(myBinaryData);
 * ```
 *
 * @since 1.0.0
 */


export function decodeBinary<T = unknown>(data: Buffer): T {
    const headerObject = headerStruct.toObject(data);
    if (headerObject.magic !== 'bplist' && headerObject.version !== '00') {
        throw new Error(`Expected magic "bplist" and version "00", but received magic "${ headerObject.magic }" and version "${ headerObject.version }".`);
    }

    const trailerObject = trailerStruct.toObject(data.subarray(data.length - trailerStruct.size));
    const offsetsTable = unpackOffsetTable(data, trailerObject);

    return <T>decodeType(data, headerStruct.size, offsetsTable, {
        map: new Map(),
        offsetSize: trailerObject.objectReferenceSize
    });
}
