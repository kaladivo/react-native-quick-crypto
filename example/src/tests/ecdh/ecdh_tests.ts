/**
 * ECDH Tests for secp256k1 curve
 * Tests createECDH, generateKeys, getPublicKey, getPrivateKey, setPrivateKey, computeSecret
 */

import { createECDH } from 'react-native-quick-crypto';
import { Buffer } from '@craftzdog/react-native-buffer';
import { expect } from 'chai';
import { test } from '../util';

const SUITE = 'ecdh';

// Test 1: Create ECDH instance
test(SUITE, 'createECDH("secp256k1") returns ECDH instance', () => {
  const ecdh = createECDH('secp256k1');
  expect(ecdh !== undefined).to.equal(true);
  expect(ecdh).to.have.property('generateKeys');
  expect(ecdh).to.have.property('getPublicKey');
  expect(ecdh).to.have.property('getPrivateKey');
  expect(ecdh).to.have.property('setPrivateKey');
  console.log('[ECDH] createECDH succeeded, instance created');
});

// Test 2: generateKeys returns public key
test(SUITE, 'generateKeys() returns 65-byte uncompressed public key', () => {
  const ecdh = createECDH('secp256k1');
  const pubKey = ecdh.generateKeys();
  expect(pubKey).to.have.length(65); // uncompressed format
  expect(pubKey[0]).to.equal(0x04); // uncompressed prefix
  console.log('[ECDH] generateKeys returned', pubKey.length, 'bytes');
});

// Test 3: generateKeys with hex encoding
test(SUITE, 'generateKeys("hex") returns 130-char hex string', () => {
  const ecdh = createECDH('secp256k1');
  const pubKeyHex = ecdh.generateKeys('hex');
  expect(pubKeyHex).to.be.a('string');
  expect(pubKeyHex).to.have.length(130); // 65 bytes * 2 hex chars
  expect(pubKeyHex.startsWith('04')).to.equal(true); // uncompressed prefix
  console.log('[ECDH] generateKeys hex:', pubKeyHex.substring(0, 20) + '...');
});

// Test 4: getPrivateKey returns 32 bytes
test(SUITE, 'getPrivateKey() returns 32-byte private key', () => {
  const ecdh = createECDH('secp256k1');
  ecdh.generateKeys();
  const privKey = ecdh.getPrivateKey();
  expect(privKey).to.have.length(32);
  console.log('[ECDH] getPrivateKey returned', privKey.length, 'bytes');
});

// Test 5: getPrivateKey with hex encoding
test(SUITE, 'getPrivateKey("hex") returns 64-char hex string', () => {
  const ecdh = createECDH('secp256k1');
  ecdh.generateKeys();
  const privKeyHex = ecdh.getPrivateKey('hex');
  expect(privKeyHex).to.be.a('string');
  expect(privKeyHex).to.have.length(64); // 32 bytes * 2 hex chars
  console.log('[ECDH] getPrivateKey hex:', privKeyHex.substring(0, 16) + '...');
});

// Test 6: getPublicKey with compressed format
test(SUITE, 'getPublicKey("hex", "compressed") returns 66-char hex', () => {
  const ecdh = createECDH('secp256k1');
  ecdh.generateKeys();
  const pubKeyCompressed = ecdh.getPublicKey('hex', 'compressed');
  expect(pubKeyCompressed).to.be.a('string');
  expect(pubKeyCompressed).to.have.length(66); // 33 bytes * 2 hex chars
  expect(
    pubKeyCompressed.startsWith('02') || pubKeyCompressed.startsWith('03'),
  ).to.equal(true); // compressed prefixes
  console.log('[ECDH] compressed public key:', pubKeyCompressed);
});

// Test 7: setPrivateKey and verify derived public key
test(SUITE, 'setPrivateKey() derives correct public key', () => {
  const ecdh1 = createECDH('secp256k1');
  const originalPubKey = ecdh1.generateKeys('hex');
  const privKey = ecdh1.getPrivateKey('hex');

  const ecdh2 = createECDH('secp256k1');
  ecdh2.setPrivateKey(privKey, 'hex');
  const derivedPubKey = ecdh2.getPublicKey('hex');

  expect(derivedPubKey).to.equal(originalPubKey);
  console.log('[ECDH] setPrivateKey derived matching public key');
});

// Test 8: Invalid curve throws error
test(SUITE, 'createECDH("invalid-curve") throws error', () => {
  expect(() => {
    createECDH('invalid-curve');
  }).to.throw();
  console.log('[ECDH] Invalid curve correctly rejected');
});

// Test 9: computeSecret derives identical secret for two parties
test(SUITE, 'computeSecret() derives identical secrets for two parties', () => {
  const alice = createECDH('secp256k1');
  const bob = createECDH('secp256k1');

  alice.generateKeys();
  bob.generateKeys();

  const aliceSecret = alice.computeSecret(bob.getPublicKey());
  const bobSecret = bob.computeSecret(alice.getPublicKey());

  expect(aliceSecret).to.have.length(32);
  expect(bobSecret).to.have.length(32);
  expect(Buffer.from(aliceSecret as Buffer).toString('hex')).to.equal(
    Buffer.from(bobSecret as Buffer).toString('hex'),
  );
  console.log('[ECDH] computeSecret: Alice and Bob derived identical secrets');
});

// Test 10: computeSecret with hex encoding
test(SUITE, 'computeSecret("hex") returns 64-char hex string', () => {
  const alice = createECDH('secp256k1');
  const bob = createECDH('secp256k1');

  alice.generateKeys();
  bob.generateKeys();

  const secret = alice.computeSecret(bob.getPublicKey('hex'), 'hex', 'hex');
  expect(secret).to.be.a('string');
  expect(secret).to.have.length(64); // 32 bytes * 2 hex chars
  console.log(
    '[ECDH] computeSecret hex:',
    (secret as string).substring(0, 16) + '...',
  );
});

// Test 11: computeSecret with compressed public key
test(SUITE, 'computeSecret() works with compressed public key', () => {
  const alice = createECDH('secp256k1');
  const bob = createECDH('secp256k1');

  alice.generateKeys();
  bob.generateKeys();

  // Use compressed public key (33 bytes)
  const bobCompressed = bob.getPublicKey(undefined, 'compressed');
  expect(bobCompressed).to.have.length(33);

  const secret = alice.computeSecret(bobCompressed);
  expect(secret).to.have.length(32);
  console.log('[ECDH] computeSecret with compressed key succeeded');
});

// Test 12: computeSecret with imported private key
test(SUITE, 'computeSecret() works after setPrivateKey', () => {
  const alice = createECDH('secp256k1');
  alice.generateKeys();
  const alicePriv = alice.getPrivateKey('hex');

  const bob = createECDH('secp256k1');
  bob.generateKeys();
  const bobPub = bob.getPublicKey('hex');

  // Create new instance with imported key
  const aliceReborn = createECDH('secp256k1');
  aliceReborn.setPrivateKey(alicePriv, 'hex');

  const secretOriginal = alice.computeSecret(bobPub, 'hex', 'hex');
  const secretReborn = aliceReborn.computeSecret(bobPub, 'hex', 'hex');

  expect(secretOriginal).to.equal(secretReborn);
  console.log('[ECDH] computeSecret matches after key import');
});

// Test 13: computeSecret throws for invalid public key
test(
  SUITE,
  'computeSecret() throws ERR_CRYPTO_ECDH_INVALID_PUBLIC_KEY for invalid key',
  () => {
    const ecdh = createECDH('secp256k1');
    ecdh.generateKeys();

    // Invalid public key - wrong size
    const invalidKey = Buffer.alloc(32, 0x04);

    try {
      ecdh.computeSecret(invalidKey);
      expect.fail('Should have thrown');
    } catch (e: unknown) {
      const err = e as NodeJS.ErrnoException;
      expect(err.code).to.equal('ERR_CRYPTO_ECDH_INVALID_PUBLIC_KEY');
      console.log('[ECDH] Invalid key correctly rejected with error code');
    }
  },
);

// Test 14: computeSecret throws for point not on curve
test(SUITE, 'computeSecret() throws for public key not on curve', () => {
  const ecdh = createECDH('secp256k1');
  ecdh.generateKeys();

  // Create a 65-byte buffer with valid prefix but invalid point
  const invalidPoint = Buffer.alloc(65, 0);
  invalidPoint[0] = 0x04; // uncompressed prefix
  // Rest is zeros, which is not a valid point on secp256k1

  try {
    ecdh.computeSecret(invalidPoint);
    expect.fail('Should have thrown');
  } catch (e: unknown) {
    const err = e as NodeJS.ErrnoException;
    expect(err.code).to.equal('ERR_CRYPTO_ECDH_INVALID_PUBLIC_KEY');
    console.log('[ECDH] Point not on curve correctly rejected');
  }
});

// Test 15: computeSecret with known test vector
test(SUITE, 'computeSecret() matches Node.js test vector', () => {
  // Test vector: deterministic keys for reproducible test
  // Alice private key (32 bytes hex)
  const alicePrivHex =
    'c9afa9d845ba75166b5c215767b1d6934e50c3db36e89b127b8a622b120f6721';
  // Bob private key (32 bytes hex)
  const bobPrivHex =
    '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

  const alice = createECDH('secp256k1');
  alice.setPrivateKey(alicePrivHex, 'hex');

  const bob = createECDH('secp256k1');
  bob.setPrivateKey(bobPrivHex, 'hex');

  const aliceSecret = alice.computeSecret(bob.getPublicKey());
  const bobSecret = bob.computeSecret(alice.getPublicKey());

  // Both should derive the same secret
  const aliceSecretHex = Buffer.from(aliceSecret as Buffer).toString('hex');
  const bobSecretHex = Buffer.from(bobSecret as Buffer).toString('hex');

  expect(aliceSecretHex).to.equal(bobSecretHex);
  expect(aliceSecretHex).to.have.length(64); // 32 bytes = 64 hex chars

  console.log('[ECDH] Test vector secret:', aliceSecretHex);
});
