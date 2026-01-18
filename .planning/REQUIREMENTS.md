# Requirements: ECDH Implementation

**Defined:** 2025-01-18
**Core Value:** Users can derive shared secrets using ECDH with secp256k1, matching Node.js crypto behavior exactly

## v1 Requirements

### Factory

- [ ] **ECDH-01**: `createECDH('secp256k1')` returns ECDH instance

### Key Generation

- [ ] **ECDH-02**: `generateKeys()` generates secp256k1 key pair
- [ ] **ECDH-03**: `generateKeys(encoding)` returns public key in specified encoding
- [ ] **ECDH-04**: `generateKeys(encoding, format)` supports compressed/uncompressed format

### Secret Derivation

- [ ] **ECDH-05**: `computeSecret(otherPublicKey)` derives 32-byte shared secret
- [ ] **ECDH-06**: `computeSecret()` accepts Buffer input
- [ ] **ECDH-07**: `computeSecret()` accepts hex string input with inputEncoding
- [ ] **ECDH-08**: `computeSecret()` returns Buffer or encoded string based on outputEncoding
- [ ] **ECDH-09**: `computeSecret()` throws `ERR_CRYPTO_ECDH_INVALID_PUBLIC_KEY` for invalid keys

### Key Export

- [ ] **ECDH-10**: `getPublicKey()` returns public key as Buffer
- [ ] **ECDH-11**: `getPublicKey(encoding)` returns encoded string (hex, base64, etc.)
- [ ] **ECDH-12**: `getPublicKey(encoding, 'compressed')` returns 33-byte compressed key
- [ ] **ECDH-13**: `getPublicKey(encoding, 'uncompressed')` returns 65-byte uncompressed key
- [ ] **ECDH-14**: `getPrivateKey()` returns 32-byte private key as Buffer
- [ ] **ECDH-15**: `getPrivateKey(encoding)` returns encoded string

### Key Import

- [ ] **ECDH-16**: `setPrivateKey(key)` imports private key from Buffer
- [ ] **ECDH-17**: `setPrivateKey(key, encoding)` imports from encoded string
- [ ] **ECDH-18**: `setPrivateKey()` auto-derives corresponding public key
- [ ] **ECDH-19**: `setPublicKey(key)` imports public key (deprecated but supported)
- [ ] **ECDH-20**: `setPublicKey()` accepts compressed and uncompressed formats

### Format Conversion

- [ ] **ECDH-21**: `ECDH.convertKey(key, curve, inputEncoding, outputEncoding, format)` static method
- [ ] **ECDH-22**: `convertKey()` converts between compressed and uncompressed formats

### Security

- [ ] **ECDH-23**: Public key validation prevents invalid curve attacks (per CVE-2024-48930)
- [ ] **ECDH-24**: Private key validation ensures key is in valid range [1, n-1]

## v2 Requirements

### Additional Curves

- **CURVE-01**: Support P-256 (prime256v1) curve
- **CURVE-02**: Support P-384 (secp384r1) curve
- **CURVE-03**: Support P-521 (secp521r1) curve

### Additional Formats

- **FMT-01**: PEM key format support
- **FMT-02**: JWK key format support

## Out of Scope

| Feature | Reason |
|---------|--------|
| X25519 curve | Different API (not ECDH class), separate implementation |
| WebCrypto subtle.deriveKey() | Node.js API only for this milestone |
| Hybrid format | Rarely used, Node.js supports but not priority |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ECDH-01 | Phase 1 | Pending |
| ECDH-02 | Phase 1 | Pending |
| ECDH-03 | Phase 1 | Pending |
| ECDH-04 | Phase 1 | Pending |
| ECDH-05 | Phase 2 | Pending |
| ECDH-06 | Phase 2 | Pending |
| ECDH-07 | Phase 2 | Pending |
| ECDH-08 | Phase 2 | Pending |
| ECDH-09 | Phase 2 | Pending |
| ECDH-10 | Phase 1 | Pending |
| ECDH-11 | Phase 1 | Pending |
| ECDH-12 | Phase 1 | Pending |
| ECDH-13 | Phase 1 | Pending |
| ECDH-14 | Phase 1 | Pending |
| ECDH-15 | Phase 1 | Pending |
| ECDH-16 | Phase 1 | Pending |
| ECDH-17 | Phase 1 | Pending |
| ECDH-18 | Phase 1 | Pending |
| ECDH-19 | Phase 3 | Pending |
| ECDH-20 | Phase 3 | Pending |
| ECDH-21 | Phase 3 | Pending |
| ECDH-22 | Phase 3 | Pending |
| ECDH-23 | Phase 2 | Pending |
| ECDH-24 | Phase 2 | Pending |

**Coverage:**
- v1 requirements: 24 total
- Mapped to phases: 24
- Unmapped: 0

---
*Requirements defined: 2025-01-18*
*Last updated: 2025-01-18 after roadmap creation*
