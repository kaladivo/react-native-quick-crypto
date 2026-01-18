# Architecture Research: ECDH Integration

**Domain:** Elliptic Curve Diffie-Hellman Key Exchange
**Researched:** 2025-01-18
**Confidence:** HIGH (based on existing codebase patterns)

## Executive Summary

ECDH integration can leverage extensive existing infrastructure in the library. The existing `HybridEcKeyPair` already supports EC key generation and ECDSA operations. X25519/X448 key exchange is already implemented via `HybridEdKeyPair.diffieHellman()`.

**Key insight:** For NIST curves (P-256, P-384, P-521), ECDH derivation needs to be added to the existing `HybridEcKeyPair` C++ class. The WebCrypto API integration already exists in `subtle.ts` with proper usage validation for ECDH - it just needs the deriveBits implementation.

## Files to Create

### TypeScript Layer

No new TypeScript files required. ECDH functionality should be added to existing files:
- `src/ec.ts` - Add `ecdhDeriveBits()` function (similar to `xDeriveBits` in `ed.ts`)

### Nitro Spec Layer

**No new .nitro.ts files required.** Extend existing spec:

Modify: `src/specs/ecKeyPair.nitro.ts`
- Add: `deriveBits(publicKey: ArrayBuffer, privateKey: ArrayBuffer): ArrayBuffer`

### C++ Layer

**No new C++ files required.** Extend existing implementation:

Modify: `cpp/ec/HybridEcKeyPair.hpp` and `cpp/ec/HybridEcKeyPair.cpp`
- Add: `deriveBits()` method using OpenSSL EVP_PKEY_derive API

## Files to Modify

### TypeScript API Layer

| File | Changes | Purpose |
|------|---------|---------|
| `src/specs/ecKeyPair.nitro.ts` | Add `deriveBits` method signature | Define native bridge interface |
| `src/ec.ts` | Add `ecdhDeriveBits()` function | Implement WebCrypto deriveBits for EC |
| `src/subtle.ts` | Wire ECDH in `deriveBits` switch | Connect to WebCrypto API |

### C++ Implementation Layer

| File | Changes | Purpose |
|------|---------|---------|
| `cpp/ec/HybridEcKeyPair.hpp` | Add `deriveBits()` method declaration | Interface definition |
| `cpp/ec/HybridEcKeyPair.cpp` | Implement `deriveBits()` using OpenSSL | Core ECDH computation |

### Build Configuration

| File | Changes | Purpose |
|------|---------|---------|
| `nitro.json` | No changes needed | EcKeyPair already registered |

### Exports

| File | Changes | Purpose |
|------|---------|---------|
| `src/index.ts` | No changes needed | ec.ts already exported |

## Integration Points

### With KeyObjectHandle

The existing `KeyObjectHandle` infrastructure provides key import/export capabilities:

```
KeyObjectHandle
├── initECRaw(namedCurve, keyData) - Raw EC public key import
├── initJwk(keyData, namedCurve) - JWK import (EC keys supported)
├── exportKey(format, type) - Export in SPKI/PKCS8/DER/PEM
└── getAsymmetricKeyType() - Returns 'ec' for EC keys
```

**ECDH Usage:** The `deriveBits` implementation needs to:
1. Accept two `CryptoKey` objects (base key with private, public key from algorithm)
2. Extract raw key material via `KeyObjectHandle.exportKey()` or use the underlying `EVP_PKEY` directly
3. Pass to native `deriveBits()` method

### With Existing EC Support

The current `HybridEcKeyPair` already has:
- Curve support: P-256, P-384, P-521, secp256k1
- Key generation (async and sync)
- Key import/export (DER format)
- ECDSA sign/verify

**Missing for ECDH:** Only the `deriveBits` method for computing shared secret.

### With X25519/X448 (Reference Implementation)

The `HybridEdKeyPair.diffieHellman()` method shows the pattern for ECDH:

```cpp
// From HybridEdKeyPair.cpp - this pattern applies to EC curves too
std::shared_ptr<ArrayBuffer> HybridEdKeyPair::diffieHellman(...) {
  // 1. Create EVP_PKEY for private key
  EVP_PKEY_ptr pkey_priv(...);

  // 2. Create EVP_PKEY for public key
  EVP_PKEY_ptr pkey_pub(...);

  // 3. Create context for key exchange
  EVP_PKEY_CTX_ptr ctx(EVP_PKEY_CTX_new_from_pkey(...));

  // 4. Initialize and derive
  EVP_PKEY_derive_init(ctx.get());
  EVP_PKEY_derive_set_peer(ctx.get(), pkey_pub.get());
  EVP_PKEY_derive(ctx.get(), shared_secret, &shared_secret_len);

  return shared_secret;
}
```

## WebCrypto API Integration

### Current State in subtle.ts

The `deriveBits` method already handles `X25519` and `X448` (lines 1556-1561):

```typescript
case 'X25519':
case 'X448':
  return xDeriveBits(algorithm, baseKey, length);
```

**Required addition:**

```typescript
case 'ECDH':
  return ecdhDeriveBits(algorithm, baseKey, length);
```

### Algorithm Structure for ECDH

Per WebCrypto spec, ECDH deriveBits receives:
```typescript
{
  name: 'ECDH',
  public: CryptoKey  // The other party's public key
}
```

The base key is the local private key.

### Key Usage Validation

Already exists in `ec.ts` (line 224):
```typescript
if (name === 'ECDH') {
  validUsages = isPublicKey ? [] : ['deriveKey', 'deriveBits'];
}
```

## Implementation Order

### Phase 1: C++ Foundation (Core Implementation)

1. **Add method to Nitro spec** (`src/specs/ecKeyPair.nitro.ts`)
   - Add `deriveBits(publicKey: ArrayBuffer, privateKey: ArrayBuffer): ArrayBuffer`

2. **Implement in C++** (`cpp/ec/HybridEcKeyPair.hpp` and `.cpp`)
   - Add `deriveBits()` method
   - Use `EVP_PKEY_derive` API (same pattern as X25519/X448)
   - Handle NIST curves (P-256, P-384, P-521)

3. **Regenerate bindings**
   - Run `bun specs` to regenerate Nitrogen bindings

### Phase 2: TypeScript Integration

4. **Add deriveBits function** (`src/ec.ts`)
   - Create `ecdhDeriveBits(algorithm, baseKey, length)` function
   - Extract keys from CryptoKey objects
   - Call native `deriveBits()` method
   - Handle length parameter (truncation/validation)

5. **Wire to WebCrypto** (`src/subtle.ts`)
   - Add `'ECDH'` case in `deriveBits` switch statement
   - Import and call `ecdhDeriveBits`

### Phase 3: Testing and Validation

6. **Test with WebCrypto standard vectors**
   - Test P-256, P-384, P-521 curves
   - Validate against RFC 5903 test vectors if available
   - Test interoperability with Node.js crypto

## Detailed Implementation Guidance

### C++ Implementation Pattern

Based on existing `HybridEdKeyPair::diffieHellman()`:

```cpp
std::shared_ptr<ArrayBuffer> HybridEcKeyPair::deriveBits(
    const std::shared_ptr<ArrayBuffer>& publicKey,
    const std::shared_ptr<ArrayBuffer>& privateKey) {

  // 1. Import private key (PKCS8 DER format from KeyObjectHandle)
  BIO* bio_priv = BIO_new_mem_buf(privateKey->data(), privateKey->size());
  PKCS8_PRIV_KEY_INFO* p8inf = d2i_PKCS8_PRIV_KEY_INFO_bio(bio_priv, nullptr);
  EVP_PKEY* pkey_priv = EVP_PKCS82PKEY(p8inf);

  // 2. Import public key (SPKI DER format from KeyObjectHandle)
  BIO* bio_pub = BIO_new_mem_buf(publicKey->data(), publicKey->size());
  EVP_PKEY* pkey_pub = d2i_PUBKEY_bio(bio_pub, nullptr);

  // 3. Create derive context
  EVP_PKEY_CTX* ctx = EVP_PKEY_CTX_new(pkey_priv, nullptr);
  EVP_PKEY_derive_init(ctx);
  EVP_PKEY_derive_set_peer(ctx, pkey_pub);

  // 4. Derive shared secret
  size_t secret_len;
  EVP_PKEY_derive(ctx, nullptr, &secret_len);
  uint8_t* secret = new uint8_t[secret_len];
  EVP_PKEY_derive(ctx, secret, &secret_len);

  // 5. Cleanup and return
  // ... proper RAII cleanup
  return std::make_shared<NativeArrayBuffer>(secret, secret_len, ...);
}
```

### TypeScript Integration Pattern

Based on existing `xDeriveBits()` in `ed.ts`:

```typescript
export function ecdhDeriveBits(
  algorithm: SubtleAlgorithm,
  baseKey: CryptoKey,
  length: number | null,
): ArrayBuffer {
  const publicParams = algorithm as SubtleAlgorithm & { public?: CryptoKey };
  const publicKey = publicParams.public;

  if (!publicKey) {
    throw lazyDOMException(
      'Public key is required for ECDH derivation',
      'InvalidAccessError',
    );
  }

  // Validate curves match
  if (baseKey.algorithm.namedCurve !== publicKey.algorithm.namedCurve) {
    throw lazyDOMException(
      'Keys must use the same named curve',
      'InvalidAccessError',
    );
  }

  // Export keys in DER format
  const privateKeyData = baseKey.keyObject.handle.exportKey(
    KFormatType.DER,
    KeyEncoding.PKCS8,
  );
  const publicKeyData = publicKey.keyObject.handle.exportKey(
    KFormatType.DER,
    KeyEncoding.SPKI,
  );

  // Create EC instance and derive
  const ec = new Ec(baseKey.algorithm.namedCurve!);
  const secret = ec.native.deriveBits(publicKeyData, privateKeyData);

  // Handle length parameter
  if (length === null) {
    return secret;
  }

  const byteLength = Math.ceil(length / 8);
  if (secret.byteLength >= byteLength) {
    return secret.slice(0, byteLength);
  }

  throw lazyDOMException(
    'Derived key is shorter than requested length',
    'OperationError',
  );
}
```

## Key Considerations

### Security

1. **Constant-time operations** - OpenSSL's EVP_PKEY_derive is constant-time
2. **No key material in errors** - Only report generic errors
3. **Validate curve compatibility** - Both keys must use same curve

### Curve Support

| Curve | OpenSSL NID | WebCrypto Name | Key Size (bytes) |
|-------|-------------|----------------|------------------|
| P-256 | NID_X9_62_prime256v1 | P-256 | 32 |
| P-384 | NID_secp384r1 | P-384 | 48 |
| P-521 | NID_secp521r1 | P-521 | 66 |

### Output Size

ECDH shared secret size equals the curve's key size:
- P-256: 32 bytes (256 bits)
- P-384: 48 bytes (384 bits)
- P-521: 66 bytes (528 bits, rounded up from 521)

WebCrypto `deriveBits` length parameter allows truncation to smaller sizes.

## Confidence Assessment

| Aspect | Confidence | Rationale |
|--------|------------|-----------|
| File structure | HIGH | Based on existing patterns in codebase |
| C++ implementation | HIGH | Follows established EVP_PKEY_derive pattern from EdKeyPair |
| TypeScript integration | HIGH | Mirrors xDeriveBits pattern exactly |
| Build configuration | HIGH | No new modules needed |
| WebCrypto compliance | HIGH | Standard algorithm, well-documented spec |

## Open Questions

1. **secp256k1 support** - Should ECDH work with secp256k1? Currently key generation supports it, but it's not a WebCrypto named curve. Decision: Support it for Node.js API compatibility but not in WebCrypto subtle.

2. **Raw key format option** - Should `deriveBits` also accept raw key bytes (like EdKeyPair.diffieHellman)? Decision: Start with DER format (what KeyObjectHandle provides), add raw later if needed.

---

*Architecture research: 2025-01-18*
