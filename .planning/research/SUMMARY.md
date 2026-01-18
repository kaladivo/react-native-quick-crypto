# Research Summary: ECDH/secp256k1 Implementation

**Project:** react-native-quick-crypto ECDH
**Domain:** Cryptographic key exchange
**Researched:** 2026-01-18
**Confidence:** HIGH

## Executive Summary

ECDH with secp256k1 is a well-understood cryptographic pattern with clear implementation paths. The existing codebase already contains most required infrastructure: `HybridEcKeyPair` handles EC key generation and ECDSA, `HybridEdKeyPair.diffieHellman()` demonstrates the EVP-based key derivation pattern for X25519/X448, and `HybridKeyObjectHandle.initECRaw()` shows raw EC key import. The implementation primarily involves adding a `deriveBits()` method to existing code and wiring it through the TypeScript layer.

The recommended approach is to extend `HybridEcKeyPair` with ECDH derivation using OpenSSL's EVP_PKEY_derive API. This matches the existing X25519/X448 pattern and uses modern OpenSSL 3.6+ APIs exclusively. The Node.js ECDH API (createECDH, generateKeys, computeSecret, get/setPrivateKey, getPublicKey) maps directly to OpenSSL operations with well-established patterns in the codebase.

The primary risk is **public key validation** (CVE-2024-48930 demonstrated private key extraction from invalid point attacks). OpenSSL's `EVP_PKEY_derive_set_peer()` validates peer keys, but explicit validation and proper error handling are critical. Secondary risks include leading zero bytes in shared secrets (must preserve them for Node.js compatibility) and ensuring compressed/uncompressed public key format support.

## Key Findings

### Recommended Stack

OpenSSL 3.6+ EVP APIs provide all required functionality. The codebase already uses ncrypto wrappers that handle memory management.

**Core technologies:**
- **OpenSSL EVP_PKEY_derive**: ECDH shared secret computation - standard pattern, constant-time
- **EC_POINT_point2oct / oct2point**: Public key format conversion - handles compressed/uncompressed
- **ncrypto wrappers**: RAII memory management - prevents leaks, matches existing code
- **OSSL_PARAM_BLD**: Key import from raw bytes (OpenSSL 3.x) - modern API

**Critical API note:** `EVP_PKEY_get_raw_public_key()` does NOT work for secp256k1 - must use EC_POINT operations for raw key handling.

### Expected Features

**Must have (P0 - table stakes):**
- `createECDH('secp256k1')` factory function
- `generateKeys([encoding[, format]])` - returns public key
- `computeSecret(otherPublicKey[, inputEncoding[, outputEncoding]])` - derives shared secret
- `getPublicKey([encoding[, format]])` - both compressed (33 bytes) and uncompressed (65 bytes)
- `getPrivateKey([encoding])` - 32 bytes for secp256k1
- `setPrivateKey(privateKey[, encoding])` - auto-derives public key
- Hex encoding support (most common)
- Buffer return (default behavior)

**Should have (P1 - competitive):**
- `ECDH.convertKey()` static method - format conversion
- base64/base64url encoding support
- Proper error codes matching Node.js (`ERR_CRYPTO_ECDH_INVALID_PUBLIC_KEY`)

**Defer (P2 - v2+):**
- `setPublicKey()` - deprecated in Node.js v5.2.0
- `hybrid` public key format - rarely used
- Other curves beyond secp256k1
- `getCurves()` utility function

### Architecture Approach

No new files required. ECDH integrates into existing EC infrastructure by adding a `deriveBits()` method to `HybridEcKeyPair` and wiring it through the TypeScript layer. The pattern mirrors `HybridEdKeyPair.diffieHellman()` exactly.

**Files to modify:**
1. `src/specs/ecKeyPair.nitro.ts` - Add `deriveBits` method signature
2. `cpp/ec/HybridEcKeyPair.hpp/.cpp` - Implement `deriveBits()` using EVP_PKEY_derive
3. `src/ec.ts` - Add `ecdhDeriveBits()` function
4. `src/subtle.ts` - Wire ECDH case in deriveBits switch

**Integration points:**
- `KeyObjectHandle.exportKey()` provides DER-encoded keys
- `HybridEcKeyPair` already handles secp256k1 via `GetCurveFromName()`
- Existing RAII patterns from `HybridEcKeyPair.cpp`

### Critical Pitfalls

1. **Missing public key validation (CRITICAL)** - CVE-2024-48930 showed private key extraction from 11 ECDH sessions with invalid points. Prevention: Rely on OpenSSL's `EVP_PKEY_derive_set_peer()` validation; throw `ERR_CRYPTO_ECDH_INVALID_PUBLIC_KEY` on failure; test with Wycheproof invalid key vectors.

2. **Raw key API mismatch** - `EVP_PKEY_get_raw_public_key()` only works for X25519/Ed25519, NOT EC curves. Prevention: Use `EC_POINT_point2oct()` for export, `EC_POINT_oct2point()` for import; use ncrypto wrappers from existing `initECRaw()`.

3. **Leading zero bytes stripped** - Shared secrets may have leading zeros; stripping breaks interop. Prevention: Always return fixed 32 bytes for secp256k1; use `BN_bn2binpad()` with explicit size; test with key pairs known to produce leading-zero secrets.

4. **setPrivateKey must auto-derive public key** - Node.js code expects `getPublicKey()` to work after `setPrivateKey()`. Prevention: Compute public key via `EC_POINT_mul()` in setPrivateKey; validate resulting point.

5. **Deprecated OpenSSL APIs** - Using `ECDH_compute_key()` or `EC_KEY_*` for derivation will fail in OpenSSL 3.x. Prevention: Use only EVP APIs (`EVP_PKEY_derive_init`, `EVP_PKEY_derive_set_peer`, `EVP_PKEY_derive`); follow existing `HybridEdKeyPair.diffieHellman()` pattern.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: C++ Foundation
**Rationale:** Native layer must exist before TypeScript can call it; follows existing codebase pattern
**Delivers:** Working `deriveBits()` method in HybridEcKeyPair
**Addresses:** Core ECDH computation (computeSecret equivalent)
**Avoids:** Deprecated API pitfall by using EVP-only pattern from start
**Estimated complexity:** Medium - adapts existing HybridEdKeyPair.diffieHellman() pattern

### Phase 2: TypeScript Integration
**Rationale:** Depends on C++ layer being complete
**Delivers:** `ecdhDeriveBits()` function wired to WebCrypto subtle.deriveBits
**Uses:** Existing KeyObjectHandle for key export, existing Ec class wrapper
**Implements:** WebCrypto ECDH deriveBits algorithm
**Estimated complexity:** Low - follows xDeriveBits pattern exactly

### Phase 3: Node.js ECDH API
**Rationale:** Higher-level API depends on lower-level primitives
**Delivers:** `createECDH()`, generateKeys, computeSecret, get/setPrivateKey, getPublicKey
**Addresses:** All P0 features from FEATURES.md
**Avoids:** setPrivateKey auto-derive pitfall by implementing correctly from start
**Estimated complexity:** Medium - multiple methods but straightforward patterns

### Phase 4: Format Support & Polish
**Rationale:** Core functionality must work before adding format variations
**Delivers:** Compressed/uncompressed formats, encoding options, ECDH.convertKey
**Addresses:** P1 features (format parameter, encodings)
**Estimated complexity:** Low - OpenSSL provides format conversion

### Phase 5: Testing & Validation
**Rationale:** Security-critical code requires thorough validation
**Delivers:** Wycheproof test coverage, Node.js compatibility verification
**Avoids:** Public key validation pitfall by testing with known-invalid keys
**Estimated complexity:** Medium - requires test infrastructure in RN app

### Phase Ordering Rationale

- **C++ first** because TypeScript depends on native methods existing
- **WebCrypto before Node.js API** because the Node.js API can use WebCrypto primitives internally
- **Core before formats** because compressed/uncompressed is additional complexity on working foundation
- **Testing last** because tests validate complete implementation

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** May need to investigate OSSL_PARAM configuration for edge cases
- **Phase 5:** Need to set up Wycheproof test infrastructure in React Native context

Phases with standard patterns (skip research-phase):
- **Phase 2:** Well-documented WebCrypto spec, existing xDeriveBits pattern
- **Phase 3:** Node.js API is well-documented, straightforward mapping
- **Phase 4:** OpenSSL format conversion is standard

## Test Vectors

**Primary sources:**
- **Wycheproof secp256k1**: `https://github.com/C2SP/wycheproof/blob/main/testvectors/ecdh_secp256k1_test.json` - invalid keys, edge cases
- **Node.js test suite**: `test/parallel/test-crypto-ecdh.js` - API compatibility

**Test categories needed:**
| Category | Purpose | Source |
|----------|---------|--------|
| Valid key exchange | Basic functionality | Node.js, custom |
| Invalid public keys | Security validation | Wycheproof |
| Format conversion | Compressed/uncompressed | Custom |
| Leading zeros | Edge case | Wycheproof |
| Error handling | Match Node.js errors | Node.js tests |

## Implementation Confidence

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Verified against OpenSSL 3.x docs, existing codebase patterns |
| Features | HIGH | Node.js v25.3.0 official documentation |
| Architecture | HIGH | Existing patterns in codebase, minimal new code |
| Pitfalls | HIGH | CVE documentation, security research, Wycheproof |

**Overall confidence:** HIGH

### Gaps to Address

- **Wycheproof integration:** Need to determine how to run Wycheproof vectors in React Native test environment
- **Raw key format option:** Decision needed on whether deriveBits should also accept raw keys (not just DER) - defer to implementation

## Sources

### Primary (HIGH confidence)
- OpenSSL 3.x EVP_KEYEXCH-ECDH documentation
- OpenSSL Wiki: Elliptic Curve Diffie Hellman
- Node.js Crypto Documentation v25.3.0
- Existing codebase: HybridEcKeyPair.cpp, HybridEdKeyPair.cpp, HybridKeyObjectHandle.cpp

### Secondary (MEDIUM confidence)
- Wycheproof test vectors and documentation
- CVE-2024-48930 (secp256k1-node vulnerability analysis)
- Hacken: Securing ECDH in Secp256k1

### Tertiary (needs validation)
- Blockchain ecosystem compatibility requirements (Bitcoin/Ethereum key formats)

---
*Research completed: 2026-01-18*
*Ready for roadmap: yes*
