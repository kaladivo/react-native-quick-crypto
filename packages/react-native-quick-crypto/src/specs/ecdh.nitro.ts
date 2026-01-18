import type { HybridObject } from 'react-native-nitro-modules';

export interface Ecdh extends HybridObject<{ ios: 'c++'; android: 'c++' }> {
  setCurve(curve: string): void;
  generateKeys(): void;
  getPublicKeyRaw(format: number): ArrayBuffer;
  getPrivateKeyRaw(): ArrayBuffer;
  setPrivateKeyRaw(privateKey: ArrayBuffer): void;
}
