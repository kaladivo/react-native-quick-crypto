#include "HybridEcdh.hpp"

#include <NitroModules/ArrayBuffer.hpp>

namespace margelo::nitro::crypto {

void HybridEcdh::setCurve(const std::string& curveParam) {
  if (curveParam != "secp256k1") {
    throw std::runtime_error("Unsupported curve: " + curveParam + ". Only secp256k1 is supported.");
  }
  this->curve = curveParam;
}

void HybridEcdh::generateKeys() {
  throw std::runtime_error("Not implemented: generateKeys");
}

std::shared_ptr<ArrayBuffer> HybridEcdh::getPublicKeyRaw(double format) {
  throw std::runtime_error("Not implemented: getPublicKeyRaw");
}

std::shared_ptr<ArrayBuffer> HybridEcdh::getPrivateKeyRaw() {
  throw std::runtime_error("Not implemented: getPrivateKeyRaw");
}

void HybridEcdh::setPrivateKeyRaw(const std::shared_ptr<ArrayBuffer>& privateKey) {
  throw std::runtime_error("Not implemented: setPrivateKeyRaw");
}

} // namespace margelo::nitro::crypto
