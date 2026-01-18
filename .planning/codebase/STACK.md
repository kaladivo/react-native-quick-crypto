# Technology Stack

**Analysis Date:** 2025-01-18

## Languages

**Primary:**
- TypeScript 5.8.3 - Library API surface and React Native bindings (`packages/react-native-quick-crypto/src/**/*.ts`)
- C++20 - Cryptographic implementations using OpenSSL (`packages/react-native-quick-crypto/cpp/**/*.{hpp,cpp}`)

**Secondary:**
- Ruby - CocoaPods configuration (`packages/react-native-quick-crypto/QuickCrypto.podspec`)
- Kotlin 1.9.25 - Android native bridging (`packages/react-native-quick-crypto/android/`)
- Objective-C++ - iOS native bridging (`packages/react-native-quick-crypto/ios/`)

## Runtime

**Environment:**
- React Native 0.81.1 - Mobile runtime environment
- Hermes - JavaScript engine (default for RN 0.81+)
- Node.js 18+ - Development/build environment (example app requires this)

**Package Manager:**
- Bun 1.2.0+ (specified in `package.json` as `packageManager`)
- Lockfile: `bun.lock` present at root

## Frameworks

**Core:**
- React Native 0.81.1 - Mobile framework
- React 19.1.0 - UI library (example app)
- Nitro Modules 0.29.1 - Native bridging framework for TypeScript <-> C++ communication

**Testing:**
- Jest 29.7.0 - Test runner (example app configuration)
- Chai 6.2.1 - Assertion library (example app)
- Maestro - E2E testing for iOS and Android

**Build/Dev:**
- react-native-builder-bob 0.40.15 - Library build tool (CommonJS, ESM, TypeScript declarations)
- nitro-codegen 0.29.4 - Generates native bindings from TypeScript specs
- CMake 3.10+ - C++ build system (Android)
- CocoaPods - iOS dependency management
- Gradle 8.7.3 - Android build system

## Key Dependencies

**Critical:**
- `react-native-nitro-modules` 0.29.1 - Synchronous native module calls via JSI
- `@craftzdog/react-native-buffer` 6.1.0 - Buffer polyfill for React Native
- `react-native-quick-base64` 2.2.2 - Base64 encoding/decoding

**Native Crypto Libraries:**
- OpenSSL 3.6.0 - Primary cryptographic library
  - iOS: Downloaded as xcframework from GitHub releases
  - Android: `io.github.ronickg:openssl:3.6.0-1` (Maven/prefab)
- BLAKE3 - Fast hashing (git submodule at `deps/blake3`)
- ncrypto - Node.js crypto utilities (git submodule at `deps/ncrypto`)
- fastpbkdf2 - Optimized PBKDF2 implementation (`deps/fastpbkdf2`)

**Optional:**
- libsodium 1.0.20 - XSalsa20 cipher support (opt-in via `SODIUM_ENABLED` flag)
  - iOS: Built from source in podspec prepare_command
  - Android: `io.github.ronickg:sodium:1.0.20-1` (Maven/prefab)

**Infrastructure:**
- `events` 3.3.0 - EventEmitter polyfill
- `readable-stream` 4.5.2 - Stream polyfill
- `safe-buffer` 5.2.1 - Buffer utilities
- `util` 0.12.5 - Node.js util polyfill

## Configuration

**TypeScript:**
- Config: `packages/react-native-quick-crypto/tsconfig.json`
- Strict mode enabled with additional checks:
  - `noUncheckedIndexedAccess: true`
  - `noUnusedLocals: true`
  - `noUnusedParameters: true`
  - `noImplicitReturns: true`
- Target: ESNext, Module: ESNext

**C++ Formatting:**
- Config: `.clang-format`
- Standard: C++20
- Based on: LLVM style
- Column limit: 140
- Indent width: 2

**Linting:**
- ESLint 9.24.0 with TypeScript support
- Config: `eslint.config.js` (flat config format)
- Plugins: `@typescript-eslint`, `prettier`, `react-native`

**Formatting:**
- Prettier 3.5.3
- Config: `prettier.config.js`
- Settings: single quotes, trailing commas, no arrow parens

**Nitro Modules:**
- Config: `packages/react-native-quick-crypto/nitro.json`
- C++ namespace: `crypto`
- iOS module name: `QuickCrypto`
- Android lib name: `QuickCrypto`

## Build Configuration

**Library Build (react-native-builder-bob):**
- Source: `packages/react-native-quick-crypto/src`
- Output: `packages/react-native-quick-crypto/lib`
- Targets: CommonJS, ESM, TypeScript declarations

**Android (Gradle/CMake):**
- Config: `packages/react-native-quick-crypto/android/build.gradle`
- CMake: `packages/react-native-quick-crypto/android/CMakeLists.txt`
- NDK: Uses project-specified version
- ABI filters: armeabi-v7a, x86, x86_64, arm64-v8a
- C++ flags: `-frtti -fexceptions -Wall -fstack-protector-all`
- C++ standard: C++20

**iOS (CocoaPods):**
- Config: `packages/react-native-quick-crypto/QuickCrypto.podspec`
- Deployment targets: iOS (minimum supported), macOS 10.13, tvOS 13.4, visionOS 1.0
- C++ standard: C++20
- Vendor: OpenSSL.xcframework (downloaded during pod install)

## Platform Requirements

**Development:**
- macOS (for iOS development)
- Bun 1.2.0+
- Xcode 16+ (iOS)
- Android Studio with NDK (Android)
- Ruby (for CocoaPods/bundler)
- clang-format (for C++ formatting)

**Production:**
- iOS: Minimum version per React Native 0.81
- Android: minSdkVersion per project configuration
- Uses New Architecture (TurboModules/Fabric) when enabled

## Expo Support

**Plugin:**
- Config plugin: `packages/react-native-quick-crypto/app.plugin.js`
- TypeScript source: `packages/react-native-quick-crypto/src/expo-plugin/`
- Handles: XCode build settings, sodium flag configuration

**Compatibility:**
- Expo 48.0.0+ (peer dependency)
- `expo-build-properties` (optional peer dependency)

## Monorepo Structure

**Workspaces:**
- `packages/react-native-quick-crypto` - Main library
- `example` - Example/test React Native app
- `docs` - Documentation site (Next.js 16 with Fumadocs)

**Scripts:**
- `bun bootstrap` - Install deps + pods
- `bun specs` - Generate Nitro bindings
- `bun tsc` - Type check all workspaces
- `bun lint` / `bun format` - Lint and format all workspaces

---

*Stack analysis: 2025-01-18*
