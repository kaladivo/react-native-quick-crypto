# ECDH Implementation for React Native Quick Crypto

## What This Is

Adding ECDH (Elliptic Curve Diffie-Hellman) key exchange to React Native Quick Crypto, specifically supporting the secp256k1 curve with a Node.js-compatible API. This enables encrypted messaging use cases by allowing two parties to derive shared secrets from their key pairs.

## Core Value

Users can derive shared secrets using ECDH with secp256k1, matching Node.js crypto behavior exactly for drop-in compatibility.

## Requirements

### Validated

- ✓ Hash functions (SHA-1, SHA-256, SHA-384, SHA-512, MD5) — existing
- ✓ HMAC with all hash algorithms — existing
- ✓ PBKDF2 key derivation — existing
- ✓ HKDF key derivation — existing
- ✓ AES ciphers (GCM, CCM, CTR, CBC) — existing
- ✓ ChaCha20-Poly1305 cipher — existing
- ✓ BLAKE3 hashing — existing
- ✓ Cryptographically secure random generation — existing
- ✓ WebCrypto subtle API — existing
- ✓ Key object management (KeyObjectHandle) — existing

### Active

- [ ] `createECDH('secp256k1')` function returning ECDH instance
- [ ] `ecdh.generateKeys()` generating key pair
- [ ] `ecdh.computeSecret(otherPublicKey)` deriving shared secret
- [ ] `ecdh.getPublicKey()` with encoding support (raw bytes)
- [ ] `ecdh.getPrivateKey()` with encoding support (raw bytes)
- [ ] `ecdh.setPublicKey(key)` importing public key
- [ ] `ecdh.setPrivateKey(key)` importing private key
- [ ] Compressed and uncompressed public key formats

### Out of Scope

- NIST curves (P-256, P-384, P-521) — Not needed for current use case
- X25519 curve — Not needed for current use case
- PEM/DER key formats — Raw bytes sufficient for messaging
- JWK key format — Raw bytes sufficient for messaging
- WebCrypto `subtle.deriveKey()` for ECDH — Node.js API only

## Context

This is a brownfield project adding to an established React Native crypto library. The library already has:

- **Layered architecture:** TypeScript API → Nitro Modules bridge → C++ implementation → OpenSSL
- **Established patterns:** HybridObjects for native bindings, factory pattern for polymorphic operations
- **Key infrastructure:** KeyObjectHandle for key management, existing EC key support in WebCrypto
- **Build system:** CocoaPods (iOS), CMake/Gradle (Android), react-native-builder-bob

The secp256k1 curve is used for encrypted messaging in apps (like Signal-style protocols) and blockchain applications (Bitcoin, Ethereum). The user needs Node.js crypto API compatibility for migration from pure JavaScript implementations.

## Constraints

- **API compatibility**: Must match Node.js `crypto.createECDH('secp256k1')` behavior exactly
- **Tech stack**: OpenSSL 3.6+ EVP APIs only (no deprecated functions)
- **Architecture**: Follow existing HybridObject pattern for native bridging
- **C++ standard**: C++20 with smart pointers and RAII
- **Security**: Constant-time operations where applicable, secure key handling

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| secp256k1 only | User's use case is encrypted messaging, one curve sufficient | — Pending |
| Node.js API style | Drop-in compatibility with existing code | — Pending |
| Raw bytes format | Sufficient for messaging, simpler implementation | — Pending |

---
*Last updated: 2025-01-18 after initialization*
