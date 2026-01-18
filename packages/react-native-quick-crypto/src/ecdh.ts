import { NitroModules } from 'react-native-nitro-modules';
import { Buffer } from '@craftzdog/react-native-buffer';
import type { Ecdh } from './specs/ecdh.nitro';

type ECDHEncoding = 'hex' | 'base64' | 'base64url' | 'latin1' | 'binary';
type ECDHFormat = 'compressed' | 'uncompressed';

export class ECDH {
  private native: Ecdh;
  readonly curve: string;

  constructor(curve: string) {
    this.native = NitroModules.createHybridObject<Ecdh>('Ecdh');
    this.curve = curve;
    this.native.setCurve(curve);
  }

  generateKeys(encoding?: ECDHEncoding, format?: ECDHFormat): Buffer | string {
    this.native.generateKeys();
    return this.getPublicKey(encoding, format);
  }

  getPublicKey(encoding?: ECDHEncoding, format?: ECDHFormat): Buffer | string {
    const formatFlag = format === 'compressed' ? 0 : 1;
    const raw = this.native.getPublicKeyRaw(formatFlag);
    return this.encodeOutput(raw, encoding);
  }

  getPrivateKey(encoding?: ECDHEncoding): Buffer | string {
    const raw = this.native.getPrivateKeyRaw();
    return this.encodeOutput(raw, encoding);
  }

  setPrivateKey(
    privateKey: Buffer | ArrayBuffer | Uint8Array | string,
    encoding?: ECDHEncoding
  ): void {
    const keyBuffer = this.decodeInput(privateKey, encoding);
    this.native.setPrivateKeyRaw(keyBuffer);
  }

  private encodeOutput(
    data: ArrayBuffer,
    encoding?: ECDHEncoding
  ): Buffer | string {
    const buf = Buffer.from(data);
    if (!encoding) return buf;
    const actualEncoding = encoding === 'binary' ? 'latin1' : encoding;
    return buf.toString(actualEncoding as BufferEncoding);
  }

  private decodeInput(
    data: Buffer | ArrayBuffer | Uint8Array | string,
    encoding?: ECDHEncoding
  ): ArrayBuffer {
    let buf: Buffer;
    if (typeof data === 'string') {
      const enc = encoding === 'binary' ? 'latin1' : encoding;
      buf = Buffer.from(data, enc as BufferEncoding);
    } else if (Buffer.isBuffer(data)) {
      buf = data;
    } else if (data instanceof Uint8Array) {
      buf = Buffer.from(data);
    } else {
      buf = Buffer.from(data);
    }
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  }
}

const SUPPORTED_CURVES = ['secp256k1'] as const;

export function createECDH(curveName: string): ECDH {
  if (!SUPPORTED_CURVES.includes(curveName as (typeof SUPPORTED_CURVES)[number])) {
    const err = new Error(`Unsupported curve: ${curveName}`);
    (err as NodeJS.ErrnoException).code = 'ERR_CRYPTO_INVALID_CURVE';
    throw err;
  }
  return new ECDH(curveName);
}
