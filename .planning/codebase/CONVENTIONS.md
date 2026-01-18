# Coding Conventions

**Analysis Date:** 2026-01-18

## Naming Patterns

**Files:**
- TypeScript: `camelCase.ts` for modules (e.g., `cipher.ts`, `hashnames.ts`)
- Nitro specs: `name.nitro.ts` (e.g., `cipher.nitro.ts`, `hash.nitro.ts`)
- C++ headers: `PascalCase.hpp` (e.g., `HybridCipher.hpp`, `Utils.hpp`)
- C++ sources: `PascalCase.cpp` (e.g., `HybridCipher.cpp`)
- Test files: `name_tests.ts` (e.g., `cipher_tests.ts`, `hash_tests.ts`)

**Functions:**
- TypeScript: `camelCase` (e.g., `createCipheriv`, `binaryLikeToArrayBuffer`)
- C++: `camelCase` for methods (e.g., `setArgs`, `checkCtx`)
- Factory functions: `create*` pattern (e.g., `createHash`, `createHmac`)
- Export functions: `get*` pattern (e.g., `getCiphers`, `getHashes`)

**Variables:**
- TypeScript: `camelCase` for variables, `UPPER_SNAKE_CASE` for constants
- C++: `snake_case` for members (e.g., `cipher_type`, `auth_tag_len`)

**Types:**
- TypeScript interfaces: `PascalCase` (e.g., `CipherArgs`, `HashOptions`)
- TypeScript type aliases: `PascalCase` (e.g., `BinaryLike`, `KeyUsage`)
- C++ classes: `PascalCase` with `Hybrid` prefix for Nitro (e.g., `HybridCipher`, `HybridHash`)
- C++ enums: `PascalCase` values (e.g., `kAuthTagKnown`, `kCipher`)

**Classes:**
- TypeScript: `PascalCase` (e.g., `CryptoKey`, `KeyObject`, `Subtle`)
- Exported as types when wrapping: `export type Cipher = Cipheriv`
- C++: `Hybrid*` prefix for Nitro modules (e.g., `HybridCipher`, `HybridBlake3`)

## Code Style

**Formatting:**
- Tool: Prettier 3.5.3
- Key settings in `.prettierrc.json`:
  - `singleQuote: true`
  - `trailingComma: 'all'`
  - `arrowParens: 'avoid'`
  - `bracketSameLine: true`
  - `bracketSpacing: true`

**C++ Formatting:**
- Tool: clang-format 16
- Style: LLVM-based
- Key settings in `.clang-format`:
  - `Standard: c++20`
  - `IndentWidth: 2`
  - `ColumnLimit: 140`
  - `PointerAlignment: Left`
  - `BreakBeforeBraces: Attach`

**Linting:**
- Tool: ESLint 9.24.0 with TypeScript ESLint
- Prettier integration via `eslint-plugin-prettier`
- Strict TypeScript rules enabled
- Pre-commit hooks via Husky + lint-staged

## Import Organization

**Order:**
1. External libraries (e.g., `react-native-nitro-modules`, `readable-stream`)
2. Node.js type imports (e.g., `import type {...} from 'crypto'`)
3. Internal specs/nitro bindings (e.g., `./specs/cipher.nitro`)
4. Internal utilities (e.g., `./utils`, `./utils/conversion`)

**Path Aliases:**
- No path aliases configured; use relative paths
- Keep imports from `./specs/*.nitro` for Nitro type imports

**Barrel Exports:**
- Use barrel files (`index.ts`) for module exports
- Main entry `src/index.ts` aggregates and re-exports all APIs

## Error Handling

**TypeScript Patterns:**
- Throw `Error` with descriptive messages
- Use `lazyDOMException()` for WebCrypto-style errors with DOM exception names
```typescript
throw lazyDOMException(
  `Unsupported AES algorithm: ${name}`,
  'NotSupportedError',
);
```

**Validation:**
- Validate inputs early with descriptive messages
- Use type guards for runtime checks
```typescript
if (!ArrayBuffer.isView(data)) {
  throw new Error('Invalid data argument');
}
```

**C++ Patterns:**
- Use `std::runtime_error` for exceptional conditions
- Get OpenSSL errors via `ERR_get_error()` and include in message
```cpp
unsigned long err = ERR_get_error();
char err_buf[256];
ERR_error_string_n(err, err_buf, sizeof(err_buf));
throw std::runtime_error("Cipher final failed: " + std::string(err_buf));
```

**Async Error Handling:**
- Callbacks follow Node.js convention: `(err, result) => void`
- WebCrypto methods return Promises that reject on error

## Logging

**Framework:** None (console for development only)

**Patterns:**
- No logging in library code
- Test output uses `console.log` with emoji indicators in example app
- Errors provide context without exposing sensitive data (no key material)

## Comments

**When to Comment:**
- Complex OpenSSL interactions requiring context
- Non-obvious security considerations
- TODOs for incomplete implementations

**JSDoc/TSDoc:**
- Use JSDoc for public API functions
- Include `@since v1.0.0` version tags
- Provide usage examples in comments
```typescript
/**
 * Creates and returns a `Hash` object...
 * @since v1.0.0
 * @param options `stream.transform` options
 */
export function createHash(algorithm: string, options?: HashOptions): Hash
```

**Inline Comments:**
- Minimize; code should be self-documenting
- Use for security-critical sections explaining why

## Function Design

**Size:** Functions should be focused; extract helpers for complex logic

**Parameters:**
- Use options objects for multiple optional parameters
- Use overloads for different return types based on encoding
```typescript
digest(): Buffer;
digest(encoding: Encoding): Buffer;
digest(encoding?: Encoding): Buffer | string;
```

**Return Values:**
- Explicit return types required
- Use `Buffer` for binary data
- Use `ArrayBuffer` for WebCrypto/native bridge
- Method chaining for fluent APIs (`return this`)

## Module Design

**Exports:**
- Named exports only; no default exports except main module
- Export types separately from implementations
- Re-export from barrel files

**Barrel Files:**
- `src/index.ts` exports full API
- `src/keys/index.ts` aggregates key-related exports

**Module Structure:**
- One primary class/function per file
- Utilities in `utils/` subdirectory
- Nitro specs in `specs/` subdirectory

## TypeScript Specifics

**Type Safety:**
- Avoid `any`; use `unknown` and narrow with type guards
- When `any` is unavoidable, use `eslint-disable` comment
```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const alg = normalizedAlgorithm as any;
```

**Interfaces vs Types:**
- Use `interface` for object shapes
- Use `type` for unions, intersections, and aliases
```typescript
export interface JWK {
  kty?: JWKkty;
  use?: JWKuse;
}

export type BinaryLike = string | Buffer | ArrayBuffer | TypedArray;
```

**Enums:**
- Use TypeScript enums for internal state (maps to numbers)
```typescript
export enum KFormatType {
  DER,
  PEM,
  JWK,
}
```

## C++ Specifics

**Memory Management:**
- Use `std::shared_ptr` for ArrayBuffer ownership
- Use `std::unique_ptr` for local allocations
- Lambdas for cleanup callbacks with `NativeArrayBuffer`
```cpp
auto native_final_chunk = std::make_shared<NativeArrayBuffer>(
  out_buf.release(),
  static_cast<size_t>(out_len),
  [raw_ptr]() { delete[] raw_ptr; }
);
```

**OpenSSL Patterns:**
- Use EVP APIs only (no deprecated low-level APIs)
- Free contexts in destructors (RAII)
- Check return values and throw on failure
```cpp
if (!EVP_CipherInit_ex(ctx, cipher, nullptr, nullptr, nullptr, is_cipher)) {
  // handle error
}
```

**Namespaces:**
- All code in `margelo::nitro::crypto` namespace
- Use `inline` namespace members for utilities

## Security Conventions

**Constant-Time Operations:**
- Use constant-time comparison for authentication
```typescript
let result = 0;
for (let i = 0; i < expected.length; i++) {
  result |= expected[i]! ^ signatureArray[i]!;
}
return result === 0;
```

**Key Material:**
- Never log or include in error messages
- Clear sensitive data when no longer needed
```cpp
std::memset(auth_tag, 0, EVP_GCM_TLS_TAG_LEN);
```

**Input Validation:**
- Validate buffer lengths before processing
- Check algorithm parameters against allowed values

---

*Convention analysis: 2026-01-18*
