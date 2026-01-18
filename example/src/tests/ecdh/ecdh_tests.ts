/**
 * ECDH Tests for secp256k1 curve
 * Tests createECDH, generateKeys, getPublicKey, getPrivateKey, setPrivateKey
 */

import { createECDH } from 'react-native-quick-crypto';
import { expect } from 'chai';
import { test } from '../util';

const SUITE = 'ecdh';

// Test 1: Create ECDH instance
test(SUITE, 'createECDH("secp256k1") returns ECDH instance', () => {
  const ecdh = createECDH('secp256k1');
  expect(ecdh).to.not.be.undefined;
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
  expect(pubKeyHex.startsWith('04')).to.be.true; // uncompressed prefix
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
    pubKeyCompressed.startsWith('02') || pubKeyCompressed.startsWith('03')
  ).to.be.true; // compressed prefixes
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
