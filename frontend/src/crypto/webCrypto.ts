import { arrayBufferToHex, generateRandomBytes, stringToArrayBuffer } from './utils';

const AES_ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const TAG_LENGTH = 128; // 128-bit authentication tag

export async function generateAesKey(): Promise<CryptoKey> {
  return await window.crypto.subtle.generateKey(
    {
      name: AES_ALGORITHM,
      length: KEY_LENGTH,
    },
    true, // extractable for key wrapping
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
  );
}

export function generateIv(): Uint8Array {
  // 96-bit (12 bytes) CSPRNG nonce recommended for AES-GCM
  return generateRandomBytes(12);
}

export function generateSalt(length = 16): Uint8Array {
  // 128-bit (16 bytes) random salt
  return generateRandomBytes(length);
}

export async function importRawKey(
  rawBytes: Uint8Array,
  usages: KeyUsage[] = ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
): Promise<CryptoKey> {
  return await window.crypto.subtle.importKey(
    'raw',
    rawBytes as BufferSource,
    {
      name: AES_ALGORITHM,
      length: KEY_LENGTH,
    },
    true,
    usages
  );
}

export async function exportRawKey(key: CryptoKey): Promise<Uint8Array> {
  const exported = await window.crypto.subtle.exportKey('raw', key);
  return new Uint8Array(exported);
}

export async function encryptAesGcm(
  key: CryptoKey,
  plaintextBytes: Uint8Array,
  iv: Uint8Array,
  additionalData?: Uint8Array
): Promise<Uint8Array> {
  const params: AesGcmParams = {
    name: AES_ALGORITHM,
    iv: iv as BufferSource,
    tagLength: TAG_LENGTH,
  };

  if (additionalData) {
    params.additionalData = additionalData as BufferSource;
  }

  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    params,
    key,
    plaintextBytes as BufferSource
  );
  return new Uint8Array(ciphertextBuffer);
}

export async function decryptAesGcm(
  key: CryptoKey,
  ciphertextBytes: Uint8Array,
  iv: Uint8Array,
  additionalData?: Uint8Array
): Promise<Uint8Array> {
  const params: AesGcmParams = {
    name: AES_ALGORITHM,
    iv: iv as BufferSource,
    tagLength: TAG_LENGTH,
  };

  if (additionalData) {
    params.additionalData = additionalData as BufferSource;
  }

  const plaintextBuffer = await window.crypto.subtle.decrypt(
    params,
    key,
    ciphertextBytes as BufferSource
  );
  return new Uint8Array(plaintextBuffer);
}

export async function deriveHkdf(
  ikm: Uint8Array,
  salt: Uint8Array,
  info: string,
  lengthBytes = 32
): Promise<Uint8Array> {
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    ikm as BufferSource,
    { name: 'HKDF' },
    false,
    ['deriveBits']
  );

  const derivedBits = await window.crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: salt as BufferSource,
      info: stringToArrayBuffer(info) as BufferSource,
    },
    baseKey,
    lengthBytes * 8
  );

  return new Uint8Array(derivedBits);
}

export async function computeSha256(data: Uint8Array | string): Promise<string> {
  const buffer = typeof data === 'string' ? stringToArrayBuffer(data) : data;
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer as BufferSource);
  return arrayBufferToHex(hashBuffer);
}
