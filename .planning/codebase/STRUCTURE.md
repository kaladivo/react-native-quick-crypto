# Codebase Structure

**Analysis Date:** 2025-01-18

## Directory Layout

```
react-native-quick-crypto/
├── packages/
│   └── react-native-quick-crypto/     # Main library package
│       ├── src/                        # TypeScript API layer
│       │   ├── specs/                  # Nitro interface definitions
│       │   ├── keys/                   # Key management classes
│       │   ├── utils/                  # Shared utilities
│       │   └── expo-plugin/            # Expo config plugin
│       ├── cpp/                        # C++ implementations
│       │   ├── blake3/                 # BLAKE3 hash
│       │   ├── cipher/                 # Symmetric ciphers
│       │   ├── ec/                     # Elliptic curve keys
│       │   ├── ed25519/                # Ed25519/X25519 keys
│       │   ├── hash/                   # Hash functions
│       │   ├── hkdf/                   # HKDF derivation
│       │   ├── hmac/                   # HMAC
│       │   ├── keys/                   # Key object handling
│       │   ├── mldsa/                  # ML-DSA (post-quantum)
│       │   ├── pbkdf2/                 # PBKDF2 derivation
│       │   ├── random/                 # Random number generation
│       │   ├── rsa/                    # RSA keys and cipher
│       │   ├── scrypt/                 # scrypt derivation
│       │   ├── sign/                   # Sign/Verify operations
│       │   └── utils/                  # C++ utilities
│       ├── nitrogen/
│       │   └── generated/              # Auto-generated bridge code
│       │       ├── shared/c++/         # Shared C++ specs
│       │       ├── ios/                # iOS autolinking
│       │       └── android/            # Android autolinking
│       ├── deps/                       # Native dependencies
│       │   ├── ncrypto/                # Node.js ncrypto submodule
│       │   ├── blake3/                 # BLAKE3 C implementation
│       │   └── fastpbkdf2/             # Optimized PBKDF2
│       ├── android/                    # Android build config
│       │   ├── CMakeLists.txt          # CMake build
│       │   └── src/main/cpp/           # JNI adapter
│       ├── ios/                        # iOS build config
│       └── lib/                        # Built output (generated)
├── example/                            # Example/test app
│   ├── src/
│   │   ├── tests/                      # Test suites by feature
│   │   ├── benchmarks/                 # Performance benchmarks
│   │   ├── navigators/                 # Navigation setup
│   │   └── components/                 # UI components
│   ├── ios/                            # iOS app project
│   └── android/                        # Android app project
├── docs/                               # Documentation site (Fumadocs)
├── scripts/                            # Build/release scripts
└── .claude/                            # Claude Code configuration
    ├── agents/                         # Specialist agent definitions
    └── rules/                          # Architectural rules
```

## Directory Purposes

**`packages/react-native-quick-crypto/src/`:**
- Purpose: TypeScript API providing Node.js crypto compatibility
- Contains: Public API files, type definitions, WebCrypto subtle implementation
- Key files: `index.ts` (entry), `subtle.ts` (WebCrypto), `cipher.ts`, `hash.ts`, `random.ts`

**`packages/react-native-quick-crypto/src/specs/`:**
- Purpose: Nitro HybridObject interface definitions for code generation
- Contains: `*.nitro.ts` files defining native API contracts
- Key files: `cipher.nitro.ts`, `hash.nitro.ts`, `keyObjectHandle.nitro.ts`

**`packages/react-native-quick-crypto/src/keys/`:**
- Purpose: Key management classes and utilities
- Contains: KeyObject hierarchy, CryptoKey, sign/verify, key generation
- Key files: `classes.ts`, `index.ts`, `generateKeyPair.ts`, `signVerify.ts`

**`packages/react-native-quick-crypto/cpp/`:**
- Purpose: Native C++ implementations using OpenSSL
- Contains: HybridObject implementations organized by crypto primitive
- Key files: `cipher/HybridCipher.cpp`, `keys/HybridKeyObjectHandle.cpp`

**`packages/react-native-quick-crypto/nitrogen/generated/`:**
- Purpose: Auto-generated Nitro bridge code (DO NOT EDIT)
- Contains: C++ specs, autolinking files for iOS/Android
- Key files: `shared/c++/HybridCipherSpec.hpp`, `ios/QuickCryptoAutolinking.swift`

**`packages/react-native-quick-crypto/deps/`:**
- Purpose: Native C/C++ dependencies as submodules
- Contains: ncrypto (from Node.js), BLAKE3, fastpbkdf2
- Key files: `ncrypto/src/ncrypto.cpp`, `blake3/c/blake3.c`

**`example/src/tests/`:**
- Purpose: Test suites executed in React Native app
- Contains: Test files organized by crypto feature
- Key files: `cipher/*.ts`, `subtle/*.ts`, `keys/*.ts`

## Key File Locations

**Entry Points:**
- `packages/react-native-quick-crypto/src/index.ts`: Library entry, exports all APIs
- `packages/react-native-quick-crypto/nitro.json`: Nitro HybridObject mapping

**Configuration:**
- `packages/react-native-quick-crypto/package.json`: Package config, react-native-builder-bob
- `packages/react-native-quick-crypto/QuickCrypto.podspec`: iOS CocoaPods spec
- `packages/react-native-quick-crypto/android/CMakeLists.txt`: Android CMake build
- `packages/react-native-quick-crypto/android/build.gradle`: Android Gradle config

**Core Logic:**
- `packages/react-native-quick-crypto/src/subtle.ts`: WebCrypto Subtle class (~2100 lines)
- `packages/react-native-quick-crypto/src/cipher.ts`: Symmetric cipher API
- `packages/react-native-quick-crypto/src/keys/classes.ts`: KeyObject/CryptoKey classes
- `packages/react-native-quick-crypto/cpp/cipher/HybridCipherFactory.hpp`: Cipher factory
- `packages/react-native-quick-crypto/cpp/keys/HybridKeyObjectHandle.cpp`: Key handle impl

**Testing:**
- `example/src/tests/`: All test suites (run in RN app, not Jest)
- `packages/react-native-quick-crypto/test/`: Unit tests (hashnames only)

## Naming Conventions

**Files:**
- TypeScript API: `lowercase.ts` (e.g., `cipher.ts`, `random.ts`)
- Nitro specs: `lowercase.nitro.ts` (e.g., `cipher.nitro.ts`)
- C++ implementations: `HybridPascalCase.cpp/.hpp` (e.g., `HybridCipher.cpp`)
- C++ cipher variants: `PascalCaseCipher.cpp` (e.g., `GCMCipher.cpp`)

**Directories:**
- TypeScript: `lowercase/` (e.g., `keys/`, `utils/`, `specs/`)
- C++: `lowercase/` matching feature (e.g., `cipher/`, `hash/`, `random/`)

**Classes/Types:**
- TypeScript classes: `PascalCase` (e.g., `CryptoKey`, `KeyObject`)
- C++ hybrid classes: `HybridPascalCase` (e.g., `HybridCipher`, `HybridHash`)
- Nitro specs: `HybridPascalCaseSpec` (generated)

## Where to Add New Code

**New Crypto Primitive:**
1. Create Nitro spec: `packages/react-native-quick-crypto/src/specs/{feature}.nitro.ts`
2. Run `bun specs` to generate C++ specs in `nitrogen/generated/`
3. Add C++ implementation: `packages/react-native-quick-crypto/cpp/{feature}/Hybrid{Feature}.cpp`
4. Update `nitro.json` autolinking map
5. Create TypeScript API: `packages/react-native-quick-crypto/src/{feature}.ts`
6. Export from `packages/react-native-quick-crypto/src/index.ts`
7. Add tests: `example/src/tests/{feature}/`

**New Cipher Mode:**
1. Create C++ class: `packages/react-native-quick-crypto/cpp/cipher/{Mode}Cipher.cpp`
2. Inherit from `HybridCipher`, override `init()` and mode-specific behavior
3. Add case to `HybridCipherFactory.hpp` switch statement
4. Add to `android/CMakeLists.txt` source list
5. iOS: Included automatically via `cpp/**/*.cpp` glob

**New Key Type:**
1. Extend `HybridKeyObjectHandle` if new init/export logic needed
2. Add TypeScript class in `packages/react-native-quick-crypto/src/keys/classes.ts`
3. Update `generateKeyPair.ts` if generating keys natively

**Utilities:**
- TypeScript helpers: `packages/react-native-quick-crypto/src/utils/`
- C++ helpers: `packages/react-native-quick-crypto/cpp/utils/`

## Special Directories

**`nitrogen/generated/`:**
- Purpose: Auto-generated Nitro bridge code
- Generated: Yes (via `nitro-codegen`)
- Committed: Yes (checked in for build reproducibility)
- DO NOT EDIT manually - regenerate with `bun specs`

**`lib/`:**
- Purpose: Compiled TypeScript output
- Generated: Yes (via `react-native-builder-bob`)
- Committed: Yes (published to npm)

**`deps/ncrypto/`:**
- Purpose: Node.js ncrypto library (git submodule)
- Generated: No
- Committed: Yes (submodule reference)
- Update via: `git submodule update --remote deps/ncrypto`

**`OpenSSL.xcframework/`:**
- Purpose: Vendored OpenSSL for iOS
- Generated: Yes (downloaded in podspec prepare_command)
- Committed: No (gitignored, fetched at pod install)

---

*Structure analysis: 2025-01-18*
