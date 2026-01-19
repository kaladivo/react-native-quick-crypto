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
- [x] 01-01-PLAN.md — Native ECDH infrastructure (Nitro + C++ skeleton + build)
- [x] 01-02-PLAN.md — C++ key operations (generateKeys, get/set keys)
- [x] 01-03-PLAN.md — TypeScript ECDH class and package exports
- [ ] 01-04-PLAN.md — End-to-end verification checkpoint (deferred to Phase 1.1)

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

### Phase 1.1: Fix Expo Build (INSERTED)

**Goal:** Fix pre-existing library build issues to enable ECDH verification in example app

**Depends on:** Phase 1

**Plans:** 3 plans

Plans:
- [x] 01.1-01-PLAN.md — Add Ecdh to nitro.json + run Nitrogen codegen (Android fix)
- [x] 01.1-02-PLAN.md — Add NitroModules header paths to QuickCrypto.podspec (iOS fix)
- [x] 01.1-03-PLAN.md — Build verification and ECDH testing checkpoint

**Context:**
- iOS build fails: NitroModules headers not found (`#error NitroModules cannot be found!`)
- Android issue: HybridEcdh not registered in QuickCryptoOnLoad.cpp (missing from nitro.json)
- Root causes identified via research - both are configuration issues, not code bugs
- Issues are pre-existing in the library, not caused by ECDH changes

**Success Criteria:**
1. Expo app builds successfully on at least one platform (Android or iOS)
2. ECDH tests run in emulator/simulator and all pass

### Phase 2: Secret Derivation

**Goal:** Users can derive shared secrets from key pairs with proper security validation.

**Dependencies:** Phase 1 (requires key generation and import)

**Plans:** 3 plans

Plans:
- [x] 02-01-PLAN.md — C++ computeSecretRaw implementation with EVP_PKEY_derive
- [x] 02-02-PLAN.md — TypeScript integration + Nitrogen codegen
- [x] 02-03-PLAN.md — Test suite and verification checkpoint

**Requirements:**
- ECDH-05: `computeSecret(otherPublicKey)` derives 32-byte shared secret
- ECDH-06: `computeSecret()` accepts Buffer input
- ECDH-07: `computeSecret()` accepts hex string input with inputEncoding
- ECDH-08: `computeSecret()` returns Buffer or encoded string based on outputEncoding
- ECDH-09: `computeSecret()` throws `ERR_CRYPTO_ECDH_INVALID_PUBLIC_KEY` for invalid keys
- ECDH-23: Public key validation prevents invalid curve attacks (per CVE-2024-48930)
- ECDH-24: Private key validation ensures key is in valid range [1, n-1] (already implemented in Phase 1)

**Success Criteria:**
1. User can derive a shared secret by calling `computeSecret()` with another party's public key
2. Shared secret is exactly 32 bytes and matches Node.js crypto output for the same key pairs
3. Invalid public keys are rejected with `ERR_CRYPTO_ECDH_INVALID_PUBLIC_KEY` error
4. Two parties with complementary key pairs derive identical shared secrets

### Phase 3: Extras (SKIPPED)

**Goal:** Users have access to deprecated compatibility methods and format conversion utilities.

**Status:** Skipped — deprecated methods not needed for current use case

**Dependencies:** Phase 1 (requires key infrastructure)

**Plans:** None (skipped)

**Requirements (deferred):**
- ECDH-19: `setPublicKey(key)` imports public key (deprecated but supported)
- ECDH-20: `setPublicKey()` accepts compressed and uncompressed formats
- ECDH-21: `ECDH.convertKey(key, curve, inputEncoding, outputEncoding, format)` static method
- ECDH-22: `convertKey()` converts between compressed and uncompressed formats

**Note:** These can be implemented later if needed. Core ECDH functionality (createECDH, generateKeys, get/set keys, computeSecret) is complete.

## Progress

| Phase | Name | Status | Requirements |
|-------|------|--------|--------------|
| 1 | Core ECDH | Complete | 13 |
| 1.1 | Fix Expo Build | Complete | 0 (infrastructure) |
| 2 | Secret Derivation | Complete | 7 |
| 3 | Extras | Skipped | 0 (deferred) |

---
*Roadmap created: 2025-01-18*
*Phase 1 planned: 2025-01-18*
*Phase 1.1 planned: 2026-01-18*
*Phase 1.1 complete: 2026-01-18*
*Phase 2 planned: 2026-01-19*
*Phase 2 complete: 2026-01-19*
*Phase 3 skipped: 2026-01-19*
*Milestone complete: 2026-01-19*
