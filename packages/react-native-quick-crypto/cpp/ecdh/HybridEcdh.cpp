#include "HybridEcdh.hpp"

#include <NitroModules/ArrayBuffer.hpp>
#include <openssl/obj_mac.h>

namespace margelo::nitro::crypto {

void HybridEcdh::setCurve(const std::string& curveParam) {
  if (curveParam != "secp256k1") {
    throw std::runtime_error("Unsupported curve: " + curveParam + ". Only secp256k1 is supported.");
  }
  this->curve = curveParam;
}

void HybridEcdh::generateKeys() {
  clearOpenSSLErrors();

  if (this->pkey != nullptr) {
    EVP_PKEY_free(this->pkey);
    this->pkey = nullptr;
  }

  EC_KEY* ec = EC_KEY_new_by_curve_name(NID_secp256k1);
  if (!ec) {
    throw std::runtime_error("Failed to create EC_KEY: " + getOpenSSLError());
  }

  if (EC_KEY_generate_key(ec) != 1) {
    EC_KEY_free(ec);
    throw std::runtime_error("Failed to generate EC key: " + getOpenSSLError());
  }

  this->pkey = EVP_PKEY_new();
  if (!this->pkey) {
    EC_KEY_free(ec);
    throw std::runtime_error("Failed to create EVP_PKEY: " + getOpenSSLError());
  }

  if (EVP_PKEY_set1_EC_KEY(this->pkey, ec) != 1) {
    EVP_PKEY_free(this->pkey);
    this->pkey = nullptr;
    EC_KEY_free(ec);
    throw std::runtime_error("Failed to set EC_KEY on EVP_PKEY: " + getOpenSSLError());
  }

  EC_KEY_free(ec);
}

std::shared_ptr<ArrayBuffer> HybridEcdh::getPublicKeyRaw(double format) {
  if (!this->pkey) {
    throw std::runtime_error("No key pair generated");
  }

  const EC_KEY* ec = EVP_PKEY_get0_EC_KEY(this->pkey);
  if (!ec) {
    throw std::runtime_error("Failed to get EC_KEY: " + getOpenSSLError());
  }

  const EC_GROUP* group = EC_KEY_get0_group(ec);
  const EC_POINT* pubPoint = EC_KEY_get0_public_key(ec);

  if (!pubPoint) {
    throw std::runtime_error("No public key available");
  }

  point_conversion_form_t convForm =
      (static_cast<int>(format) == 0) ? POINT_CONVERSION_COMPRESSED : POINT_CONVERSION_UNCOMPRESSED;

  size_t len = EC_POINT_point2oct(group, pubPoint, convForm, nullptr, 0, nullptr);
  if (len == 0) {
    throw std::runtime_error("Failed to get public key size: " + getOpenSSLError());
  }

  auto* buf = new uint8_t[len];
  if (EC_POINT_point2oct(group, pubPoint, convForm, buf, len, nullptr) != len) {
    delete[] buf;
    throw std::runtime_error("Failed to export public key: " + getOpenSSLError());
  }

  return std::make_shared<NativeArrayBuffer>(buf, len, [=]() { delete[] buf; });
}

std::shared_ptr<ArrayBuffer> HybridEcdh::getPrivateKeyRaw() {
  if (!this->pkey) {
    throw std::runtime_error("No key pair generated");
  }

  const EC_KEY* ec = EVP_PKEY_get0_EC_KEY(this->pkey);
  if (!ec) {
    throw std::runtime_error("Failed to get EC_KEY: " + getOpenSSLError());
  }

  const BIGNUM* privBn = EC_KEY_get0_private_key(ec);
  if (!privBn) {
    throw std::runtime_error("No private key available");
  }

  auto* buf = new uint8_t[32];
  if (BN_bn2binpad(privBn, buf, 32) != 32) {
    delete[] buf;
    throw std::runtime_error("Failed to export private key: " + getOpenSSLError());
  }

  return std::make_shared<NativeArrayBuffer>(buf, 32, [=]() { delete[] buf; });
}

void HybridEcdh::setPrivateKeyRaw(const std::shared_ptr<ArrayBuffer>& privateKey) {
  if (privateKey->size() != 32) {
    throw std::runtime_error("Invalid private key size");
  }

  clearOpenSSLErrors();

  if (this->pkey != nullptr) {
    EVP_PKEY_free(this->pkey);
    this->pkey = nullptr;
  }

  EC_KEY* ec = EC_KEY_new_by_curve_name(NID_secp256k1);
  if (!ec) {
    throw std::runtime_error("Failed to create EC_KEY: " + getOpenSSLError());
  }

  BIGNUM* privBn = BN_bin2bn(static_cast<const unsigned char*>(privateKey->data()),
                             static_cast<int>(privateKey->size()), nullptr);
  if (!privBn) {
    EC_KEY_free(ec);
    throw std::runtime_error("Failed to create BIGNUM from private key: " + getOpenSSLError());
  }

  const EC_GROUP* group = EC_KEY_get0_group(ec);
  BIGNUM* order = BN_new();
  if (!order) {
    BN_free(privBn);
    EC_KEY_free(ec);
    throw std::runtime_error("Failed to allocate BIGNUM for order");
  }

  if (EC_GROUP_get_order(group, order, nullptr) != 1) {
    BN_free(order);
    BN_free(privBn);
    EC_KEY_free(ec);
    throw std::runtime_error("Failed to get curve order: " + getOpenSSLError());
  }

  if (BN_is_zero(privBn) || BN_cmp(privBn, order) >= 0) {
    BN_free(order);
    BN_free(privBn);
    EC_KEY_free(ec);
    throw std::runtime_error("Private key out of range");
  }
  BN_free(order);

  if (EC_KEY_set_private_key(ec, privBn) != 1) {
    BN_free(privBn);
    EC_KEY_free(ec);
    throw std::runtime_error("Failed to set private key: " + getOpenSSLError());
  }

  EC_POINT* pubPoint = EC_POINT_new(group);
  if (!pubPoint) {
    BN_free(privBn);
    EC_KEY_free(ec);
    throw std::runtime_error("Failed to create EC_POINT: " + getOpenSSLError());
  }

  if (EC_POINT_mul(group, pubPoint, privBn, nullptr, nullptr, nullptr) != 1) {
    EC_POINT_free(pubPoint);
    BN_free(privBn);
    EC_KEY_free(ec);
    throw std::runtime_error("Failed to compute public key: " + getOpenSSLError());
  }

  if (EC_KEY_set_public_key(ec, pubPoint) != 1) {
    EC_POINT_free(pubPoint);
    BN_free(privBn);
    EC_KEY_free(ec);
    throw std::runtime_error("Failed to set public key: " + getOpenSSLError());
  }

  EC_POINT_free(pubPoint);
  BN_free(privBn);

  this->pkey = EVP_PKEY_new();
  if (!this->pkey) {
    EC_KEY_free(ec);
    throw std::runtime_error("Failed to create EVP_PKEY: " + getOpenSSLError());
  }

  if (EVP_PKEY_set1_EC_KEY(this->pkey, ec) != 1) {
    EVP_PKEY_free(this->pkey);
    this->pkey = nullptr;
    EC_KEY_free(ec);
    throw std::runtime_error("Failed to set EC_KEY on EVP_PKEY: " + getOpenSSLError());
  }

  EC_KEY_free(ec);
}

std::shared_ptr<ArrayBuffer> HybridEcdh::computeSecretRaw(
    const std::shared_ptr<ArrayBuffer>& otherPublicKey) {
  if (!this->pkey) {
    throw std::runtime_error("No key pair available");
  }

  clearOpenSSLErrors();

  size_t keyLen = otherPublicKey->size();
  if (keyLen != 33 && keyLen != 65) {
    throw std::runtime_error("ERR_CRYPTO_ECDH_INVALID_PUBLIC_KEY");
  }

  EC_KEY* peerEc = EC_KEY_new_by_curve_name(NID_secp256k1);
  if (!peerEc) {
    throw std::runtime_error("Failed to create EC_KEY: " + getOpenSSLError());
  }

  const EC_GROUP* group = EC_KEY_get0_group(peerEc);
  EC_POINT* peerPoint = EC_POINT_new(group);
  if (!peerPoint) {
    EC_KEY_free(peerEc);
    throw std::runtime_error("Failed to create EC_POINT: " + getOpenSSLError());
  }

  const uint8_t* keyData = static_cast<const uint8_t*>(otherPublicKey->data());
  if (EC_POINT_oct2point(group, peerPoint, keyData, keyLen, nullptr) != 1) {
    EC_POINT_free(peerPoint);
    EC_KEY_free(peerEc);
    throw std::runtime_error("ERR_CRYPTO_ECDH_INVALID_PUBLIC_KEY");
  }

  if (EC_KEY_set_public_key(peerEc, peerPoint) != 1) {
    EC_POINT_free(peerPoint);
    EC_KEY_free(peerEc);
    throw std::runtime_error("Failed to set peer public key: " + getOpenSSLError());
  }
  EC_POINT_free(peerPoint);

  EVP_PKEY* peerKey = EVP_PKEY_new();
  if (!peerKey) {
    EC_KEY_free(peerEc);
    throw std::runtime_error("Failed to create peer EVP_PKEY: " + getOpenSSLError());
  }

  if (EVP_PKEY_set1_EC_KEY(peerKey, peerEc) != 1) {
    EVP_PKEY_free(peerKey);
    EC_KEY_free(peerEc);
    throw std::runtime_error("Failed to set peer EC_KEY: " + getOpenSSLError());
  }
  EC_KEY_free(peerEc);

  EVP_PKEY_CTX* ctx = EVP_PKEY_CTX_new(this->pkey, nullptr);
  if (!ctx) {
    EVP_PKEY_free(peerKey);
    throw std::runtime_error("Failed to create derive context: " + getOpenSSLError());
  }

  if (EVP_PKEY_derive_init(ctx) <= 0) {
    EVP_PKEY_CTX_free(ctx);
    EVP_PKEY_free(peerKey);
    throw std::runtime_error("Failed to init derive: " + getOpenSSLError());
  }

  if (EVP_PKEY_derive_set_peer(ctx, peerKey) <= 0) {
    EVP_PKEY_CTX_free(ctx);
    EVP_PKEY_free(peerKey);
    throw std::runtime_error("ERR_CRYPTO_ECDH_INVALID_PUBLIC_KEY");
  }

  size_t secretLen;
  if (EVP_PKEY_derive(ctx, nullptr, &secretLen) <= 0) {
    EVP_PKEY_CTX_free(ctx);
    EVP_PKEY_free(peerKey);
    throw std::runtime_error("Failed to get secret length: " + getOpenSSLError());
  }

  auto* secret = new uint8_t[secretLen];
  if (EVP_PKEY_derive(ctx, secret, &secretLen) <= 0) {
    delete[] secret;
    EVP_PKEY_CTX_free(ctx);
    EVP_PKEY_free(peerKey);
    throw std::runtime_error("Failed to derive secret: " + getOpenSSLError());
  }

  EVP_PKEY_CTX_free(ctx);
  EVP_PKEY_free(peerKey);

  return std::make_shared<NativeArrayBuffer>(secret, secretLen, [=]() { delete[] secret; });
}

} // namespace margelo::nitro::crypto
