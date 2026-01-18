# Codebase Concerns

**Analysis Date:** 2026-01-18

## Tech Debt

**Incomplete Error Handling in Random Module:**
- Issue: Error messages in `random.ts` are incomplete - throws bare strings like `'ERR_INVALID_ARG_TYPE'` instead of proper Error objects
- Files: `packages/react-native-quick-crypto/src/random.ts:170-196`
- Impact: Poor debugging experience, non-standard error handling
- Fix approach: Replace string throws with proper `new Error()` or custom error classes matching Node.js error format

**Eslint Disable Comments Throughout Codebase:**
- Issue: Multiple `@ts-expect-error`, `eslint-disable`, and `@typescript-eslint/no-explicit-any` comments indicate type system workarounds
- Files:
  - `packages/react-native-quick-crypto/src/subtle.ts:1` (file-wide disable)
  - `packages/react-native-quick-crypto/src/subtle.ts:2020-2068` (multiple `any` casts)
  - `packages/react-native-quick-crypto/src/cipher.ts:76-77`, `318-322`
  - `packages/react-native-quick-crypto/src/keys/utils.ts:10-11`
  - `packages/react-native-quick-crypto/src/index.ts:46-55`
- Impact: Type safety gaps, potential runtime errors, maintenance burden
- Fix approach: Define proper types/interfaces for algorithm objects, fix buffer type compatibility issues

**Monolithic Subtle.ts File:**
- Issue: Single 2131-line file handles all WebCrypto subtle operations - violates modularization principle
- Files: `packages/react-native-quick-crypto/src/subtle.ts`
- Impact: Difficult to maintain, test, and navigate; high cognitive load
- Fix approach: Split into algorithm-specific modules (aes.ts, rsa.ts, hmac.ts, etc.) under `src/subtle/`

**TODO Comments Indicating Incomplete Implementation:**
- Issue: Multiple TODO/FIXME comments mark unfinished features
- Files:
  - `packages/react-native-quick-crypto/src/ec.ts:455` - KeyPairOptions not implemented
  - `packages/react-native-quick-crypto/src/ed.ts:294` - DH case commented out
  - `packages/react-native-quick-crypto/src/utils/validation.ts:106` - RFC7517 usage validation skipped
  - `packages/react-native-quick-crypto/src/utils/types.ts:213-247` - Enums need native-side definition
- Impact: Incomplete Node.js compatibility, potential edge-case failures
- Fix approach: Track and prioritize TODOs, implement missing features incrementally

**Hardcoded Constants and Magic Numbers:**
- Issue: Numeric constants without named references scattered in code
- Files:
  - `packages/react-native-quick-crypto/cpp/keys/HybridKeyObjectHandle.cpp:660-669` - Raw key size detection uses magic numbers (32, 56, 57)
  - `packages/react-native-quick-crypto/src/subtle.ts:158,165,301,309,456,463` - Padding constants, tag lengths
- Impact: Difficult to understand, potential for errors when changing values
- Fix approach: Define named constants in header files and TypeScript constant modules

## Known Bugs

**Ambiguous 32-byte Raw Key Detection:**
- Symptoms: When importing a 32-byte raw key, `initRawKey()` always assumes X25519, but it could be Ed25519
- Files: `packages/react-native-quick-crypto/cpp/keys/HybridKeyObjectHandle.cpp:660-662`
- Trigger: Importing Ed25519 raw public key via WebCrypto API
- Workaround: Use DER/SPKI format instead of raw for Ed25519 keys
- Comment in code: "Could be x25519 or ed25519 - for now assume x25519 based on test context"

**Nitro Bridge String Truncation:**
- Symptoms: Data corruption when passing strings through Nitro bridge
- Files: `packages/react-native-quick-crypto/src/keys/signVerify.ts:121`
- Trigger: Passing PEM strings with embedded null bytes or binary data as strings
- Workaround: Code comment notes "Always convert to ArrayBuffer to avoid Nitro bridge string truncation bug"

## Security Considerations

**Timing-Safe Comparison Implementation:**
- Risk: Manual constant-time comparison in TypeScript may not be truly constant-time due to JIT optimizations
- Files:
  - `packages/react-native-quick-crypto/src/subtle.ts:1319-1324` (hmacSignVerify)
  - `packages/react-native-quick-crypto/src/subtle.ts:2096-2100` (verify)
- Current mitigation: Manual XOR-based comparison loop
- Recommendations: Implement constant-time comparison in C++ layer using `CRYPTO_memcmp()`, expose via Nitro

**Missing timingSafeEqual Export:**
- Risk: Users cannot safely compare authentication tags or MACs without implementing their own
- Files: `docs/data/coverage.ts:233` - Listed as "missing"
- Current mitigation: None - users must implement their own or use HMAC verify
- Recommendations: Implement `timingSafeEqual()` using OpenSSL's `CRYPTO_memcmp()`

**Key Material in Error Messages:**
- Risk: Some error paths could potentially log or expose key sizes/formats
- Files: `packages/react-native-quick-crypto/src/keys/signVerify.ts:125-127` - Logs key sizes
- Current mitigation: Console logging only in development context
- Recommendations: Remove all console.log statements referencing key data, use structured error codes only

## Performance Bottlenecks

**Repeated NitroModules.createHybridObject Calls:**
- Problem: Each crypto operation creates new HybridObject instances
- Files:
  - `packages/react-native-quick-crypto/src/subtle.ts:154,231,271,316,417,467,679,789,845` - Multiple `createHybridObject<>()` calls per operation
  - `packages/react-native-quick-crypto/src/ec.ts:40` - Creates new EcKeyPair each time
- Cause: Object creation overhead on every operation rather than reusing instances
- Improvement path: Consider object pooling or singleton patterns for cipher factories, key handles

**Unnecessary Buffer Copies:**
- Problem: Multiple data conversion steps between Buffer types
- Files:
  - `packages/react-native-quick-crypto/src/utils/conversion.ts` - Converts between various buffer types
  - `packages/react-native-quick-crypto/src/subtle.ts` - `bufferLikeToArrayBuffer()` called frequently
- Cause: Multiple Buffer implementations (safe-buffer, @craftzdog/react-native-buffer, ArrayBuffer)
- Improvement path: Standardize on ArrayBuffer internally, minimize conversions at API boundaries

## Fragile Areas

**Key Import/Export Logic:**
- Files:
  - `packages/react-native-quick-crypto/cpp/keys/HybridKeyObjectHandle.cpp`
  - `packages/react-native-quick-crypto/cpp/keys/KeyObjectData.cpp`
- Why fragile: Complex branching logic for detecting key formats, multiple fallback paths
- Safe modification: Always test with all key formats (PEM, DER, JWK, RAW) and all key types (RSA, EC, Ed, X)
- Test coverage: Example tests exist but edge cases may not be covered

**Hash Name Normalization:**
- Files:
  - `packages/react-native-quick-crypto/src/utils/hashnames.ts`
- Why fragile: Maps between multiple naming conventions (Node.js, WebCrypto, JWK, OpenSSL)
- Safe modification: Verify all name mappings still work for all contexts after changes
- Test coverage: `packages/react-native-quick-crypto/test/hashnames.test.ts` exists but TODO comment indicates issues

**AEAD Cipher Mode Handling:**
- Files:
  - `packages/react-native-quick-crypto/cpp/cipher/HybridCipher.cpp`
  - `packages/react-native-quick-crypto/cpp/cipher/GCMCipher.cpp`
  - `packages/react-native-quick-crypto/cpp/cipher/CCMCipher.cpp`
- Why fragile: Different auth tag handling for GCM vs CCM modes, state machine for tag passing
- Safe modification: Test all AEAD modes (GCM, CCM, OCB, ChaCha20-Poly1305) with various tag lengths
- Test coverage: Tests exist in `example/src/tests/cipher/`

## Scaling Limits

**Random Cache Size:**
- Current capacity: 6KB cache for randomInt (`6 * 1024` bytes)
- Limit: Heavy randomInt usage could cause cache thrashing
- Files: `packages/react-native-quick-crypto/src/random.ts:127`
- Scaling path: Make cache size configurable, or increase default

**Maximum Buffer Length:**
- Current capacity: 2^31 - 1 bytes (~2GB) per operation
- Limit: Matches Node.js WebCrypto limits
- Files: `packages/react-native-quick-crypto/src/utils/validation.ts:6`
- Scaling path: Streaming APIs for large data (not yet implemented)

## Dependencies at Risk

**Buffer Implementation Split:**
- Risk: Three different Buffer implementations in use may diverge or conflict
- Files:
  - Uses `@craftzdog/react-native-buffer` for primary Buffer
  - Uses `safe-buffer` for some operations
  - Uses `buffer` (Node.js polyfill) in places
- Impact: Type mismatches, unexpected behavior differences
- Migration plan: Consolidate on `@craftzdog/react-native-buffer` exclusively

**OpenSSL Version Dependency:**
- Risk: ML-DSA (post-quantum) features require OpenSSL 3.5+
- Files: `packages/react-native-quick-crypto/cpp/mldsa/HybridMlDsaKeyPair.cpp:39,56,95,131,173,224`
- Impact: ML-DSA features fail on older OpenSSL versions
- Migration plan: Guard with version checks (already done), document minimum OpenSSL version

## Missing Critical Features

**ECDH deriveBits/deriveKey:**
- Problem: WebCrypto ECDH key derivation not implemented
- Blocks: Standard WebCrypto ECDH key agreement workflows
- Files: `docs/data/coverage.ts:263,273` - Listed as "missing"
- Status: X25519/X448 implemented, but NIST curves ECDH missing

**SHA-3 Digest Algorithms:**
- Problem: SHA3-256, SHA3-384, SHA3-512, cSHAKE not implemented
- Blocks: Applications requiring SHA-3 family hashes
- Files: `docs/data/coverage.ts:283-291` - Listed as "missing"
- Status: SHA-2 family fully implemented

**X509Certificate Class:**
- Problem: Certificate parsing and validation not implemented
- Blocks: TLS certificate validation, PKI operations
- Files: `docs/data/coverage.ts:113-115` - Listed as "missing"

## Test Coverage Gaps

**No Unit Test Framework Integration:**
- What's not tested: Only example app integration tests exist, no isolated unit tests
- Files: Only `packages/react-native-quick-crypto/test/hashnames.test.ts` exists (and has TODO noting issues)
- Risk: Regression detection relies entirely on example app manual testing
- Priority: High - need Jest/Vitest integration for CI

**Edge Cases in Cipher Operations:**
- What's not tested: Empty inputs, maximum-size inputs, invalid padding scenarios
- Files: Tests in `example/src/tests/cipher/` cover happy paths
- Risk: Undefined behavior on edge cases
- Priority: Medium

**Error Path Testing:**
- What's not tested: Most error conditions and exception paths
- Files: Limited error case tests in example app
- Risk: Error messages and handling may not match Node.js behavior
- Priority: Medium

---

*Concerns audit: 2026-01-18*
