# Phase 1: Core ECDH - Context

**Gathered:** 2025-01-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Create ECDH instances, generate key pairs, and import/export keys in various formats. This includes `createECDH()`, `generateKeys()`, `getPublicKey()`, `getPrivateKey()`, and `setPrivateKey()`. Secret derivation (`computeSecret()`) and deprecated methods (`setPublicKey()`, `convertKey()`) are separate phases.

</domain>

<decisions>
## Implementation Decisions

### API Compatibility
- Match Node.js crypto ECDH behavior exactly
- Error types, messages, and codes must match Node.js
- Return types must match (Buffer when no encoding, string when encoding specified)
- Edge cases and quirks should be replicated, not "fixed"

### Error Behavior
- Use Node.js error codes (e.g., `ERR_CRYPTO_ECDH_INVALID_PUBLIC_KEY`)
- Throw on unsupported curves (only secp256k1 supported in this implementation)
- Match Node.js validation strictness for all inputs

### Encoding Handling
- Default to Buffer output when no encoding specified
- Support 'hex', 'base64', 'latin1' encodings matching Node.js
- Input encoding auto-detection follows Node.js patterns

### Key Format Handling
- Support 'compressed' (33 bytes) and 'uncompressed' (65 bytes) formats
- Default format matches Node.js default (uncompressed)
- Auto-derive public key from private key using EC_POINT_mul

### Claude's Discretion
- Internal implementation details (OpenSSL API usage patterns)
- Memory management approach (following existing codebase patterns)
- Code organization within the constraint of matching Node.js behavior

</decisions>

<specifics>
## Specific Ideas

- "Just match Node.js behavior" — the primary design principle
- Use Node.js crypto tests as validation suite
- Reference `$REPOS/node/deps/ncrypto` for implementation patterns

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-core-ecdh*
*Context gathered: 2025-01-18*
