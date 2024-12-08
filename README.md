# Property List Encoder/Decoder (xPlist)
This project provides functionality to encode and decode Property List (plist) data in both XML and binary formats. 
Property Lists (plists) are commonly used in macOS and iOS applications for storing serialized data. 
This library enables easy conversion between these formats, supporting a variety of data types like strings, numbers, dates, buffers, arrays, set, and dictionaries.

## Features
- **Encoding**:
    - Encode plist data to both **XML** and **binary** formats.
    - Supports encoding complex data types like objects, arrays, sets, and buffers.
    - Handles various types like strings, numbers, booleans, dates, and `UID`s.

- **Decoding**:
    - Decode plist data from **XML** and **binary** formats back into JavaScript objects.
    - Supports nested structures such as dictionaries, arrays, and sets.

## Table of Contents
- [Installation](#installation)
- [Usage](#usage)
    - [Encode to XML](#encode-to-xml)
    - [Encode to Binary](#encode-to-binary)
    - [Decode from XML](#decode-from-xml)
    - [Decode from Binary](#decode-from-binary)
- [Data Types](#data-types)


## Installation
You can install the package via npm or yarn:
```shell
npm install @remotex-labs/xplist
```

or

```shell
yarn add @remotex-labs/xplist
```

## Usage
### Encode to XML

To encode a JavaScript object to XML format:
```ts
import { encodePlist } from '@remotex-labs/xplist';

const myObject = {
    name: 'John',
    age: 30,
    isActive: true,
    createdAt: new Date()
};

const xml = encodePlist(myObject);
console.log(xml);

/**
 * <?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>name</key><string>John</string><key>age</key><integer>30</integer><key>isActive</key><true/><key>createdAt</key><date>2024-12-18T00:53:42.449Z</date></dict></plist>
 */

```

### Encode to Binary

To encode a JavaScript object to binary format:
```ts
import { encodeBinary } from '@remotex-labs/xplist';

const myObject = {
    name: 'John',
    age: 30,
    isActive: true,
    createdAt: new Date()
};

const binaryData = encodeBinary(myObject);
console.log(binaryData);

// 62706c6973743030d40103050702040608546e616d65544a6f686e53616765101e58697341637469766509596372656174656441743341c6892a6cc581060811161b1f212a2b35000000000000010100000000000000090000000000000000000000000000003e
```

### Decode from XML

To decode an XML plist back into a JavaScript object:
```ts
import { decodedObject } from '@remotex-labs/xplist';

const xmlData = `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0">
    <dict>
        <key>name</key>
        <string>John</string>
        <key>age</key>
        <integer>30</integer>
        <key>isActive</key>
        <true/>
        <key>createdAt</key>
        <date>2024-12-18T10:00:00Z</date>
    </dict>
</plist>`;

const decodedObject = decodePlist(xmlData);
console.log(decodedObject);
```

### Decode from Binary

To decode a binary plist back into a JavaScript object:

```ts
import { decodeBinary } from '@remotex-labs/xplist';

const binaryData = Buffer.from('62706c6973743030d40103050702040608546e616d65544a6f686e53616765101e58697341637469766509596372656174656441743341c6892a6cc581060811161b1f212a2b35000000000000010100000000000000090000000000000000000000000000003e', 'hex');
const decodedObject = decodeBinary(binaryData);
console.log(decodedObject);

```

## Data Types
The library supports encoding and decoding of a variety of common data types:

    - String (string)
    - Number (number)
    - BigInt (bigint)
    - Boolean (true, false)
    - Date (Date)
    - Buffer (Buffer)
    - Array (Array<unknown>)
    - Set (Set<unknown>)
    - Object ({ [key: string]: unknown })

For binary encoding, the following special types are supported:

    - UID (Buffer)
    - Binary Data (Buffer)
