# Phase 2: Secret Derivation - Research

**Researched:** 2025-01-19
**Domain:** ECDH shared secret computation with secp256k1
**Confidence:** HIGH

## Summary

Phase 2 implements the `computeSecret()` method for ECDH key exchange on secp256k1. This method takes another party's public key and derives a 32-byte shared secret using elliptic curve Diffie-Hellman. The primary challenge is proper public key validation to prevent invalid curve attacks (CVE-2024-48930) while maintaining Node.js API compatibility.

The implementation uses OpenSSL's EVP_PKEY_derive API, which performs point-on-curve validation during `EVP_PKEY_derive_set_peer()`. The critical security requirement is ensuring that public keys are validated before computing the shared secret to prevent private key extraction attacks.

**Primary recommendation:** Use EVP_PKEY_derive with EVP_PKEY_derive_set_peer (which validates the peer key) and convert input public keys via EC_POINT_oct2point (which also validates curve membership).

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| OpenSSL | 3.6+ | EVP_PKEY_derive API for ECDH | Already in use, provides validated key exchange |
| OpenSSL EC | 3.6+ | EC_POINT_oct2point for public key import | Validates curve membership during import |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @craftzdog/react-native-buffer | existing | Buffer encoding/decoding | Already in use for TypeScript layer |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| EVP_PKEY_derive | EC_POINT_mul directly | EVP API is higher-level, handles more edge cases, already established pattern in Phase 1 |
| Manual curve validation | EC_POINT_is_on_curve | EC_POINT_oct2point already validates during import |

## Architecture Patterns

### Recommended Project Structure
```
cpp/ecdh/
  HybridEcdh.hpp       # Add computeSecretRaw declaration
  HybridEcdh.cpp       # Add computeSecretRaw implementation

src/
  ecdh.ts              # Add computeSecret method with encoding support
  specs/ecdh.nitro.ts  # Add computeSecretRaw to interface
```

### Pattern 1: EVP_PKEY_derive for Shared Secret Computation
**What:** Use OpenSSL's high-level EVP API for ECDH key derivation
**When to use:** Always for ECDH computeSecret
**Example:**
```cpp
// Source: https://wiki.openssl.org/index.php/Elliptic_Curve_Diffie_Hellman
EVP_PKEY_CTX* ctx = EVP_PKEY_CTX_new(pkey, NULL);
if (!ctx) handleErrors();

if (EVP_PKEY_derive_init(ctx) <= 0) handleErrors();
if (EVP_PKEY_derive_set_peer(ctx, peerkey) <= 0) handleErrors();

// Determine buffer length
size_t secret_len;
if (EVP_PKEY_derive(ctx, NULL, &secret_len) <= 0) handleErrors();

// Allocate and derive
unsigned char* secret = new unsigned char[secret_len];
if (EVP_PKEY_derive(ctx, secret, &secret_len) <= 0) {
    delete[] secret;
    EVP_PKEY_CTX_free(ctx);
    handleErrors();
}

EVP_PKEY_CTX_free(ctx);
```

### Pattern 2: Public Key Import with Validation
**What:** Convert raw public key bytes to EVP_PKEY with curve validation
**When to use:** When receiving otherPublicKey parameter
**Example:**
```cpp
// Source: Existing codebase pattern + OpenSSL docs
EVP_PKEY* importPeerPublicKey(const uint8_t* data, size_t len) {
    clearOpenSSLErrors();

    EC_KEY* ec = EC_KEY_new_by_curve_name(NID_secp256k1);
    if (!ec) return nullptr;

    const EC_GROUP* group = EC_KEY_get0_group(ec);
    EC_POINT* point = EC_POINT_new(group);
    if (!point) {
        EC_KEY_free(ec);
        return nullptr;
    }

    // EC_POINT_oct2point validates that point is on curve
    if (EC_POINT_oct2point(group, point, data, len, nullptr) != 1) {
        EC_POINT_free(point);
        EC_KEY_free(ec);
        return nullptr;  // Invalid public key - not on curve
    }

    if (EC_KEY_set_public_key(ec, point) != 1) {
        EC_POINT_free(point);
        EC_KEY_free(ec);
        return nullptr;
    }

    EC_POINT_free(point);

    EVP_PKEY* pkey = EVP_PKEY_new();
    if (!pkey) {
        EC_KEY_free(ec);
        return nullptr;
    }

    if (EVP_PKEY_set1_EC_KEY(pkey, ec) != 1) {
        EVP_PKEY_free(pkey);
        EC_KEY_free(ec);
        return nullptr;
    }

    EC_KEY_free(ec);
    return pkey;
}
```

### Pattern 3: TypeScript Encoding Layer
**What:** Handle Buffer/string encoding in TypeScript, pass raw bytes to C++
**When to use:** For all user-facing API methods
**Example:**
```typescript
// Source: Existing ECDH.ts pattern
computeSecret(
  otherPublicKey: Buffer | ArrayBuffer | Uint8Array | string,
  inputEncoding?: ECDHEncoding,
  outputEncoding?: ECDHEncoding
): Buffer | string {
  const keyBuffer = this.decodeInput(otherPublicKey, inputEncoding);
  const secretRaw = this.native.computeSecretRaw(keyBuffer);
  return this.encodeOutput(secretRaw, outputEncoding);
}
```

### Anti-Patterns to Avoid
- **Direct EC_POINT_mul without validation:** Missing curve validation enables invalid curve attacks
- **Skipping EVP_PKEY_derive_set_peer validation:** OpenSSL validates the peer key during set_peer; skipping this is dangerous
- **Returning raw shared secret directly:** Node.js returns x-coordinate only (32 bytes for secp256k1), not full point
- **Accepting any key format without size validation:** secp256k1 public keys are 33 bytes (compressed) or 65 bytes (uncompressed)

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Public key validation | Manual curve equation check | EC_POINT_oct2point | Already validates curve membership, handles compressed/uncompressed formats |
| ECDH computation | EC_POINT_mul directly | EVP_PKEY_derive | Higher-level API with proper context management |
| Point encoding detection | Manual byte inspection | OpenSSL auto-detects | EC_POINT_oct2point handles 0x02, 0x03, 0x04 prefixes |

**Key insight:** OpenSSL's EC_POINT_oct2point already performs curve validation during point import. The function "decodes a curve point... and, if it represents a point on group, sets it on the caller-provided point." If the point is not on the curve, it returns 0.

## Common Pitfalls

### Pitfall 1: Invalid Curve Attack (CVE-2024-48930)
**What goes wrong:** Accepting public keys not on the secp256k1 curve allows private key extraction
**Why it happens:** Missing validation of compressed public key imports
**How to avoid:** Always use EC_POINT_oct2point which validates curve membership. For compressed keys, it computes y from x and verifies the resulting point is on curve.
**Warning signs:** Any code path that creates an EC_POINT without validating it's on the curve

### Pitfall 2: Wrong Shared Secret Size
**What goes wrong:** Returning 33 bytes (y-coordinate included) or variable size
**Why it happens:** Confusion about ECDH output format
**How to avoid:** EVP_PKEY_derive returns the x-coordinate only for ECDH, which is 32 bytes for secp256k1. Validate size matches expectation.
**Warning signs:** Secret length != 32 for secp256k1

### Pitfall 3: Error Code Mismatch
**What goes wrong:** Throwing generic errors instead of ERR_CRYPTO_ECDH_INVALID_PUBLIC_KEY
**Why it happens:** Not matching Node.js exact error behavior
**How to avoid:** In TypeScript layer, catch C++ exceptions for invalid keys and rethrow with correct error code
**Warning signs:** Tests expecting specific error codes fail

### Pitfall 4: Not Cleaning Up EVP_PKEY_CTX
**What goes wrong:** Memory leak from context not being freed
**Why it happens:** Early return or exception before cleanup
**How to avoid:** Use RAII pattern or ensure cleanup on all paths
**Warning signs:** Memory growth during repeated computeSecret calls

### Pitfall 5: Accepting Wrong Public Key Sizes
**What goes wrong:** Buffer overflow or invalid point
**Why it happens:** Not validating input size before EC_POINT_oct2point
**How to avoid:** Validate: compressed = 33 bytes (0x02/0x03 prefix), uncompressed = 65 bytes (0x04 prefix)
**Warning signs:** Crashes or unexpected behavior with malformed input

## Code Examples

Verified patterns from official sources:

### Complete computeSecretRaw Implementation
```cpp
// Source: OpenSSL wiki + existing codebase patterns
std::shared_ptr<ArrayBuffer> HybridEcdh::computeSecretRaw(
    const std::shared_ptr<ArrayBuffer>& otherPublicKey) {
  if (!this->pkey) {
    throw std::runtime_error("No key pair available");
  }

  clearOpenSSLErrors();

  // Validate input size (33 for compressed, 65 for uncompressed)
  size_t keyLen = otherPublicKey->size();
  if (keyLen != 33 && keyLen != 65) {
    throw std::runtime_error("ERR_CRYPTO_ECDH_INVALID_PUBLIC_KEY");
  }

  // Import peer public key with validation
  EC_KEY* peerEc = EC_KEY_new_by_curve_name(NID_secp256k1);
  if (!peerEc) {
    throw std::runtime_error("Failed to create EC_KEY: " + getOpenSSLError());
  }

  const EC_GROUP* group = EC_KEY_get0_group(peerEc);
  EC_POINT* peerPoint = EC_POINT_new(group);
  if (!peerPoint) {
    EC_KEY_free(peerEc);
    throw std::runtime_error("Failed to create EC_POINT: " + getOpenSSLError());
  }

  // EC_POINT_oct2point validates curve membership
  const uint8_t* keyData = static_cast<const uint8_t*>(otherPublicKey->data());
  if (EC_POINT_oct2point(group, peerPoint, keyData, keyLen, nullptr) != 1) {
    EC_POINT_free(peerPoint);
    EC_KEY_free(peerEc);
    throw std::runtime_error("ERR_CRYPTO_ECDH_INVALID_PUBLIC_KEY");
  }

  if (EC_KEY_set_public_key(peerEc, peerPoint) != 1) {
    EC_POINT_free(peerPoint);
    EC_KEY_free(peerEc);
    throw std::runtime_error("Failed to set peer public key: " + getOpenSSLError());
  }
  EC_POINT_free(peerPoint);

  EVP_PKEY* peerKey = EVP_PKEY_new();
  if (!peerKey) {
    EC_KEY_free(peerEc);
    throw std::runtime_error("Failed to create peer EVP_PKEY: " + getOpenSSLError());
  }

  if (EVP_PKEY_set1_EC_KEY(peerKey, peerEc) != 1) {
    EVP_PKEY_free(peerKey);
    EC_KEY_free(peerEc);
    throw std::runtime_error("Failed to set peer EC_KEY: " + getOpenSSLError());
  }
  EC_KEY_free(peerEc);

  // Derive shared secret
  EVP_PKEY_CTX* ctx = EVP_PKEY_CTX_new(this->pkey, nullptr);
  if (!ctx) {
    EVP_PKEY_free(peerKey);
    throw std::runtime_error("Failed to create derive context: " + getOpenSSLError());
  }

  if (EVP_PKEY_derive_init(ctx) <= 0) {
    EVP_PKEY_CTX_free(ctx);
    EVP_PKEY_free(peerKey);
    throw std::runtime_error("Failed to init derive: " + getOpenSSLError());
  }

  // EVP_PKEY_derive_set_peer also validates the peer key
  if (EVP_PKEY_derive_set_peer(ctx, peerKey) <= 0) {
    EVP_PKEY_CTX_free(ctx);
    EVP_PKEY_free(peerKey);
    throw std::runtime_error("ERR_CRYPTO_ECDH_INVALID_PUBLIC_KEY");
  }

  size_t secretLen;
  if (EVP_PKEY_derive(ctx, nullptr, &secretLen) <= 0) {
    EVP_PKEY_CTX_free(ctx);
    EVP_PKEY_free(peerKey);
    throw std::runtime_error("Failed to get secret length: " + getOpenSSLError());
  }

  auto* secret = new uint8_t[secretLen];
  if (EVP_PKEY_derive(ctx, secret, &secretLen) <= 0) {
    delete[] secret;
    EVP_PKEY_CTX_free(ctx);
    EVP_PKEY_free(peerKey);
    throw std::runtime_error("Failed to derive secret: " + getOpenSSLError());
  }

  EVP_PKEY_CTX_free(ctx);
  EVP_PKEY_free(peerKey);

  return std::make_shared<NativeArrayBuffer>(secret, secretLen, [=]() { delete[] secret; });
}
```

### TypeScript computeSecret with Error Handling
```typescript
// Source: Node.js API compatibility
computeSecret(
  otherPublicKey: Buffer | ArrayBuffer | Uint8Array | string,
  inputEncoding?: ECDHEncoding,
  outputEncoding?: ECDHEncoding
): Buffer | string {
  try {
    const keyBuffer = this.decodeInput(otherPublicKey, inputEncoding);
    const secretRaw = this.native.computeSecretRaw(keyBuffer);
    return this.encodeOutput(secretRaw, outputEncoding);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('ERR_CRYPTO_ECDH_INVALID_PUBLIC_KEY')) {
      const err = new Error('ERR_CRYPTO_ECDH_INVALID_PUBLIC_KEY: Invalid EC public key');
      (err as NodeJS.ErrnoException).code = 'ERR_CRYPTO_ECDH_INVALID_PUBLIC_KEY';
      throw err;
    }
    throw e;
  }
}
```

### Nitro Interface Addition
```typescript
// Source: Existing ecdh.nitro.ts pattern
export interface Ecdh extends HybridObject<{ ios: 'c++'; android: 'c++' }> {
  setCurve(curve: string): void;
  generateKeys(): void;
  getPublicKeyRaw(format: number): ArrayBuffer;
  getPrivateKeyRaw(): ArrayBuffer;
  setPrivateKeyRaw(privateKey: ArrayBuffer): void;
  computeSecretRaw(otherPublicKey: ArrayBuffer): ArrayBuffer;  // NEW
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| EC_KEY_* APIs directly | EVP_PKEY_derive | OpenSSL 3.0+ | EVP APIs are preferred, EC_KEY is being deprecated |
| Manual point validation | EC_POINT_oct2point validation | Always | Built-in validation is more reliable |
| secp256k1-node (JS) | OpenSSL native | CVE-2024-48930 fix | JS implementations had validation bugs |

**Deprecated/outdated:**
- ECDH_compute_key(): Deprecated in OpenSSL 3.0, use EVP_PKEY_derive instead
- Manual curve validation: EC_POINT_is_on_curve is unnecessary when using EC_POINT_oct2point which validates during import

## Open Questions

Things that couldn't be fully resolved:

1. **Exact Node.js error message format**
   - What we know: Error code is ERR_CRYPTO_ECDH_INVALID_PUBLIC_KEY
   - What's unclear: Exact error message text (may vary by Node.js version)
   - Recommendation: Match error code, use descriptive message similar to Node.js

2. **Handling of point at infinity**
   - What we know: Point at infinity would produce zero shared secret
   - What's unclear: Whether Node.js explicitly checks for this
   - Recommendation: EVP_PKEY_derive should handle this case

## Sources

### Primary (HIGH confidence)
- [OpenSSL EVP Key Agreement Wiki](https://wiki.openssl.org/index.php/EVP_Key_Agreement) - EVP_PKEY_derive pattern
- [OpenSSL ECDH Wiki](https://wiki.openssl.org/index.php/Elliptic_Curve_Diffie_Hellman) - Complete ECDH example code
- [OpenSSL EVP_KEYEXCH-ECDH](https://docs.openssl.org/3.5/man7/EVP_KEYEXCH-ECDH/) - ECDH parameters and validation
- [Node.js crypto.ECDH docs](https://nodejs.org/api/crypto.html) - computeSecret API specification

### Secondary (MEDIUM confidence)
- [CVE-2024-48930 Advisory](https://github.com/advisories/GHSA-584q-6j8j-r5pm) - Invalid curve attack details
- [Hacken ECDH Security Article](https://hacken.io/insights/secure-ecdh/) - Public key validation best practices
- [Node.js PR #16849](https://github.com/nodejs/node/pull/16849/files) - Error handling for invalid public keys

### Tertiary (LOW confidence)
- secp256k1 ECDH test vectors - Python cryptography library generates these

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - OpenSSL EVP APIs are well-documented and already in use
- Architecture: HIGH - Pattern follows existing codebase (HybridEcdh, TypeScript wrapper)
- Pitfalls: HIGH - CVE-2024-48930 is well-documented, OpenSSL validation is reliable
- Error handling: MEDIUM - Node.js exact behavior needs testing

**Research date:** 2025-01-19
**Valid until:** 60 days (stable APIs, well-established patterns)
