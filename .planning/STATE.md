# Project State

**Current Phase:** 2
**Status:** Ready to Plan

## Project Reference

See: .planning/PROJECT.md (updated 2025-01-18)

**Core value:** Users can derive shared secrets using ECDH with secp256k1, matching Node.js crypto behavior exactly
**Current focus:** Phase 2 - Secret Derivation (ready to plan)

## Progress

| Phase | Name | Status | Plans |
|-------|------|--------|-------|
| 1 | Core ECDH | ✓ Complete | 3/3 |
| 1.1 | Fix Expo Build | ✓ Complete | 3/3 |
| 2 | Secret Derivation | Ready to Plan | 0/? |
| 3 | Extras | Pending | 0/? |

## Current Position

```
Phase 2: Secret Derivation
Status: Ready to plan
[                    ] 0%

Last activity: 2026-01-18 - Phase 1.1 complete, ECDH verified working
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
- Default format is uncompressed (65 bytes) matching Node.js default
- Binary encoding is alias for latin1 per Node.js crypto behavior
- ERR_CRYPTO_INVALID_CURVE error code for unsupported curves
- Use ${PODS_ROOT}/Headers/{Private,Public} for NitroModules framework-style includes

### Technical Notes

- Created HybridEcdh with EVP_PKEY lifecycle management (freed in destructor)
- Use EVP_PKEY_derive API (OpenSSL 3.6+) for future computeSecret
- EC_POINT_point2oct for raw key export (not EVP_PKEY_get_raw_public_key)
- Auto-derive public key from private via EC_POINT_mul
- setCurve validates secp256k1 is the only supported curve
- BN_bn2binpad for 32-byte private key export
- Proper resource cleanup on all error paths
- ECDH TypeScript class wraps native via NitroModules.createHybridObject
- PODS_ROOT/Headers/{Private,Public} enables framework-style includes for CocoaPods dependencies
- HybridEcdh registered in Nitrogen autolinking (nitro.json + codegen)

### Patterns Established

- ECDH Nitro interface with raw key methods (getPublicKeyRaw, getPrivateKeyRaw, setPrivateKeyRaw)
- clearOpenSSLErrors() before operations, getOpenSSLError() in error messages
- OpenSSL resource cleanup on all error paths before throwing
- Factory function validates curve before creating instance
- encodeOutput/decodeInput helpers for Buffer/string conversion
- ${PODS_ROOT}/Headers paths for framework-style dependency includes
- New HybridObject requires nitro.json autolinking entry + Nitrogen codegen run
- ECDH tests added to example app for regression testing

### Blockers

None

### Roadmap Evolution

- Phase 1.1 inserted after Phase 1: Fix Expo build issues for ECDH verification (COMPLETE)

### TODOs

- Plan and execute Phase 2 (computeSecret implementation)
- Plan and execute Phase 3 (Extras)

## Session Continuity

**Last session:** 2026-01-18
**Stopped at:** Phase 1.1 complete, all ECDH tests passing
**Next step:** /gsd:plan-phase 2 or /gsd:discuss-phase 2

---
*State updated: 2026-01-18*
