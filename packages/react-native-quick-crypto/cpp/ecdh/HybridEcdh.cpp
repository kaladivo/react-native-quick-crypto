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
  throw std::runtime_error("Not implemented: setPrivateKeyRaw");
}

} // namespace margelo::nitro::crypto
