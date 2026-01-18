# Phase 1: Core ECDH - Research

**Researched:** 2026-01-18
**Domain:** Node.js ECDH API implementation for secp256k1
**Confidence:** HIGH

## Summary

Phase 1 implements the Node.js `crypto.createECDH('secp256k1')` API surface for key generation and import/export. The existing codebase already has the necessary infrastructure: `HybridEcKeyPair` for EC key operations, `HybridEdKeyPair` as a pattern for ECDH derivation (X25519/X448), and `HybridKeyObjectHandle` for raw EC key import. The implementation should create a new TypeScript `ECDH` class that wraps native operations, matching Node.js behavior exactly.

Key insight: Unlike the existing `HybridEcKeyPair` which exports keys in DER/SPKI/PKCS8 format, the Node.js ECDH API expects **raw key bytes** (32-byte private key, 33/65-byte public key in EC point format). This requires new native methods specifically for raw key handling.

**Primary recommendation:** Create a dedicated `HybridEcdh` Nitro module with raw key operations, rather than extending `HybridEcKeyPair`, to keep the Node.js ECDH API cleanly separated from the WebCrypto EC API.

## Standard Stack

The implementation uses existing infrastructure with targeted additions.

### Core (Existing)
| Component | Location | Purpose | Why Standard |
|-----------|----------|---------|--------------|
| Nitro Modules | `src/specs/*.nitro.ts` | Native bridge interface | Established pattern in codebase |
| HybridObject pattern | `cpp/*/Hybrid*.cpp` | C++ implementation | Memory management, RAII |
| OpenSSL EVP APIs | OpenSSL 3.6+ | Cryptographic operations | Project requirement |
| ncrypto wrappers | `$REPOS/ncrypto` | OpenSSL RAII wrappers | Memory safety |

### New (To Create)
| Component | Location | Purpose | Pattern Reference |
|-----------|----------|---------|-------------------|
| `ecdh.nitro.ts` | `src/specs/ecdh.nitro.ts` | ECDH native interface | `edKeyPair.nitro.ts` |
| `HybridEcdh.cpp/hpp` | `cpp/ecdh/` | ECDH C++ implementation | `HybridEdKeyPair.cpp` |
| `ecdh.ts` | `src/ecdh.ts` | TypeScript ECDH class | `ed.ts` |

### TypeScript Dependencies
| Library | Purpose | When to Use |
|---------|---------|-------------|
| `buffer` | Buffer polyfill | Return types matching Node.js |
| `react-native-nitro-modules` | HybridObject creation | Native bridge |

**Installation:** No new packages required - all dependencies are existing.

## Architecture Patterns

### Recommended Project Structure
```
packages/react-native-quick-crypto/
  src/
    ecdh.ts                    # TypeScript ECDH class (NEW)
    specs/
      ecdh.nitro.ts            # Nitro interface (NEW)
  cpp/
    ecdh/                      # ECDH implementation (NEW)
      HybridEcdh.cpp
      HybridEcdh.hpp
```

### Pattern 1: ECDH Class Structure (TypeScript)

The Node.js ECDH API is class-based with mutable state. Match this pattern exactly.

**What:** TypeScript class wrapping HybridObject with state management
**When to use:** For all Node.js ECDH functionality
**Example:**
```typescript
// Source: Node.js crypto documentation pattern
export class ECDH {
  private native: HybridEcdh;
  private _curve: string;

  constructor(curve: string) {
    this.native = NitroModules.createHybridObject<HybridEcdh>('Ecdh');
    this._curve = curve;
    this.native.setCurve(curve);
  }

  generateKeys(encoding?: BufferEncoding, format?: 'compressed' | 'uncompressed'): Buffer | string {
    this.native.generateKeys();
    return this.getPublicKey(encoding, format);
  }

  getPublicKey(encoding?: BufferEncoding, format?: 'compressed' | 'uncompressed'): Buffer | string {
    const formatFlag = format === 'compressed' ? 0 : 1; // 0=compressed, 1=uncompressed
    const raw = this.native.getPublicKeyRaw(formatFlag);
    return this.encodeOutput(raw, encoding);
  }

  getPrivateKey(encoding?: BufferEncoding): Buffer | string {
    const raw = this.native.getPrivateKeyRaw();
    return this.encodeOutput(raw, encoding);
  }

  setPrivateKey(privateKey: Buffer | string, encoding?: BufferEncoding): void {
    const keyBuffer = this.decodeInput(privateKey, encoding);
    this.native.setPrivateKeyRaw(keyBuffer);
    // Public key auto-derived in native layer
  }

  private encodeOutput(data: ArrayBuffer, encoding?: BufferEncoding): Buffer | string {
    const buf = Buffer.from(data);
    return encoding ? buf.toString(encoding) : buf;
  }

  private decodeInput(data: Buffer | string, encoding?: BufferEncoding): ArrayBuffer {
    const buf = typeof data === 'string' ? Buffer.from(data, encoding) : data;
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  }
}

export function createECDH(curveName: string): ECDH {
  if (curveName !== 'secp256k1') {
    throw new Error('ERR_CRYPTO_INVALID_CURVE');
  }
  return new ECDH(curveName);
}
```

### Pattern 2: Nitro Interface for Raw Keys

**What:** Native interface exposing raw key operations
**When to use:** Bridging TypeScript to C++
**Example:**
```typescript
// Source: Based on edKeyPair.nitro.ts pattern
import type { HybridObject } from 'react-native-nitro-modules';

export interface Ecdh extends HybridObject<{ ios: 'c++'; android: 'c++' }> {
  setCurve(curve: string): void;

  generateKeys(): void;

  // Raw key access - returns EC point format bytes
  getPublicKeyRaw(format: number): ArrayBuffer;  // format: 0=compressed, 1=uncompressed
  getPrivateKeyRaw(): ArrayBuffer;               // 32-byte scalar

  // Raw key import
  setPrivateKeyRaw(privateKey: ArrayBuffer): void;  // Auto-derives public key
  setPublicKeyRaw(publicKey: ArrayBuffer): void;    // For deprecated API
}
```

### Pattern 3: C++ Raw Key Export

**What:** Extract raw EC point bytes from EVP_PKEY
**When to use:** `getPublicKey()` and `getPrivateKey()` methods
**Example:**
```cpp
// Source: OpenSSL EVP_PKEY-EC documentation, HybridKeyObjectHandle::initECRaw pattern
std::shared_ptr<ArrayBuffer> HybridEcdh::getPublicKeyRaw(double format) {
  if (!this->pkey) {
    throw std::runtime_error("No key pair generated");
  }

  const EC_KEY* ec = EVP_PKEY_get0_EC_KEY(this->pkey);
  if (!ec) {
    throw std::runtime_error("Failed to get EC_KEY");
  }

  const EC_GROUP* group = EC_KEY_get0_group(ec);
  const EC_POINT* pub_point = EC_KEY_get0_public_key(ec);

  // Determine conversion form based on format parameter
  point_conversion_form_t conv_form =
    (static_cast<int>(format) == 0) ? POINT_CONVERSION_COMPRESSED
                                     : POINT_CONVERSION_UNCOMPRESSED;

  // Get required buffer size
  size_t len = EC_POINT_point2oct(group, pub_point, conv_form, nullptr, 0, nullptr);
  if (len == 0) {
    throw std::runtime_error("Failed to get public key size");
  }

  auto* buf = new uint8_t[len];
  if (EC_POINT_point2oct(group, pub_point, conv_form, buf, len, nullptr) != len) {
    delete[] buf;
    throw std::runtime_error("Failed to export public key");
  }

  return std::make_shared<NativeArrayBuffer>(buf, len, [=]() { delete[] buf; });
}

std::shared_ptr<ArrayBuffer> HybridEcdh::getPrivateKeyRaw() {
  if (!this->pkey) {
    throw std::runtime_error("No key pair generated");
  }

  const EC_KEY* ec = EVP_PKEY_get0_EC_KEY(this->pkey);
  if (!ec) {
    throw std::runtime_error("Failed to get EC_KEY");
  }

  const BIGNUM* priv_bn = EC_KEY_get0_private_key(ec);
  if (!priv_bn) {
    throw std::runtime_error("No private key available");
  }

  // secp256k1 private key is always 32 bytes
  auto* buf = new uint8_t[32];
  if (BN_bn2binpad(priv_bn, buf, 32) != 32) {
    delete[] buf;
    throw std::runtime_error("Failed to export private key");
  }

  return std::make_shared<NativeArrayBuffer>(buf, 32, [=]() { delete[] buf; });
}
```

### Pattern 4: C++ Private Key Import with Public Key Derivation

**What:** Import raw private key and compute corresponding public key
**When to use:** `setPrivateKey()` implementation
**Example:**
```cpp
// Source: OpenSSL EC documentation, matches Node.js setPrivateKey behavior
void HybridEcdh::setPrivateKeyRaw(const std::shared_ptr<ArrayBuffer>& privateKey) {
  // Validate key size
  if (privateKey->size() != 32) {
    throw std::runtime_error("Invalid private key size");
  }

  // Clean up existing key
  if (this->pkey != nullptr) {
    EVP_PKEY_free(this->pkey);
    this->pkey = nullptr;
  }

  // Create EC_KEY for secp256k1
  EC_KEY* ec = EC_KEY_new_by_curve_name(NID_secp256k1);
  if (!ec) {
    throw std::runtime_error("Failed to create EC_KEY");
  }

  // Import private key bytes as BIGNUM
  BIGNUM* priv_bn = BN_bin2bn(
    static_cast<const unsigned char*>(privateKey->data()),
    static_cast<int>(privateKey->size()),
    nullptr
  );
  if (!priv_bn) {
    EC_KEY_free(ec);
    throw std::runtime_error("Failed to create BIGNUM from private key");
  }

  // Validate private key range [1, n-1]
  const EC_GROUP* group = EC_KEY_get0_group(ec);
  BIGNUM* order = BN_new();
  EC_GROUP_get_order(group, order, nullptr);

  if (BN_is_zero(priv_bn) || BN_cmp(priv_bn, order) >= 0) {
    BN_free(order);
    BN_free(priv_bn);
    EC_KEY_free(ec);
    throw std::runtime_error("Private key out of range");
  }
  BN_free(order);

  if (EC_KEY_set_private_key(ec, priv_bn) != 1) {
    BN_free(priv_bn);
    EC_KEY_free(ec);
    throw std::runtime_error("Failed to set private key");
  }

  // Compute public key from private key using EC_POINT_mul
  EC_POINT* pub_point = EC_POINT_new(group);
  if (!pub_point || EC_POINT_mul(group, pub_point, priv_bn, nullptr, nullptr, nullptr) != 1) {
    if (pub_point) EC_POINT_free(pub_point);
    BN_free(priv_bn);
    EC_KEY_free(ec);
    throw std::runtime_error("Failed to compute public key");
  }

  if (EC_KEY_set_public_key(ec, pub_point) != 1) {
    EC_POINT_free(pub_point);
    BN_free(priv_bn);
    EC_KEY_free(ec);
    throw std::runtime_error("Failed to set public key");
  }

  EC_POINT_free(pub_point);
  BN_free(priv_bn);

  // Create EVP_PKEY from EC_KEY
  this->pkey = EVP_PKEY_new();
  if (!this->pkey || EVP_PKEY_set1_EC_KEY(this->pkey, ec) != 1) {
    EC_KEY_free(ec);
    if (this->pkey) {
      EVP_PKEY_free(this->pkey);
      this->pkey = nullptr;
    }
    throw std::runtime_error("Failed to create EVP_PKEY");
  }

  EC_KEY_free(ec);  // EVP_PKEY has its own reference
}
```

### Anti-Patterns to Avoid

- **Using EVP_PKEY_get_raw_public_key for EC keys:** This only works for X25519/X448/Ed25519/Ed448, not traditional EC curves like secp256k1. Use `EC_POINT_point2oct()` instead.

- **Returning DER-encoded keys from ECDH methods:** Node.js ECDH returns raw bytes, not DER. The existing `HybridEcKeyPair.getPublicKey()` returns DER, which is wrong for the ECDH API.

- **Hardcoding key sizes without constants:** Define named constants for secp256k1 sizes to improve readability and prevent magic number bugs.

- **Missing encoding validation:** Node.js ECDH supports 'hex', 'base64', 'latin1', etc. Validate encoding parameter and throw appropriate errors for invalid encodings.

## Don't Hand-Roll

Problems that have existing solutions in the codebase or OpenSSL.

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| EC point format conversion | Manual byte manipulation | `EC_POINT_point2oct()`, `EC_POINT_oct2point()` | OpenSSL handles all point encoding formats correctly |
| Public key derivation from private | Manual EC math | `EC_POINT_mul(group, point, priv_bn, nullptr, nullptr, nullptr)` | OpenSSL uses constant-time implementation |
| Private key validation | Manual range checks | `EC_KEY_check_key()` or manual BIGNUM comparison | Must check [1, n-1] range |
| Buffer encoding/decoding | Custom implementation | Node.js `Buffer.toString(encoding)` / `Buffer.from(str, encoding)` | TypeScript layer handles encoding |
| Error codes matching Node.js | Custom error strings | Define error code constants | Enables drop-in compatibility |
| EC key generation | Low-level EC operations | `EVP_PKEY_keygen()` with EC parameters | Existing `HybridEcKeyPair` pattern |

**Key insight:** The heavy lifting is done by OpenSSL and existing codebase patterns. The new work is exposing the correct interfaces for raw key bytes.

## Common Pitfalls

### Pitfall 1: Confusing Key Formats

**What goes wrong:** Returning DER/SPKI/PKCS8 encoded keys when raw bytes are expected
**Why it happens:** Existing `HybridEcKeyPair` uses DER format for WebCrypto compatibility
**How to avoid:** ECDH methods must use `EC_POINT_point2oct()` for public keys and `BN_bn2binpad()` for private keys
**Warning signs:** Key sizes don't match expected (65 vs 91 bytes, 32 vs 118 bytes)

### Pitfall 2: Missing Public Key Auto-Derivation

**What goes wrong:** `setPrivateKey()` doesn't compute corresponding public key
**Why it happens:** Oversight - private key import doesn't trigger public key computation
**How to avoid:** Always call `EC_POINT_mul()` after setting private key
**Warning signs:** `getPublicKey()` returns undefined or throws after `setPrivateKey()`

### Pitfall 3: Wrong Default Format

**What goes wrong:** `getPublicKey()` returns compressed when uncompressed expected
**Why it happens:** Node.js defaults to 'uncompressed' format
**How to avoid:** Default `format` parameter to 'uncompressed' in TypeScript layer
**Warning signs:** 33-byte keys returned when 65-byte expected

### Pitfall 4: Encoding Parameter Handling

**What goes wrong:** Invalid encoding not throwing, or wrong encoding applied
**Why it happens:** TypeScript layer doesn't validate encoding parameter
**How to avoid:** Validate against allowed encodings: 'hex', 'base64', 'base64url', 'latin1', undefined (Buffer)
**Warning signs:** Garbled output or silent incorrect behavior

### Pitfall 5: Private Key Range Validation

**What goes wrong:** `setPrivateKey()` accepts invalid keys (zero, >= curve order)
**Why it happens:** Missing validation before EC_KEY_set_private_key
**How to avoid:** Check `0 < priv_bn < curve_order` before setting
**Warning signs:** Weak keys accepted, inconsistent behavior vs Node.js

## Code Examples

### secp256k1 Key Sizes (Constants)

```cpp
// Source: secp256k1 specification
namespace secp256k1 {
  constexpr size_t PRIVATE_KEY_SIZE = 32;           // 256 bits
  constexpr size_t PUBLIC_KEY_COMPRESSED_SIZE = 33; // 1 + 32 bytes
  constexpr size_t PUBLIC_KEY_UNCOMPRESSED_SIZE = 65; // 1 + 32 + 32 bytes
  constexpr size_t SHARED_SECRET_SIZE = 32;         // x-coordinate
}
```

### Encoding Helper (TypeScript)

```typescript
// Source: Node.js Buffer encoding support
type ECDHEncoding = 'hex' | 'base64' | 'base64url' | 'latin1' | 'binary';

function encodeBuffer(buf: Buffer, encoding?: ECDHEncoding): Buffer | string {
  if (!encoding) return buf;

  const validEncodings = ['hex', 'base64', 'base64url', 'latin1', 'binary'];
  if (!validEncodings.includes(encoding)) {
    throw new TypeError(`Unknown encoding: ${encoding}`);
  }

  // 'binary' is alias for 'latin1'
  const actualEncoding = encoding === 'binary' ? 'latin1' : encoding;
  return buf.toString(actualEncoding as BufferEncoding);
}

function decodeToBuffer(data: Buffer | string, encoding?: ECDHEncoding): Buffer {
  if (Buffer.isBuffer(data)) return data;

  const actualEncoding = encoding === 'binary' ? 'latin1' : encoding;
  return Buffer.from(data, actualEncoding as BufferEncoding);
}
```

### Factory Function with Validation

```typescript
// Source: Node.js crypto.createECDH behavior
const SUPPORTED_CURVES = ['secp256k1'] as const;

export function createECDH(curveName: string): ECDH {
  if (!SUPPORTED_CURVES.includes(curveName as typeof SUPPORTED_CURVES[number])) {
    const err = new Error(`Unsupported curve: ${curveName}`);
    err.name = 'Error';
    (err as NodeJS.ErrnoException).code = 'ERR_CRYPTO_INVALID_CURVE';
    throw err;
  }
  return new ECDH(curveName);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `ECDH_compute_key()` | `EVP_PKEY_derive()` | OpenSSL 3.0 | Must use EVP API for key derivation |
| `EC_KEY` direct manipulation | `EVP_PKEY` with EC parameters | OpenSSL 3.0 | EC_KEY still works but EVP preferred |
| Raw key export via EC_KEY only | Also `EVP_PKEY_get_octet_string_param` | OpenSSL 3.0 | Can use either approach |

**Deprecated/outdated:**
- `ECDH_compute_key()`: Deprecated in OpenSSL 3.0, use `EVP_PKEY_derive()` instead
- Direct `EC_KEY` manipulation without EVP: Still works but not recommended

## Open Questions

1. **setPublicKey() behavior (deprecated method)**
   - What we know: Node.js deprecated this in v5.2.0 but still supports it
   - What's unclear: Should we implement in Phase 1 or defer to Phase 3?
   - Recommendation: Defer to Phase 3 (ECDH-19, ECDH-20) per roadmap

2. **Error code format consistency**
   - What we know: Node.js uses `ERR_CRYPTO_*` codes
   - What's unclear: Exact mechanism for setting `code` property on errors
   - Recommendation: Create error factory function that sets both message and code

3. **getCurves() implementation**
   - What we know: Node.js provides `crypto.getCurves()` returning all supported curves
   - What's unclear: Whether to implement now (returns ['secp256k1']) or defer
   - Recommendation: Implement as simple function returning hardcoded array

## Sources

### Primary (HIGH confidence)
- [Node.js Crypto Documentation v25.3.0](https://nodejs.org/api/crypto.html) - ECDH API reference
- Existing codebase: `HybridEcKeyPair.cpp` - EC key generation patterns
- Existing codebase: `HybridEdKeyPair.cpp` - diffieHellman pattern for X25519/X448
- Existing codebase: `HybridKeyObjectHandle.cpp` - initECRaw for raw EC point import
- [OpenSSL EVP_PKEY-EC Documentation](https://docs.openssl.org/3.3/man7/EVP_PKEY-EC/) - EC key handling

### Secondary (MEDIUM confidence)
- `.planning/research/FEATURES.md` - Node.js API surface documentation
- `.planning/research/STACK.md` - OpenSSL API patterns
- `.planning/research/ARCHITECTURE.md` - Integration points

### Tertiary (LOW confidence)
- `.planning/research/PITFALLS.md` - Security considerations (validated against official docs)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Based on existing codebase patterns
- Architecture: HIGH - Follows established HybridObject pattern
- Pitfalls: HIGH - Verified against Node.js documentation and existing code

**Research date:** 2026-01-18
**Valid until:** 2026-02-18 (stable APIs, minimal ecosystem churn)
