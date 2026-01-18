# Features Research: Node.js ECDH API

**Domain:** Cryptographic key exchange (ECDH)
**Researched:** 2026-01-18
**Confidence:** HIGH (verified against Node.js official documentation v25.3.0)

## Executive Summary

The Node.js crypto ECDH API provides a complete implementation for Elliptic Curve Diffie-Hellman key exchange. The API surface is well-defined with a factory function, six instance methods (one deprecated), and one static method. For secp256k1 implementation, the focus should be on raw key operations with proper format handling (compressed/uncompressed).

---

## API Surface

### crypto.createECDH(curveName)

**Factory Function**

```typescript
function createECDH(curveName: string): ECDH
```

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| curveName | string | Yes | Name of the elliptic curve (e.g., 'secp256k1') |

**Returns:** ECDH instance

**Behavior:**
- Creates a new ECDH object for the specified curve
- Throws if curve name is invalid or unsupported
- Valid curves can be retrieved via `crypto.getCurves()`

**Error Conditions:**
- `ERR_CRYPTO_INVALID_CURVE` - Invalid or unsupported curve name

---

### crypto.getCurves()

**Utility Function**

```typescript
function getCurves(): string[]
```

**Returns:** Array of supported curve names

**Behavior:**
- Returns all elliptic curves supported by the OpenSSL build
- Includes: 'secp256k1', 'prime256v1', 'secp384r1', 'secp521r1', etc.

---

## ECDH Class Methods

### ECDH.convertKey(key, curve[, inputEncoding[, outputEncoding[, format]]])

**Static Method** (Added in v10.0.0)

```typescript
static convertKey(
  key: string | ArrayBuffer | Buffer | TypedArray | DataView,
  curve: string,
  inputEncoding?: BufferEncoding,
  outputEncoding?: BufferEncoding,
  format?: 'compressed' | 'uncompressed' | 'hybrid'
): Buffer | string
```

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| key | string \| ArrayBuffer \| Buffer \| TypedArray \| DataView | Yes | - | Public key to convert |
| curve | string | Yes | - | Elliptic curve name |
| inputEncoding | BufferEncoding | No | undefined | Encoding of input key string |
| outputEncoding | BufferEncoding | No | undefined | Encoding of return value |
| format | 'compressed' \| 'uncompressed' \| 'hybrid' | No | 'uncompressed' | Output point encoding |

**Returns:**
- `Buffer` if `outputEncoding` is undefined
- `string` if `outputEncoding` is specified

**Behavior:**
- Converts public key between point formats (compressed/uncompressed/hybrid)
- Does NOT require an ECDH instance (static method)
- Useful for converting keys received from other parties

**Example:**
```javascript
const { createECDH, ECDH } = require('node:crypto');
const ecdh = createECDH('secp256k1');
ecdh.generateKeys();

const compressedKey = ecdh.getPublicKey('hex', 'compressed');
const uncompressedKey = ECDH.convertKey(
  compressedKey,
  'secp256k1',
  'hex',
  'hex',
  'uncompressed'
);
```

---

### ecdh.generateKeys([encoding[, format]])

**Instance Method** (Added in v0.11.14)

```typescript
generateKeys(encoding?: BufferEncoding, format?: 'compressed' | 'uncompressed'): Buffer | string
```

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| encoding | BufferEncoding | No | undefined | Encoding of return value |
| format | 'compressed' \| 'uncompressed' | No | 'uncompressed' | Public key point format |

**Returns:**
- `Buffer` if `encoding` is undefined (raw bytes)
- `string` if `encoding` is specified (encoded string)

**Return Value:** The generated PUBLIC key (not the private key)

**Behavior:**
- Generates new private and public key pair
- Stores both keys internally in the ECDH object
- Returns only the public key (caller must use `getPrivateKey()` to retrieve private key)
- Can be called multiple times; replaces existing keys
- Internally delegates to `getPublicKey(encoding, format)` for return value

**Error Conditions:**
- `ERR_CRYPTO_OPERATION_FAILED` - Key generation failure (rare, OpenSSL error)

**Key Sizes for secp256k1:**
| Format | Size (bytes) | Hex Length |
|--------|--------------|------------|
| uncompressed | 65 | 130 |
| compressed | 33 | 66 |
| (private key) | 32 | 64 |

---

### ecdh.computeSecret(otherPublicKey[, inputEncoding[, outputEncoding]])

**Instance Method** (Added in v0.11.14)

```typescript
computeSecret(
  otherPublicKey: string | ArrayBuffer | Buffer | TypedArray | DataView,
  inputEncoding?: BufferEncoding,
  outputEncoding?: BufferEncoding
): Buffer | string
```

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| otherPublicKey | string \| ArrayBuffer \| Buffer \| TypedArray \| DataView | Yes | - | Other party's public key |
| inputEncoding | BufferEncoding | No | undefined | Encoding of otherPublicKey string |
| outputEncoding | BufferEncoding | No | undefined | Encoding of return value |

**Returns:**
- `Buffer` if `outputEncoding` is undefined (raw bytes)
- `string` if `outputEncoding` is specified (encoded string)

**Return Value:** The shared secret (32 bytes for secp256k1)

**Behavior:**
- Computes ECDH shared secret using internal private key and provided public key
- Requires that `generateKeys()` or `setPrivateKey()` was called first
- Accepts public keys in either compressed (33 bytes) or uncompressed (65 bytes) format
- Returns raw x-coordinate of the computed point (32 bytes for secp256k1)

**Error Conditions:**
- `ERR_CRYPTO_ECDH_INVALID_PUBLIC_KEY` - Public key lies outside the elliptic curve
  - Thrown when `otherPublicKey` is not a valid point on the curve
  - Common when receiving keys from untrusted/remote sources
  - MUST be caught when processing external input
- Error if no private key has been set (keys not generated)

**Security Note:**
Since `otherPublicKey` is usually supplied from a remote user over an insecure network, applications MUST handle `ERR_CRYPTO_ECDH_INVALID_PUBLIC_KEY` appropriately.

**Shared Secret Size for secp256k1:** 32 bytes (256 bits)

---

### ecdh.getPublicKey([encoding[, format]])

**Instance Method** (Added in v0.11.14)

```typescript
getPublicKey(encoding?: BufferEncoding, format?: 'compressed' | 'uncompressed'): Buffer | string
```

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| encoding | BufferEncoding | No | undefined | Encoding of return value |
| format | 'compressed' \| 'uncompressed' | No | 'uncompressed' | Point encoding format |

**Returns:**
- `Buffer` if `encoding` is undefined
- `string` if `encoding` is specified

**Behavior:**
- Returns the current public key
- Requires that keys have been generated or set
- Can return in different formats without regenerating

**Error Conditions:**
- `ERR_CRYPTO_ECDH_INVALID_FORMAT` - Invalid format parameter

---

### ecdh.getPrivateKey([encoding])

**Instance Method** (Added in v0.11.14)

```typescript
getPrivateKey(encoding?: BufferEncoding): Buffer | string
```

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| encoding | BufferEncoding | No | undefined | Encoding of return value |

**Returns:**
- `Buffer` if `encoding` is undefined
- `string` if `encoding` is specified

**Behavior:**
- Returns the current private key
- Requires that keys have been generated or set

**Private Key Size for secp256k1:** 32 bytes (256 bits)

---

### ecdh.setPrivateKey(privateKey[, encoding])

**Instance Method** (Added in v0.11.14)

```typescript
setPrivateKey(
  privateKey: string | ArrayBuffer | Buffer | TypedArray | DataView,
  encoding?: BufferEncoding
): void
```

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| privateKey | string \| ArrayBuffer \| Buffer \| TypedArray \| DataView | Yes | - | The private key |
| encoding | BufferEncoding | No | undefined | Encoding of privateKey string |

**Returns:** void

**Behavior:**
- Sets the private key
- Automatically derives and sets the corresponding public key
- Validates that key is in range [1, n-1] per SEC1 specification

**Error Conditions:**
- Error if private key is not valid for the specified curve
- Key must be exactly 32 bytes for secp256k1
- Key must be in valid range (1 to curve order - 1)

---

### ecdh.setPublicKey(publicKey[, encoding])

**Instance Method** (Added in v0.11.14, DEPRECATED since v5.2.0)

```typescript
setPublicKey(
  publicKey: string | ArrayBuffer | Buffer | TypedArray | DataView,
  encoding?: BufferEncoding
): void
```

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| publicKey | string \| ArrayBuffer \| Buffer \| TypedArray \| DataView | Yes | - | The public key |
| encoding | BufferEncoding | No | undefined | Encoding of publicKey string |

**Returns:** void

**Deprecation Warning:**
This method is **deprecated** (Stability: 0) and should NOT be used in new code. Use `setPrivateKey()` instead, which automatically derives the public key.

**Behavior:**
- Sets the public key directly
- Does NOT update the private key
- Creates inconsistent state if called after `setPrivateKey()` with different key

---

## Encoding Options

All encoding parameters accept standard Node.js Buffer encodings:

| Encoding | Description | Common Use |
|----------|-------------|------------|
| `'hex'` | Hexadecimal (2 chars per byte) | Most common for key exchange |
| `'base64'` | RFC 4648 Base64 | URL-unsafe transport |
| `'base64url'` | RFC 4648 Section 5 | URL-safe transport |
| `'utf8'` / `'utf-8'` | UTF-8 | Rarely used for keys |
| `'latin1'` | ISO-8859-1 | Binary-safe string |
| `'binary'` | Alias for `'latin1'` | Legacy |
| undefined | Return as Buffer | Default behavior |

**Recommendation:** Use `'hex'` for debugging/logging, `undefined` (Buffer) for actual cryptographic operations.

---

## Key Formats

### Point Encoding Formats

| Format | secp256k1 Size | Header Byte | Description |
|--------|----------------|-------------|-------------|
| `'uncompressed'` | 65 bytes | 0x04 | Full x,y coordinates |
| `'compressed'` | 33 bytes | 0x02 or 0x03 | x-coordinate + parity bit |
| `'hybrid'` | 65 bytes | 0x06 or 0x07 | Uncompressed with parity marker |

### Format Parameter Defaults

| Method | Default Format |
|--------|---------------|
| `generateKeys()` | 'uncompressed' |
| `getPublicKey()` | 'uncompressed' |
| `ECDH.convertKey()` | 'uncompressed' |

### Public Key Structure

**Uncompressed (65 bytes):**
```
04 || x-coordinate (32 bytes) || y-coordinate (32 bytes)
```

**Compressed (33 bytes):**
```
02 || x-coordinate (32 bytes)  // if y is even
03 || x-coordinate (32 bytes)  // if y is odd
```

**Hybrid (65 bytes):**
```
06 || x-coordinate (32 bytes) || y-coordinate (32 bytes)  // if y is even
07 || x-coordinate (32 bytes) || y-coordinate (32 bytes)  // if y is odd
```

---

## Error Conditions Summary

| Error Code | Thrown By | Cause |
|------------|-----------|-------|
| `ERR_CRYPTO_INVALID_CURVE` | `createECDH()` | Invalid or unsupported curve name |
| `ERR_CRYPTO_ECDH_INVALID_PUBLIC_KEY` | `computeSecret()` | Public key not on curve |
| `ERR_CRYPTO_ECDH_INVALID_FORMAT` | `getPublicKey()`, `generateKeys()` | Invalid format parameter |
| `ERR_CRYPTO_OPERATION_FAILED` | `generateKeys()` | OpenSSL key generation failure |
| `ERR_OUT_OF_RANGE` | Various | Buffer size exceeds Int32 bounds |
| Generic Error | `setPrivateKey()` | Private key invalid for curve |

---

## secp256k1 Specific Details

### Key Sizes

| Component | Size (bytes) | Size (bits) |
|-----------|--------------|-------------|
| Private Key | 32 | 256 |
| Public Key (compressed) | 33 | 264 |
| Public Key (uncompressed) | 65 | 520 |
| Shared Secret | 32 | 256 |

### Curve Parameters

- **Name:** secp256k1 (also known as SECG curve)
- **Field Size:** 256 bits
- **Order (n):** 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141
- **Usage:** Bitcoin, Ethereum, and many other cryptocurrencies

---

## Complete API Example

```javascript
const { createECDH, ECDH } = require('node:crypto');

// Alice generates keys
const alice = createECDH('secp256k1');
const alicePublicKey = alice.generateKeys();  // Returns Buffer (uncompressed, 65 bytes)
const alicePrivateKey = alice.getPrivateKey(); // Returns Buffer (32 bytes)

// Bob generates keys
const bob = createECDH('secp256k1');
const bobPublicKey = bob.generateKeys('hex', 'compressed');  // Returns string (66 hex chars)

// Alice computes shared secret
const aliceSecret = alice.computeSecret(
  bobPublicKey,
  'hex',       // Bob's key is hex-encoded
  undefined    // Return as Buffer
);

// Bob computes shared secret (can accept uncompressed key)
const bobSecret = bob.computeSecret(alicePublicKey);

// Secrets match
console.log(aliceSecret.equals(bobSecret)); // true
console.log(aliceSecret.length); // 32

// Convert key format
const compressedAlice = alice.getPublicKey('hex', 'compressed');
const backToUncompressed = ECDH.convertKey(
  compressedAlice,
  'secp256k1',
  'hex',
  'hex',
  'uncompressed'
);

// Import existing private key
const importedEcdh = createECDH('secp256k1');
importedEcdh.setPrivateKey(alicePrivateKey);
// Public key is automatically derived
console.log(importedEcdh.getPublicKey().equals(alicePublicKey)); // true
```

---

## Implementation Priority

### Must Implement (Table Stakes)

| Feature | Priority | Notes |
|---------|----------|-------|
| `createECDH('secp256k1')` | P0 | Factory function |
| `generateKeys()` | P0 | Core functionality |
| `computeSecret()` | P0 | Core functionality |
| `getPublicKey()` | P0 | Required for key exchange |
| `getPrivateKey()` | P0 | Required for key persistence |
| `setPrivateKey()` | P0 | Required for key import |
| Compressed/uncompressed formats | P0 | Both must work |
| Hex encoding | P0 | Most common encoding |
| Buffer return (no encoding) | P0 | Default behavior |

### Should Implement

| Feature | Priority | Notes |
|---------|----------|-------|
| `ECDH.convertKey()` | P1 | Useful static utility |
| `base64` encoding | P1 | Common for transport |
| `base64url` encoding | P1 | URL-safe transport |
| All error codes | P1 | Proper error handling |

### May Defer

| Feature | Priority | Notes |
|---------|----------|-------|
| `setPublicKey()` | P2 | Deprecated, avoid implementing |
| `hybrid` format | P2 | Rarely used |
| Other curves | P2 | Only secp256k1 required per scope |
| `getCurves()` | P2 | Only if multiple curves supported |

---

## Sources

- [Node.js Crypto Documentation v25.3.0](https://nodejs.org/api/crypto.html) - HIGH confidence
- [Node.js Errors Documentation](https://nodejs.org/api/errors.html) - HIGH confidence
- [Node.js Buffer Documentation](https://nodejs.org/api/buffer.html) - HIGH confidence
- [Bitcoin Wiki - ECDSA](https://en.bitcoin.it/wiki/Elliptic_Curve_Digital_Signature_Algorithm) - MEDIUM confidence (secp256k1 specifics)
- [Prof Bill Buchanan - Compressed/Uncompressed Keys](https://medium.com/asecuritysite-when-bob-met-alice/02-03-or-04-so-what-are-compressed-and-uncompressed-public-keys-6abcb57efeb6) - MEDIUM confidence
