# Architecture

**Analysis Date:** 2025-01-18

## Pattern Overview

**Overall:** Layered Bridge Architecture with Native Module Pattern

**Key Characteristics:**
- TypeScript API layer providing Node.js crypto compatibility
- Nitro Modules bridging layer for JS-to-native communication
- C++ implementation layer using OpenSSL for cryptographic operations
- Factory pattern for polymorphic cipher/key handling
- Hybrid objects exposing native functionality to JavaScript

## Layers

**TypeScript API Layer:**
- Purpose: Provide Node.js-compatible crypto API and WebCrypto subtle interface
- Location: `packages/react-native-quick-crypto/src/`
- Contains: Public API functions, type definitions, JavaScript logic
- Depends on: Nitro Modules bridge, Buffer polyfill
- Used by: Application code consuming the library

**Nitro Specs Layer:**
- Purpose: Define TypeScript interfaces for native hybrid objects
- Location: `packages/react-native-quick-crypto/src/specs/`
- Contains: `.nitro.ts` files defining HybridObject interfaces
- Depends on: `react-native-nitro-modules`
- Used by: TypeScript API layer, Nitrogen code generator

**Generated Bridge Layer (Nitrogen):**
- Purpose: Auto-generated bindings between TypeScript and C++
- Location: `packages/react-native-quick-crypto/nitrogen/generated/`
- Contains: C++ specs (`HybridXxxSpec.hpp`), platform autolinking files
- Depends on: Nitro specs definitions
- Used by: C++ implementation layer

**C++ Implementation Layer:**
- Purpose: Native cryptographic operations using OpenSSL
- Location: `packages/react-native-quick-crypto/cpp/`
- Contains: `HybridXxx.cpp/.hpp` implementations
- Depends on: OpenSSL 3.6+, ncrypto, BLAKE3, fastpbkdf2
- Used by: Generated bridge layer

**Platform Integration Layer:**
- Purpose: iOS/Android build configuration and native module registration
- Location: `packages/react-native-quick-crypto/ios/`, `packages/react-native-quick-crypto/android/`
- Contains: Podspec, CMakeLists, Gradle config, autolinking
- Depends on: React Native, OpenSSL xcframework/prefab
- Used by: React Native build system

## Data Flow

**Synchronous Crypto Operation (e.g., hashSync):**

1. JavaScript calls `createHash('sha256')` in `src/hash.ts`
2. TypeScript creates HybridObject via `NitroModules.createHybridObject<Hash>('Hash')`
3. Nitro bridge invokes C++ `HybridHash::createHash()` synchronously
4. OpenSSL EVP functions perform cryptographic operation
5. Result returned as ArrayBuffer through bridge
6. TypeScript wraps result in Buffer and returns to caller

**Asynchronous Crypto Operation (e.g., randomFill):**

1. JavaScript calls `randomFill(buffer, callback)` in `src/random.ts`
2. TypeScript invokes native `random.randomFill()` returning Promise
3. C++ `HybridRandom::randomFill()` creates async Promise
4. Work dispatched to background thread via `Promise<T>::async()`
5. OpenSSL `RAND_bytes()` fills buffer
6. Promise resolved, callback invoked with result

**WebCrypto Operation (e.g., subtle.encrypt):**

1. JavaScript calls `subtle.encrypt(algorithm, key, data)` in `src/subtle.ts`
2. Algorithm normalized, key validated
3. Appropriate cipher instantiated via `CipherFactory.createCipher()`
4. C++ factory creates mode-specific cipher (GCM, CCM, OCB, etc.)
5. Data processed through `cipher.update()` and `cipher.final()`
6. Auth tag appended (for AEAD modes) and result returned

**State Management:**
- Native objects maintain state (EVP contexts, key data)
- HybridObjects are ref-counted shared_ptr instances
- JavaScript holds reference to HybridObject until garbage collected
- No global state - each operation creates fresh context

## Key Abstractions

**HybridObject:**
- Purpose: Bridge between JavaScript and C++ with automatic memory management
- Examples: `HybridCipher`, `HybridHash`, `HybridRandom`, `HybridKeyObjectHandle`
- Pattern: Inherits from generated `HybridXxxSpec`, implements pure virtual methods

**KeyObjectHandle:**
- Purpose: Unified key representation for all asymmetric/symmetric keys
- Examples: `packages/react-native-quick-crypto/cpp/keys/HybridKeyObjectHandle.cpp`
- Pattern: Wraps `KeyObjectData` containing OpenSSL EVP_PKEY or raw key bytes

**CipherFactory:**
- Purpose: Create appropriate cipher implementation based on algorithm mode
- Examples: `packages/react-native-quick-crypto/cpp/cipher/HybridCipherFactory.hpp`
- Pattern: Factory method returning polymorphic cipher instances (GCMCipher, CCMCipher, etc.)

**CryptoKey:**
- Purpose: WebCrypto-compatible key wrapper for subtle API
- Examples: `packages/react-native-quick-crypto/src/keys/classes.ts`
- Pattern: Wraps KeyObject with algorithm metadata and usage restrictions

## Entry Points

**Library Entry Point:**
- Location: `packages/react-native-quick-crypto/src/index.ts`
- Triggers: `import QuickCrypto from 'react-native-quick-crypto'`
- Responsibilities: Export all crypto APIs, provide `install()` for global patching

**Native Module Registration (iOS):**
- Location: `packages/react-native-quick-crypto/nitrogen/generated/ios/QuickCryptoAutolinking.swift`
- Triggers: App launch via React Native autolinking
- Responsibilities: Register all HybridObject factories with Nitro

**Native Module Registration (Android):**
- Location: `packages/react-native-quick-crypto/nitrogen/generated/android/QuickCryptoOnLoad.cpp`
- Triggers: JNI library load
- Responsibilities: Register HybridObject factories via `JNI_OnLoad`

**Nitro Autolinking Configuration:**
- Location: `packages/react-native-quick-crypto/nitro.json`
- Triggers: Build-time code generation via `nitro-codegen`
- Responsibilities: Map TypeScript interface names to C++ implementations

## Error Handling

**Strategy:** Exceptions in C++ converted to JavaScript errors at bridge boundary

**Patterns:**
- C++ throws `std::runtime_error` with descriptive message
- OpenSSL errors retrieved via `ERR_get_error()` and included in message
- TypeScript catches and may wrap in DOMException for WebCrypto compatibility
- `lazyDOMException()` creates WebCrypto-style errors with names like `OperationError`

## Cross-Cutting Concerns

**Logging:** Minimal - no structured logging framework

**Validation:**
- TypeScript validates input types and ranges before native call
- C++ validates buffer sizes and OpenSSL return codes
- `validateMaxBufferLength()` for WebCrypto size limits

**Authentication:**
- AEAD ciphers verify auth tags in constant time
- `CRYPTO_memcmp` used for timing-safe comparisons in verify operations

**Memory Management:**
- C++ uses `std::shared_ptr` for all HybridObjects
- OpenSSL contexts freed via RAII or explicit `EVP_*_free()` calls
- ArrayBuffer ownership transferred across bridge via move semantics

---

*Architecture analysis: 2025-01-18*
