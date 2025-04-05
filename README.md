# Property List Encoder/Decoder (@remotex-labs/xPlist)
A lightweight TypeScript/JavaScript library for encoding and decoding property lists (plist) in both XML and binary formats. 
Property Lists are commonly used in macOS and iOS applications for storing serialized data and configuration files.

[](https://www.npmjs.com/package/@remotex-labs/xplist)[](https://opensource.org/licenses/MPL-2.0)[](https://www.npmjs.com/package/@remotex-labs/xplist)

## Features
- **Universal Formats**: Encode and decode between JavaScript objects and both XML and binary plist formats
- **Type Support**: Handle a rich variety of data types including strings, numbers, booleans, dates, buffers, arrays, sets, and dictionaries
- **Performance**: Optimized for efficient processing of large property list files
- **Cross-Platform**: Works in Node.js (>=18) environments
- **ESM & CJS Support**: Compatible with both module systems
- **Modular Imports**: Import only the functionality you need to reduce bundle size

## Installation
Install via npm:
``` bash
npm install @remotex-labs/xplist
```
Or using yarn:
``` bash
yarn add @remotex-labs/xplist
```

## Usage

### Import Options
You can import the entire library or just the specific format functionality you need:

```typescript
// Import everything
import { encodePlist, decodePlist, encodeBinary, decodeBinary } from '@remotex-labs/xplist';

// Import only XML plist functionality (5KB)
import { encodePlist, decodePlist } from '@remotex-labs/xplist/xml';

// Import only binary plist functionality (9KB)
import { encodeBinary, decodeBinary, CreateUID } from '@remotex-labs/xplist/binary';
```

### Encode to XML Format
``` typescript
import { encodePlist } from '@remotex-labs/xplist/xml';
// OR: import { encodePlist } from '@remotex-labs/xplist';

const data = {
  name: 'John',
  age: 30,
  isActive: true,
  createdAt: new Date(),
  scores: [95, 87, 92],
  metadata: {
    roles: ['admin', 'user'],
    settings: {
      darkMode: true
    }
  }
};

const xmlString = encodePlist(data);
console.log(xmlString);
```

### Encode to Binary Format
``` typescript
import { encodeBinary } from '@remotex-labs/xplist/binary';
// OR: import { encodeBinary } from '@remotex-labs/xplist';

const data = {
  name: 'John',
  age: 30,
  isActive: true,
  createdAt: new Date()
};

const binaryData = encodeBinary(data);
// Output is a Buffer containing the binary plist format
```

### Decode from XML Format
``` typescript
import { decodePlist } from '@remotex-labs/xplist/xml';
// OR: import { decodePlist } from '@remotex-labs/xplist';

const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>name</key>
    <string>John</string>
    <key>age</key>
    <integer>30</integer>
    <key>isActive</key>
    <true/>
    <key>createdAt</key>
    <date>2024-07-15T12:00:00Z</date>
  </dict>
</plist>`;

const data = decodePlist(xmlString);
console.log(data);
// { name: 'John', age: 30, isActive: true, createdAt: Date(2024-07-15T12:00:00.000Z) }
```

### Decode from Binary Format
``` typescript
import { decodeBinary } from '@remotex-labs/xplist/binary';
// OR: import { decodeBinary } from '@remotex-labs/xplist';


// Binary data as a Buffer or Uint8Array
const binaryData = Buffer.from(/* binary data here */);
const data = decodeBinary(binaryData);
console.log(data);
```

## Bundle Size
When using selective imports, you can significantly reduce your application's bundle size:
- XML module: ~5KB
- Binary module: ~8KB
- Full package: ~13KB


## Supported Data Types
This library handles a wide range of data types for both encoding and decoding:

| JavaScript Type | XML Plist               | Binary Plist    |
| --- |-------------------------|-----------------|
| String | `<string>`              | String          |
| Number | `<integer>` or `<real>` | Integer or Real |
| BigInt | `<integer>`             | Integer         |
| Boolean | `<true/>` or `<false/>` | Boolean         |
| Date | `<date>`                | Date            |
| Buffer | `<data>`                | Data            |
| Array | `<array>`               | Array           |
| Set | `<array>`               | Set             |
| Object | `<dict>`                | Dictionary      |
| null/undefined | Not supported           | Not supported   |

Additionally, binary plists support:
- UID types (represented as Buffer)
- Binary data (represented as Buffer)

## Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## License
This project is licensed under the Mozilla Public License Version 2.0 - see the LICENSE file for details.

## Links
- [GitHub Repository](https://github.com/remotex-lab/xPlist)
- [Issue Tracker](https://github.com/remotex-lab/xPlist/issues)
- [npm Package](https://www.npmjs.com/package/@remotex-labs/xplist)
