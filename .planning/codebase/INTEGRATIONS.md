# External Integrations

**Analysis Date:** 2025-01-18

## APIs & External Services

**No External APIs:**
- This is a cryptographic library that operates entirely locally
- All operations use native C++/OpenSSL implementations
- No network calls, no external service dependencies

## Native Library Dependencies

**OpenSSL 3.6.0:**
- Purpose: Core cryptographic operations (hashing, encryption, key generation, signatures)
- iOS: Downloaded as xcframework from `https://github.com/krzyzanowskim/OpenSSL/releases/`
- Android: `io.github.ronickg:openssl:3.6.0-1` via Maven prefab
- Configuration: Automatic download during pod install / gradle sync

**libsodium 1.0.20 (Optional):**
- Purpose: XSalsa20 cipher support
- Enable flag: `SODIUM_ENABLED=1` (iOS) or `sodiumEnabled=true` (Android)
- iOS: Built from source during pod prepare
- Android: `io.github.ronickg:sodium:1.0.20-1` via Maven prefab

**BLAKE3:**
- Purpose: Fast cryptographic hashing
- Integration: Git submodule at `packages/react-native-quick-crypto/deps/blake3`
- Source: https://github.com/BLAKE3-team/BLAKE3.git
- Compiled directly into native library

**ncrypto:**
- Purpose: Node.js-compatible crypto utilities
- Integration: Git submodule at `packages/react-native-quick-crypto/deps/ncrypto`
- Source: https://github.com/boorad/ncrypto.git (fix/use-BN_GENCB_get_arg branch)
- Compiled directly into native library

**fastpbkdf2:**
- Purpose: Optimized PBKDF2 key derivation
- Integration: Source files at `packages/react-native-quick-crypto/deps/fastpbkdf2`
- Compiled directly into native library

## Data Storage

**Databases:**
- None - Library does not persist data

**File Storage:**
- None - All operations are in-memory

**Caching:**
- None

## Authentication & Identity

**Auth Provider:**
- Not applicable - This is a cryptographic library, not an auth solution
- Provides primitives (hashing, signing) that apps can use for auth

## Monitoring & Observability

**Error Tracking:**
- None built-in

**Logs:**
- Android: Uses Android log library for native debugging
- Development: Console logging in example app
- No production logging infrastructure

## CI/CD & Deployment

**Hosting:**
- npm registry: https://registry.npmjs.org (package distribution)
- GitHub: Source code and releases

**CI Pipeline (GitHub Actions):**
- `validate-js.yml` - TypeScript compilation and linting
- `validate-cpp.yml` - C++ validation
- `validate-android.yml` - Android build validation
- `e2e-ios-test.yml` - iOS E2E tests with Maestro
- `e2e-android-test.yml` - Android E2E tests with Maestro
- `release.yml` - Manual release workflow
- `deploy-docs.yml` - Documentation site deployment

**Build Environment:**
- macOS runners: For iOS builds and releases
- Ubuntu runners: For JS validation
- Xcode 16.4: iOS builds
- Bun 1.2.9: Package management in CI

## Environment Configuration

**Required env vars:**
- None required for library usage

**Build-time configuration:**
- `SODIUM_ENABLED` (iOS): Set to `1` to enable libsodium support
- `sodiumEnabled` (Android gradle property): Set to `true` for libsodium

**CI Secrets:**
- `GITHUB_TOKEN` - Standard GitHub token for releases
- `IMGBB_API_KEY` - Screenshot hosting for E2E test results

## Package Registry

**npm Publishing:**
- Registry: https://registry.npmjs.org
- Package: `react-native-quick-crypto`
- Published from: `packages/react-native-quick-crypto`
- Uses npm provenance (OIDC)

**Release Process:**
- release-it for versioning and GitHub releases
- Conventional changelog for release notes
- Manual workflow dispatch with version input

## Documentation Site

**Hosting:**
- GitHub Pages (via deploy-docs.yml workflow)
- Path: `/docs` directory

**Framework:**
- Next.js 16.0.10
- Fumadocs UI/Core for documentation framework

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

## Third-Party Library Sources

**iOS xcframework downloads:**
- OpenSSL: `https://github.com/krzyzanowskim/OpenSSL/releases/download/{version}/OpenSSL.xcframework.zip`
- libsodium: `https://download.libsodium.org/libsodium/releases/libsodium-1.0.20-stable.tar.gz`

**Android prefab packages:**
- OpenSSL: `io.github.ronickg:openssl:3.6.0-1`
- Sodium: `io.github.ronickg:sodium:1.0.20-1`

## Security Considerations

**No secrets in library:**
- Library does not store or transmit secrets
- Cryptographic keys are managed by consuming applications
- Error messages sanitized to avoid key material exposure

**Build integrity:**
- npm provenance enabled for published packages
- Git submodules use specific commits/branches

---

*Integration audit: 2025-01-18*
