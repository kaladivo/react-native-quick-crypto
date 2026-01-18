# Stack Research: ECDH/secp256k1

**Project:** react-native-quick-crypto ECDH implementation
**Researched:** 2026-01-18
**Confidence:** HIGH (verified against existing codebase patterns and OpenSSL documentation)

## Executive Summary

ECDH with secp256k1 requires EVP-based APIs for key generation, raw key import/export, and shared secret derivation. The codebase already has patterns for EC key pairs (`HybridEcKeyPair`) and Diffie-Hellman with X25519/X448 (`HybridEdKeyPair`). ECDH for secp256k1 follows similar patterns but requires different handling for raw key bytes (EC point format vs raw 32-byte keys).

## OpenSSL APIs Required

### Key Generation

**Functions for generating secp256k1 key pairs:**

```cpp
// Pattern 1: Parameter-based generation (RECOMMENDED - matches existing HybridEcKeyPair)
EVP_PKEY_CTX* param_ctx = EVP_PKEY_CTX_new_id(EVP_PKEY_EC, nullptr);
EVP_PKEY_paramgen_init(param_ctx);
EVP_PKEY_CTX_set_ec_paramgen_curve_nid(param_ctx, NID_secp256k1);
EVP_PKEY_CTX_set_ec_param_enc(param_ctx, OPENSSL_EC_NAMED_CURVE);
EVP_PKEY* params = nullptr;
EVP_PKEY_paramgen(param_ctx, &params);

EVP_PKEY_CTX* key_ctx = EVP_PKEY_CTX_new(params, nullptr);
EVP_PKEY_keygen_init(key_ctx);
EVP_PKEY* pkey = nullptr;
EVP_PKEY_keygen(key_ctx, &pkey);
```

**Curve NID for secp256k1:**
```cpp
#include <openssl/obj_mac.h>
int curve_nid = NID_secp256k1;  // Already supported in HybridEcKeyPair::GetCurveFromName()
```

**Key sizes for secp256k1:**
- Private key: 32 bytes (256 bits)
- Public key (uncompressed): 65 bytes (0x04 + 32-byte X + 32-byte Y)
- Public key (compressed): 33 bytes (0x02/0x03 + 32-byte X)
- Shared secret: 32 bytes (X coordinate of resulting EC point)

### Key Import/Export

**CRITICAL:** `EVP_PKEY_get_raw_public_key()` and `EVP_PKEY_new_raw_public_key()` do NOT work for traditional EC curves like secp256k1. These functions only support:
- Ed25519, Ed448
- X25519, X448
- ML-DSA, ML-KEM

**For secp256k1, use these approaches:**

#### Exporting Public Key to Raw Bytes (EC Point Format)

```cpp
// Method 1: Using OSSL_PKEY_PARAM (OpenSSL 3.x preferred)
unsigned char pub_buf[65];  // Max size for secp256k1 uncompressed
size_t pub_len = 0;
EVP_PKEY_get_octet_string_param(pkey, OSSL_PKEY_PARAM_PUB_KEY,
                                 pub_buf, sizeof(pub_buf), &pub_len);

// Method 2: Using EC_KEY (legacy, but works)
const EC_KEY* ec = EVP_PKEY_get0_EC_KEY(pkey);
const EC_GROUP* group = EC_KEY_get0_group(ec);
const EC_POINT* pub_point = EC_KEY_get0_public_key(ec);
size_t len = EC_POINT_point2oct(group, pub_point,
                                 POINT_CONVERSION_UNCOMPRESSED,
                                 nullptr, 0, nullptr);
std::vector<unsigned char> pub(len);
EC_POINT_point2oct(group, pub_point, POINT_CONVERSION_UNCOMPRESSED,
                   pub.data(), len, nullptr);
```

#### Exporting Private Key to Raw Bytes

```cpp
// Method 1: Using OSSL_PKEY_PARAM (OpenSSL 3.x)
BIGNUM* priv_bn = nullptr;
EVP_PKEY_get_bn_param(pkey, OSSL_PKEY_PARAM_PRIV_KEY, &priv_bn);
unsigned char priv[32];
BN_bn2binpad(priv_bn, priv, 32);  // Pad to 32 bytes
BN_free(priv_bn);

// Method 2: Using EC_KEY (legacy)
const EC_KEY* ec = EVP_PKEY_get0_EC_KEY(pkey);
const BIGNUM* priv_bn = EC_KEY_get0_private_key(ec);
unsigned char priv[32];
BN_bn2binpad(priv_bn, priv, 32);
```

#### Importing Public Key from Raw Bytes

```cpp
// Using OSSL_PARAM_BLD (OpenSSL 3.x recommended)
#include <openssl/param_build.h>
#include <openssl/core_names.h>

OSSL_PARAM_BLD* bld = OSSL_PARAM_BLD_new();
OSSL_PARAM_BLD_push_utf8_string(bld, OSSL_PKEY_PARAM_GROUP_NAME,
                                 SN_secp256k1, 0);  // "secp256k1"
OSSL_PARAM_BLD_push_octet_string(bld, OSSL_PKEY_PARAM_PUB_KEY,
                                  raw_pub, raw_pub_len);
OSSL_PARAM* params = OSSL_PARAM_BLD_to_param(bld);

EVP_PKEY_CTX* ctx = EVP_PKEY_CTX_new_from_name(nullptr, "EC", nullptr);
EVP_PKEY_fromdata_init(ctx);
EVP_PKEY* pkey = nullptr;
EVP_PKEY_fromdata(ctx, &pkey, EVP_PKEY_PUBLIC_KEY, params);

OSSL_PARAM_free(params);
OSSL_PARAM_BLD_free(bld);
EVP_PKEY_CTX_free(ctx);
```

**Alternative using ncrypto wrappers (matches existing codebase):**
```cpp
// Already implemented in HybridKeyObjectHandle::initECRaw()
ncrypto::ECGroupPointer group = ncrypto::ECGroupPointer::NewByCurveName(NID_secp256k1);
ncrypto::ECPointPointer point = ncrypto::ECPointPointer::New(group.get());
point.setFromBuffer(buffer, group.get());
ncrypto::ECKeyPointer ec = ncrypto::ECKeyPointer::New(group.get());
ec.setPublicKey(point);
ncrypto::EVPKeyPointer pkey = ncrypto::EVPKeyPointer::New();
pkey.set(ec);
```

#### Importing Private Key from Raw Bytes

```cpp
// Using OSSL_PARAM_BLD (OpenSSL 3.x)
OSSL_PARAM_BLD* bld = OSSL_PARAM_BLD_new();
OSSL_PARAM_BLD_push_utf8_string(bld, OSSL_PKEY_PARAM_GROUP_NAME,
                                 SN_secp256k1, 0);
OSSL_PARAM_BLD_push_BN(bld, OSSL_PKEY_PARAM_PRIV_KEY, priv_bn);
// Note: Public key will be computed automatically if KEYPAIR selection used
OSSL_PARAM* params = OSSL_PARAM_BLD_to_param(bld);

EVP_PKEY_CTX* ctx = EVP_PKEY_CTX_new_from_name(nullptr, "EC", nullptr);
EVP_PKEY_fromdata_init(ctx);
EVP_PKEY* pkey = nullptr;
EVP_PKEY_fromdata(ctx, &pkey, EVP_PKEY_KEYPAIR, params);
```

### Secret Derivation (ECDH)

**Complete workflow for computing shared secret:**

```cpp
// 1. Create derivation context from our private key
EVP_PKEY_CTX* ctx = EVP_PKEY_CTX_new_from_pkey(nullptr, our_private_key, nullptr);
if (!ctx) throw std::runtime_error("Failed to create context");

// 2. Initialize derivation
if (EVP_PKEY_derive_init(ctx) <= 0) {
    EVP_PKEY_CTX_free(ctx);
    throw std::runtime_error("Failed to init derive");
}

// 3. Set peer's public key
if (EVP_PKEY_derive_set_peer(ctx, peer_public_key) <= 0) {
    EVP_PKEY_CTX_free(ctx);
    throw std::runtime_error("Failed to set peer key");
}

// 4. Determine buffer size
size_t secret_len = 0;
if (EVP_PKEY_derive(ctx, nullptr, &secret_len) <= 0) {
    EVP_PKEY_CTX_free(ctx);
    throw std::runtime_error("Failed to determine secret length");
}

// 5. Derive shared secret
std::vector<unsigned char> secret(secret_len);
if (EVP_PKEY_derive(ctx, secret.data(), &secret_len) <= 0) {
    EVP_PKEY_CTX_free(ctx);
    throw std::runtime_error("Failed to derive secret");
}

EVP_PKEY_CTX_free(ctx);
// secret now contains the shared secret (X coordinate of resulting EC point)
```

**Function signatures:**

```cpp
// From <openssl/evp.h>
EVP_PKEY_CTX *EVP_PKEY_CTX_new_from_pkey(OSSL_LIB_CTX *libctx,
                                          EVP_PKEY *pkey, const char *propq);
int EVP_PKEY_derive_init(EVP_PKEY_CTX *ctx);
int EVP_PKEY_derive_set_peer(EVP_PKEY_CTX *ctx, EVP_PKEY *peer);
int EVP_PKEY_derive(EVP_PKEY_CTX *ctx, unsigned char *key, size_t *keylen);
```

## Memory Management

### What Needs Freeing

| Object | Free Function | RAII Wrapper |
|--------|---------------|--------------|
| `EVP_PKEY*` | `EVP_PKEY_free()` | `std::unique_ptr<EVP_PKEY, decltype(&EVP_PKEY_free)>` |
| `EVP_PKEY_CTX*` | `EVP_PKEY_CTX_free()` | `std::unique_ptr<EVP_PKEY_CTX, decltype(&EVP_PKEY_CTX_free)>` |
| `BIGNUM*` | `BN_free()` | `std::unique_ptr<BIGNUM, decltype(&BN_free)>` |
| `EC_KEY*` | `EC_KEY_free()` | `ncrypto::ECKeyPointer` |
| `EC_GROUP*` | `EC_GROUP_free()` | `ncrypto::ECGroupPointer` |
| `EC_POINT*` | `EC_POINT_free()` | `ncrypto::ECPointPointer` |
| `OSSL_PARAM*` | `OSSL_PARAM_free()` | manual |
| `OSSL_PARAM_BLD*` | `OSSL_PARAM_BLD_free()` | manual |

### RAII Patterns (from existing codebase)

```cpp
// From HybridEcKeyPair.cpp - use these patterns
std::unique_ptr<EVP_PKEY_CTX, decltype(&EVP_PKEY_CTX_free)> ctx(
    EVP_PKEY_CTX_new_from_pkey(nullptr, pkey, nullptr),
    EVP_PKEY_CTX_free
);

std::unique_ptr<EVP_PKEY, decltype(&EVP_PKEY_free)> params(
    raw_params,
    EVP_PKEY_free
);

// For dynamic allocations
auto shared_secret = new uint8_t[secret_len];
return std::make_shared<NativeArrayBuffer>(
    shared_secret, secret_len,
    [=]() { delete[] shared_secret; }
);
```

### ncrypto Wrappers (available in codebase)

The codebase uses `ncrypto` wrappers which provide RAII semantics:

```cpp
#include <ncrypto.h>

ncrypto::EVPKeyPointer pkey;      // Auto-frees EVP_PKEY
ncrypto::ECKeyPointer ec;          // Auto-frees EC_KEY
ncrypto::ECGroupPointer group;     // Auto-frees EC_GROUP
ncrypto::ECPointPointer point;     // Auto-frees EC_POINT
```

## Error Handling

### OpenSSL Error Retrieval Pattern

```cpp
// From Utils.hpp - already available
inline std::string getOpenSSLError() {
    unsigned long errCode = ERR_get_error();
    if (errCode == 0) return "";
    char errStr[256];
    ERR_error_string_n(errCode, errStr, sizeof(errStr));
    ERR_clear_error();
    return std::string(errStr);
}

inline void clearOpenSSLErrors() {
    ERR_clear_error();
}
```

### Error Handling Pattern

```cpp
// Clear errors before operations
clearOpenSSLErrors();

if (EVP_PKEY_derive_init(ctx) <= 0) {
    throw std::runtime_error("Failed to initialize key derivation: " + getOpenSSLError());
}
```

### Return Value Semantics

| Return Value | Meaning |
|--------------|---------|
| `> 0` | Success |
| `== 0` | Failure (check error stack) |
| `< 0` | Catastrophic failure |

## Code Patterns

### Pattern 1: computeSecret (ECDH derive)

Based on existing `HybridEdKeyPair::diffieHellman()` but adapted for EC curves:

```cpp
std::shared_ptr<ArrayBuffer> HybridEcdhKeyPair::computeSecret(
    const std::shared_ptr<ArrayBuffer>& peerPublicKey) {

    using EVP_PKEY_CTX_ptr = std::unique_ptr<EVP_PKEY_CTX, decltype(&EVP_PKEY_CTX_free)>;

    // Verify we have a private key
    if (!this->pkey) {
        throw std::runtime_error("No private key available");
    }

    // Import peer's public key from raw EC point format
    EVP_PKEY* peer_pkey = importPublicKeyFromRaw(peerPublicKey);
    if (!peer_pkey) {
        throw std::runtime_error("Failed to import peer public key");
    }
    std::unique_ptr<EVP_PKEY, decltype(&EVP_PKEY_free)> peer_guard(peer_pkey, EVP_PKEY_free);

    // Create derivation context
    EVP_PKEY_CTX_ptr ctx(
        EVP_PKEY_CTX_new_from_pkey(nullptr, this->pkey, nullptr),
        EVP_PKEY_CTX_free
    );
    if (!ctx) {
        throw std::runtime_error("Failed to create context: " + getOpenSSLError());
    }

    // Initialize derivation
    if (EVP_PKEY_derive_init(ctx.get()) <= 0) {
        throw std::runtime_error("Failed to init derive: " + getOpenSSLError());
    }

    // Set peer public key
    if (EVP_PKEY_derive_set_peer(ctx.get(), peer_pkey) <= 0) {
        throw std::runtime_error("Failed to set peer: " + getOpenSSLError());
    }

    // Get required buffer size
    size_t secret_len = 0;
    if (EVP_PKEY_derive(ctx.get(), nullptr, &secret_len) <= 0) {
        throw std::runtime_error("Failed to get secret length: " + getOpenSSLError());
    }

    // Derive shared secret
    auto* secret = new uint8_t[secret_len];
    if (EVP_PKEY_derive(ctx.get(), secret, &secret_len) <= 0) {
        delete[] secret;
        throw std::runtime_error("Failed to derive secret: " + getOpenSSLError());
    }

    return std::make_shared<NativeArrayBuffer>(
        secret, secret_len,
        [=]() { delete[] secret; }
    );
}
```

### Pattern 2: Export Raw Public Key

```cpp
std::shared_ptr<ArrayBuffer> HybridEcdhKeyPair::getPublicKeyRaw() {
    if (!this->pkey) {
        throw std::runtime_error("No key pair generated");
    }

    // Get EC key from EVP_PKEY
    const EC_KEY* ec = EVP_PKEY_get0_EC_KEY(this->pkey);
    if (!ec) {
        throw std::runtime_error("Failed to get EC_KEY");
    }

    const EC_GROUP* group = EC_KEY_get0_group(ec);
    const EC_POINT* pub_point = EC_KEY_get0_public_key(ec);

    // Determine output size (uncompressed format)
    size_t len = EC_POINT_point2oct(group, pub_point,
                                     POINT_CONVERSION_UNCOMPRESSED,
                                     nullptr, 0, nullptr);

    auto* buf = new uint8_t[len];
    EC_POINT_point2oct(group, pub_point, POINT_CONVERSION_UNCOMPRESSED,
                       buf, len, nullptr);

    return std::make_shared<NativeArrayBuffer>(
        buf, len,
        [=]() { delete[] buf; }
    );
}
```

### Pattern 3: Import Raw Public Key

```cpp
EVP_PKEY* HybridEcdhKeyPair::importPublicKeyFromRaw(
    const std::shared_ptr<ArrayBuffer>& keyData) {

    // Use existing ncrypto pattern from initECRaw
    ncrypto::ECGroupPointer group = ncrypto::ECGroupPointer::NewByCurveName(NID_secp256k1);
    if (!group) {
        throw std::runtime_error("Failed to create EC_GROUP");
    }

    ncrypto::ECPointPointer point = ncrypto::ECPointPointer::New(group.get());
    if (!point) {
        throw std::runtime_error("Failed to create EC_POINT");
    }

    ncrypto::Buffer<const unsigned char> buffer{
        .data = reinterpret_cast<const unsigned char*>(keyData->data()),
        .len = keyData->size()
    };

    if (!point.setFromBuffer(buffer, group.get())) {
        throw std::runtime_error("Invalid EC point data");
    }

    ncrypto::ECKeyPointer ec = ncrypto::ECKeyPointer::New(group.get());
    if (!ec || !ec.setPublicKey(point)) {
        throw std::runtime_error("Failed to set public key");
    }

    EVP_PKEY* pkey = EVP_PKEY_new();
    if (!pkey || EVP_PKEY_set1_EC_KEY(pkey, ec.get()) != 1) {
        if (pkey) EVP_PKEY_free(pkey);
        throw std::runtime_error("Failed to create EVP_PKEY");
    }

    return pkey;
}
```

### Pattern 4: setPrivateKey from Raw Bytes

```cpp
void HybridEcdhKeyPair::setPrivateKey(const std::shared_ptr<ArrayBuffer>& keyData) {
    // Clean up existing key
    if (this->pkey) {
        EVP_PKEY_free(this->pkey);
        this->pkey = nullptr;
    }

    // Create EC_KEY for secp256k1
    EC_KEY* ec = EC_KEY_new_by_curve_name(NID_secp256k1);
    if (!ec) {
        throw std::runtime_error("Failed to create EC_KEY");
    }

    // Import private key bytes
    BIGNUM* priv_bn = BN_bin2bn(
        reinterpret_cast<const unsigned char*>(keyData->data()),
        static_cast<int>(keyData->size()),
        nullptr
    );
    if (!priv_bn) {
        EC_KEY_free(ec);
        throw std::runtime_error("Failed to create BIGNUM");
    }

    if (EC_KEY_set_private_key(ec, priv_bn) != 1) {
        BN_free(priv_bn);
        EC_KEY_free(ec);
        throw std::runtime_error("Failed to set private key");
    }

    // Compute public key from private key
    const EC_GROUP* group = EC_KEY_get0_group(ec);
    EC_POINT* pub_point = EC_POINT_new(group);
    if (!pub_point) {
        BN_free(priv_bn);
        EC_KEY_free(ec);
        throw std::runtime_error("Failed to create EC_POINT");
    }

    if (EC_POINT_mul(group, pub_point, priv_bn, nullptr, nullptr, nullptr) != 1) {
        EC_POINT_free(pub_point);
        BN_free(priv_bn);
        EC_KEY_free(ec);
        throw std::runtime_error("Failed to compute public key");
    }

    if (EC_KEY_set_public_key(ec, pub_point) != 1) {
        EC_POINT_free(pub_point);
        BN_free(priv_bn);
        EC_KEY_free(ec);
        throw std::runtime_error("Failed to set public key");
    }

    EC_POINT_free(pub_point);
    BN_free(priv_bn);

    // Create EVP_PKEY
    this->pkey = EVP_PKEY_new();
    if (!this->pkey || EVP_PKEY_set1_EC_KEY(this->pkey, ec) != 1) {
        EC_KEY_free(ec);
        if (this->pkey) {
            EVP_PKEY_free(this->pkey);
            this->pkey = nullptr;
        }
        throw std::runtime_error("Failed to create EVP_PKEY");
    }

    EC_KEY_free(ec);  // EVP_PKEY has its own reference
}
```

## Required Headers

```cpp
#include <openssl/evp.h>
#include <openssl/ec.h>
#include <openssl/obj_mac.h>      // NID_secp256k1
#include <openssl/err.h>
#include <openssl/bn.h>
#include <openssl/param_build.h>  // OSSL_PARAM_BLD (OpenSSL 3.x)
#include <openssl/core_names.h>   // OSSL_PKEY_PARAM_* macros
```

## Codebase Integration Notes

### Existing Patterns to Follow

1. **HybridEcKeyPair** - EC key generation and sign/verify (can extend for ECDH)
2. **HybridEdKeyPair::diffieHellman()** - ECDH pattern for X25519/X448 (adapt for EC)
3. **HybridKeyObjectHandle::initECRaw()** - Raw EC public key import using ncrypto wrappers
4. **Utils.hpp** - Error handling utilities, ArrayBuffer conversion

### Key Differences from X25519/X448

| Aspect | X25519/X448 | secp256k1 |
|--------|-------------|-----------|
| Raw public key import | `EVP_PKEY_new_raw_public_key()` | `EC_POINT_oct2point()` or `EVP_PKEY_fromdata()` |
| Raw public key export | `EVP_PKEY_get_raw_public_key()` | `EC_POINT_point2oct()` or `EVP_PKEY_get_octet_string_param()` |
| Public key format | 32 bytes raw | 65 bytes (uncompressed) or 33 bytes (compressed) |
| Private key size | 32 bytes | 32 bytes |
| Shared secret size | 32 bytes | 32 bytes |

### Recommended Implementation Approach

1. **Extend HybridEcKeyPair** or create **HybridEcdhKeyPair**
2. Add methods: `computeSecret()`, `getPublicKeyRaw()`, `getPrivateKeyRaw()`, `setPublicKey()`, `setPrivateKey()`
3. Reuse existing curve handling from `GetCurveFromName()`
4. Follow RAII patterns from existing code
5. Use ncrypto wrappers where available for consistency

## Sources

- [OpenSSL EVP_KEYEXCH-ECDH Documentation](https://docs.openssl.org/master/man7/EVP_KEYEXCH-ECDH/)
- [OpenSSL Wiki - Elliptic Curve Diffie Hellman](https://wiki.openssl.org/index.php/Elliptic_Curve_Diffie_Hellman)
- [OpenSSL EVP_PKEY-EC Documentation](https://docs.openssl.org/3.3/man7/EVP_PKEY-EC/)
- [OpenSSL EVP_PKEY_derive man page](https://docs.openssl.org/master/man3/EVP_PKEY_derive)
- [OpenSSL GitHub - EVP_PKEY_fromdata](https://github.com/openssl/openssl/blob/master/doc/man3/EVP_PKEY_fromdata.pod)
- [OpenSSL GitHub Issue #18437 - EC key import](https://github.com/openssl/openssl/issues/18437)
- Existing codebase: `HybridEcKeyPair.cpp`, `HybridEdKeyPair.cpp`, `HybridKeyObjectHandle.cpp`
