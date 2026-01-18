# Roadmap: ECDH Implementation

**Created:** 2025-01-18
**Phases:** 3
**Requirements:** 24 mapped

## Overview

This roadmap delivers ECDH key exchange with secp256k1 curve support for React Native Quick Crypto. The implementation follows existing codebase patterns, extending HybridEcKeyPair with ECDH derivation capabilities and exposing a Node.js-compatible API. Three phases deliver: (1) core ECDH object with key generation and import/export, (2) secret derivation with security validation, and (3) extras including deprecated methods and format conversion.

## Phases

### Phase 1: Core ECDH

**Goal:** Users can create ECDH instances, generate key pairs, and import/export keys in various formats.

**Dependencies:** None (foundation phase)

**Plans:** 4 plans

Plans:
- [ ] 01-01-PLAN.md — Native ECDH infrastructure (Nitro + C++ skeleton + build)
- [ ] 01-02-PLAN.md — C++ key operations (generateKeys, get/set keys)
- [ ] 01-03-PLAN.md — TypeScript ECDH class and package exports
- [ ] 01-04-PLAN.md — End-to-end verification checkpoint

**Requirements:**
- ECDH-01: `createECDH('secp256k1')` returns ECDH instance
- ECDH-02: `generateKeys()` generates secp256k1 key pair
- ECDH-03: `generateKeys(encoding)` returns public key in specified encoding
- ECDH-04: `generateKeys(encoding, format)` supports compressed/uncompressed format
- ECDH-10: `getPublicKey()` returns public key as Buffer
- ECDH-11: `getPublicKey(encoding)` returns encoded string (hex, base64, etc.)
- ECDH-12: `getPublicKey(encoding, 'compressed')` returns 33-byte compressed key
- ECDH-13: `getPublicKey(encoding, 'uncompressed')` returns 65-byte uncompressed key
- ECDH-14: `getPrivateKey()` returns 32-byte private key as Buffer
- ECDH-15: `getPrivateKey(encoding)` returns encoded string
- ECDH-16: `setPrivateKey(key)` imports private key from Buffer
- ECDH-17: `setPrivateKey(key, encoding)` imports from encoded string
- ECDH-18: `setPrivateKey()` auto-derives corresponding public key

**Success Criteria:**
1. User can call `createECDH('secp256k1')` and receive an ECDH instance
2. User can call `generateKeys()` and receive a valid secp256k1 public key
3. User can export public key in both compressed (33 bytes) and uncompressed (65 bytes) formats
4. User can import a private key and retrieve the auto-derived public key
5. User can export keys with hex, base64, and buffer encodings

### Phase 2: Secret Derivation

**Goal:** Users can derive shared secrets from key pairs with proper security validation.

**Dependencies:** Phase 1 (requires key generation and import)

**Plans:** (created by /gsd:plan-phase)

**Requirements:**
- ECDH-05: `computeSecret(otherPublicKey)` derives 32-byte shared secret
- ECDH-06: `computeSecret()` accepts Buffer input
- ECDH-07: `computeSecret()` accepts hex string input with inputEncoding
- ECDH-08: `computeSecret()` returns Buffer or encoded string based on outputEncoding
- ECDH-09: `computeSecret()` throws `ERR_CRYPTO_ECDH_INVALID_PUBLIC_KEY` for invalid keys
- ECDH-23: Public key validation prevents invalid curve attacks (per CVE-2024-48930)
- ECDH-24: Private key validation ensures key is in valid range [1, n-1]

**Success Criteria:**
1. User can derive a shared secret by calling `computeSecret()` with another party's public key
2. Shared secret is exactly 32 bytes and matches Node.js crypto output for the same key pairs
3. Invalid public keys are rejected with `ERR_CRYPTO_ECDH_INVALID_PUBLIC_KEY` error
4. Two parties with complementary key pairs derive identical shared secrets

### Phase 3: Extras

**Goal:** Users have access to deprecated compatibility methods and format conversion utilities.

**Dependencies:** Phase 1 (requires key infrastructure)

**Plans:** (created by /gsd:plan-phase)

**Requirements:**
- ECDH-19: `setPublicKey(key)` imports public key (deprecated but supported)
- ECDH-20: `setPublicKey()` accepts compressed and uncompressed formats
- ECDH-21: `ECDH.convertKey(key, curve, inputEncoding, outputEncoding, format)` static method
- ECDH-22: `convertKey()` converts between compressed and uncompressed formats

**Success Criteria:**
1. User can call `setPublicKey()` to import a public key directly (for deprecated codepaths)
2. User can convert public keys between compressed and uncompressed formats using `ECDH.convertKey()`
3. `convertKey()` accepts hex input and returns hex output with format conversion

## Progress

| Phase | Name | Status | Requirements |
|-------|------|--------|--------------|
| 1 | Core ECDH | Planned | 13 |
| 2 | Secret Derivation | Pending | 7 |
| 3 | Extras | Pending | 4 |

---
*Roadmap created: 2025-01-18*
*Phase 1 planned: 2025-01-18*
