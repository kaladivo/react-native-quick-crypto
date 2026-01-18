#pragma once

#include <memory>
#include <openssl/bn.h>
#include <openssl/ec.h>
#include <openssl/err.h>
#include <openssl/evp.h>
#include <string>

#include "HybridEcdhSpec.hpp"
#include "Utils.hpp"

namespace margelo::nitro::crypto {

class HybridEcdh : public HybridEcdhSpec {
public:
  HybridEcdh() : HybridObject(TAG) {}
  ~HybridEcdh() {
    if (pkey != nullptr) {
      EVP_PKEY_free(pkey);
      pkey = nullptr;
    }
  }

public:
  void setCurve(const std::string& curve) override;
  void generateKeys() override;
  std::shared_ptr<ArrayBuffer> getPublicKeyRaw(double format) override;
  std::shared_ptr<ArrayBuffer> getPrivateKeyRaw() override;
  void setPrivateKeyRaw(const std::shared_ptr<ArrayBuffer>& privateKey) override;

private:
  std::string curve;
  EVP_PKEY* pkey = nullptr;
};

} // namespace margelo::nitro::crypto
