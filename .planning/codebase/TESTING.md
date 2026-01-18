# Testing Patterns

**Analysis Date:** 2026-01-18

## Test Framework

**Runner:**
- Jest 29.7.0 (configured but limited use)
- Primary testing: Custom in-app test runner in React Native example app
- Config: `packages/react-native-quick-crypto/package.json` (jest via devDependencies)

**Assertion Library:**
- Chai (expect style) for example app tests
- Jest assertions for unit tests

**Run Commands:**
```bash
# Unit tests (limited)
cd packages/react-native-quick-crypto && bun test

# Primary tests run in React Native example app
cd example && bun start
# Then run tests via app UI
```

**Important:** Tests primarily run in the React Native example app environment, not via standard test runners. This is because the crypto operations require the native C++ module to be loaded.

## Test File Organization

**Location:**
- Unit tests: `packages/react-native-quick-crypto/test/*.test.ts` (minimal)
- Integration tests: `example/src/tests/**/*_tests.ts` (primary test suite)
- Fixtures: `example/src/fixtures/*.ts` and `example/src/tests/*/fixtures.ts`

**Naming:**
- Test files: `*_tests.ts` (e.g., `cipher_tests.ts`, `hash_tests.ts`)
- Fixture files: `*.ts` or `fixtures.ts` per module
- Helper files: descriptive names (e.g., `roundTrip.ts`, `util.ts`)

**Structure:**
```
example/src/tests/
├── util.ts                    # Test utilities and registration
├── cipher/
│   ├── cipher_tests.ts        # Cipher test cases
│   ├── chacha_tests.ts        # ChaCha20 specific tests
│   ├── roundTrip.ts           # Encrypt/decrypt helpers
│   └── xsalsa20_tests.ts      # XSalsa20 tests
├── hash/
│   └── hash_tests.ts          # Hash algorithm tests
├── keys/
│   ├── create_keys.ts         # Key creation tests
│   ├── generate_keypair.ts    # Key pair generation tests
│   └── fixtures.ts            # Key test fixtures
├── pbkdf2/
│   ├── pbkdf2_tests.ts        # PBKDF2 tests
│   └── fixtures.ts            # PBKDF2 test vectors
├── subtle/
│   ├── encrypt_decrypt.ts     # WebCrypto encrypt/decrypt
│   ├── sign_verify.ts         # WebCrypto sign/verify
│   └── ...                    # Other subtle.* tests
└── ...
```

## Test Structure

**Suite Organization:**
```typescript
// example/src/tests/cipher/cipher_tests.ts
import { test } from '../util';
import { expect } from 'chai';
import { createCipheriv, getCiphers } from 'react-native-quick-crypto';

const SUITE = 'cipher';

test(SUITE, 'valid algorithm', () => {
  expect(() => {
    createCipheriv('aes-128-cbc', Buffer.alloc(16), Buffer.alloc(16), {});
  }).to.not.throw();
});

test(SUITE, 'invalid algorithm', () => {
  expect(() => {
    createCipheriv('aes-128-invalid', Buffer.alloc(16), Buffer.alloc(16), {});
  }).to.throw('Unsupported or unknown cipher type');
});
```

**Patterns:**
- Suite name as first parameter to `test()`
- Descriptive test names
- Chai `expect` for assertions
- One logical assertion per test when possible

**Custom Test Registration:**
```typescript
// example/src/tests/util.ts
import type { TestSuites } from '../types/tests';

export const TestsContext: TestSuites = {};

export const test = (
  suiteName: string,
  testName: string,
  fn: () => void | Promise<void>,
): void => {
  if (!TestsContext[suiteName]) {
    TestsContext[suiteName] = { value: false, tests: {} };
  }
  TestsContext[suiteName].tests[testName] = fn;
};
```

## Mocking

**Framework:** None (tests use real native implementations)

**Patterns:**
- No mocking of native modules - tests exercise actual C++/OpenSSL code
- Tests run against real cryptographic operations

**What to Mock:**
- Nothing by design - crypto library tests require actual implementations

**What NOT to Mock:**
- Native crypto operations
- OpenSSL functions
- Buffer/ArrayBuffer conversions

## Fixtures and Factories

**Test Data:**
```typescript
// example/src/fixtures/aes_gcm.ts
import { decodeHex } from '../tests/util';

const kPlaintext = decodeHex(
  '546869732073706563696669636174696f6e...'
);

const kKeyBytes: VectorValue = {
  '128': decodeHex('dec0d4fcbf3c4741c892dabd1cd4c04e'),
  '256': decodeHex('67693823fb1d58073f91ece9cc3af910...'),
};

export default { passing, failing, decryptionFailing: [] };
```

**Helper Functions:**
```typescript
// example/src/tests/util.ts
export const decodeHex = (str: string): Uint8Array => {
  const uint8array = new Uint8Array(Math.ceil(str.length / 2));
  for (let i = 0; i < str.length; ) {
    uint8array[i / 2] = Number.parseInt(str.slice(i, (i += 2)), 16);
  }
  return uint8array;
};

export const assertThrowsAsync = async (
  fn: () => Promise<unknown>,
  expectedMessage: string,
) => {
  try {
    await fn();
  } catch (error) {
    const err = error as Error;
    if (expectedMessage) {
      assert.include(err.message, expectedMessage);
    }
    return;
  }
  assert.fail('function did not throw as expected');
};
```

**Location:**
- `example/src/fixtures/` - Shared test vectors (AES, RSA fixtures)
- `example/src/tests/*/fixtures.ts` - Module-specific fixtures

## Coverage

**Requirements:** Not enforced

**View Coverage:**
```bash
# Not configured - tests run in RN app
```

**Note:** Coverage tooling not applicable due to React Native runtime requirement.

## Test Types

**Unit Tests:**
- Location: `packages/react-native-quick-crypto/test/`
- Scope: Pure TypeScript utilities (minimal)
- Example: `hashnames.test.ts` tests hash name normalization
```typescript
// test/hashnames.test.ts
test('normalizeHashName happy', () => {
  expect(normalizeHashName('SHA-1')).toBe('sha1');
  expect(normalizeHashName('SHA-256')).toBe('sha256');
});
```

**Integration Tests:**
- Location: `example/src/tests/`
- Scope: Full crypto operations through JS -> Native -> OpenSSL
- Primary test suite for the library

**E2E Tests:**
- Framework: React Native example app
- Tests exercise complete user flows through app UI

## Common Patterns

**Async Testing:**
```typescript
test(SUITE, 'RSA-OAEP', async () => {
  const keyPair = await subtle.generateKey(
    { name: 'RSA-OAEP', modulusLength: 4096, ... },
    false,
    ['encrypt', 'decrypt'],
  );

  const ciphertext = await subtle.encrypt(
    { name: 'RSA-OAEP', label: ec.encode('a label') },
    keyPair.publicKey,
    buf,
  );

  const plaintext = await subtle.decrypt(...);

  expect(Buffer.from(plaintext).toString('hex')).to.equal(
    Buffer.from(buf).toString('hex'),
  );
});
```

**Error Testing:**
```typescript
test(SUITE, 'invalid algorithm', () => {
  expect(() => {
    createCipheriv('aes-128-invalid', Buffer.alloc(16), Buffer.alloc(16), {});
  }).to.throw('Unsupported or unknown cipher type');
});

// Async error testing
test(SUITE, 'RSA-OAEP encryption long plaintext', async () => {
  await assertThrowsAsync(
    async () => await subtle.encrypt(algorithm, publicKey, newplaintext),
    'data too large for key size',
  );
});
```

**Round-Trip Testing:**
```typescript
// example/src/tests/cipher/roundTrip.ts
export function roundTrip(
  cipherName: string,
  key: Buffer | string,
  iv: Buffer | string,
  plaintext: Buffer,
) {
  // Encrypt
  const cipher = createCipheriv(cipherName, key, iv);
  const encryptedPart1 = cipher.update(plaintext);
  const encryptedPart2 = cipher.final();
  const encrypted = Buffer.concat([encryptedPart1, encryptedPart2]);

  // Decrypt
  const decipher = createDecipheriv(cipherName, key, iv);
  const decryptedPart1 = decipher.update(encrypted);
  const decryptedPart2 = decipher.final();
  const decrypted = Buffer.concat([decryptedPart1, decryptedPart2]);

  // Verify
  expect(decrypted).eql(plaintext);
}
```

**Authenticated Encryption Testing:**
```typescript
export function roundTripAuth(
  cipherName: string,
  key: Buffer,
  iv: Buffer,
  plaintext: Buffer,
  aad?: Buffer,
  tagLength?: number,
) {
  const isCCM = cipherName.includes('CCM');

  // Encrypt with AAD
  const cipher = createCipheriv(cipherName, key, iv, { authTagLength: tagLength });
  if (aad) {
    const options = isCCM ? { plaintextLength: plaintext.length } : undefined;
    cipher.setAAD(aad, options);
  }
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Decrypt with tag verification
  const decipher = createDecipheriv(cipherName, key, iv, { authTagLength: tagLength });
  if (aad) {
    decipher.setAAD(aad, options);
  }
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

  expect(decrypted).eql(plaintext);
}
```

**Iterating Test Vectors:**
```typescript
// Test all supported ciphers
const allCiphers = getCiphers().filter(c => !TLS_ONLY_CIPHERS.includes(c));
allCiphers.forEach(cipherName => {
  test(SUITE, cipherName, () => {
    // Determine key/IV sizes from cipher name
    let keyLen = cipherName.includes('128') ? 16 :
                 cipherName.includes('192') ? 24 : 32;

    const testKey = randomFillSync(new Uint8Array(keyLen));
    const testIv = cipherName.includes('GCM') ? iv12 : iv16;

    if (cipherName.includes('GCM') || cipherName.includes('CCM')) {
      roundTripAuth(cipherName, Buffer.from(testKey), Buffer.from(testIv), plaintextBuffer, aad);
    } else {
      roundTrip(cipherName, Buffer.from(testKey), Buffer.from(testIv), plaintextBuffer);
    }
  });
});
```

**Test Vector Fixtures:**
```typescript
// Fixtures from Node.js test suite or standards (RFC, NIST)
const passing: AesEncryptDecryptTestVector[] = [];
kKeyLengths.forEach(keyLength => {
  kTagLengths.forEach(tagLength => {
    passing.push({
      keyBuffer: kKeyBytes[keyLength],
      algorithm: { name: 'AES-GCM', iv, additionalData, tagLength },
      plaintext: kPlaintext,
      result,
      keyLength,
    });
  });
});

export default { passing, failing, decryptionFailing: [] };
```

## Test Runner (Example App)

**Hook-based Runner:**
```typescript
// example/src/hooks/useTestsRun.ts
const run = async (addTestResult, suites) => {
  const stats = { ...defaultStats };
  stats.start = new Date();

  const allTests = Object.entries(suites).flatMap(([suiteName, suite]) => {
    if (!suite.value) return []; // Skip disabled suites
    stats.suites++;
    return Object.entries(suite.tests).map(async ([testName, test]) => {
      const testStart = performance.now();
      try {
        await test();
        stats.passes++;
        addTestResult({ type: 'correct', description: testName, suiteName, ... });
        console.log(`Test "${suiteName} - ${testName}" passed`);
      } catch (e) {
        stats.failures++;
        addTestResult({ type: 'incorrect', errorMsg: e.message, ... });
        console.log(`Test "${suiteName} - ${testName}" failed: ${e.message}`);
      }
      stats.tests++;
    });
  });

  await Promise.all(allTests);
  return stats;
};
```

---

*Testing analysis: 2026-01-18*
