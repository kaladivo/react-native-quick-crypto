# Project State

**Current Phase:** 1
**Status:** In Progress

## Project Reference

See: .planning/PROJECT.md (updated 2025-01-18)

**Core value:** Users can derive shared secrets using ECDH with secp256k1, matching Node.js crypto behavior exactly
**Current focus:** Phase 1 - Core ECDH (Plan 02 complete)

## Progress

| Phase | Name | Status | Plans |
|-------|------|--------|-------|
| 1 | Core ECDH | In Progress | 2/? |
| 2 | Secret Derivation | Pending | 0/? |
| 3 | Extras | Pending | 0/? |

## Current Position

```
Phase 1: Core ECDH
Plan: 01-02-PLAN.md complete
[========            ] 40% (estimated)

Last activity: 2026-01-18 - Completed 01-02-PLAN.md (ECDH Cryptographic Operations)
```

## Accumulated Context

### Key Decisions

- Phase structure derived from requirement clusters: factory/keys, derivation, extras
- secp256k1 only (per PROJECT.md scope)
- Node.js API compatibility is primary goal
- Dedicated HybridEcdh module for Node.js ECDH API (separate from WebCrypto HybridEcKeyPair)
- format parameter as number (0=compressed, 1=uncompressed) for getPublicKeyRaw
- Use EC_KEY APIs (EC_KEY_generate_key) for secp256k1 key generation
- Private key range validation [1, n-1] before setting

### Technical Notes

- Created HybridEcdh with EVP_PKEY lifecycle management (freed in destructor)
- Use EVP_PKEY_derive API (OpenSSL 3.6+) for future computeSecret
- EC_POINT_point2oct for raw key export (not EVP_PKEY_get_raw_public_key)
- Auto-derive public key from private via EC_POINT_mul
- setCurve validates secp256k1 is the only supported curve
- BN_bn2binpad for 32-byte private key export
- Proper resource cleanup on all error paths

### Patterns Established

- ECDH Nitro interface with raw key methods (getPublicKeyRaw, getPrivateKeyRaw, setPrivateKeyRaw)
- clearOpenSSLErrors() before operations, getOpenSSLError() in error messages
- OpenSSL resource cleanup on all error paths before throwing

### Blockers

None

### TODOs

- Execute Plan 03 (TypeScript wrapper) - if exists
- Execute Phase 2 (computeSecret implementation)

## Session Continuity

**Last session:** 2026-01-18 09:37 UTC
**Stopped at:** Completed 01-02-PLAN.md
**Resume file:** .planning/phases/01-core-ecdh/01-03-PLAN.md (if exists)

---
*State updated: 2026-01-18*
