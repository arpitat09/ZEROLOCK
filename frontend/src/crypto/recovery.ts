import { generateRandomBytes, hexToArrayBuffer, arrayBufferToHex } from './utils';
import { deriveHkdf, importRawKey } from './webCrypto';
import { wrapKey, unwrapKey } from './envelope';

const RECOVERY_HKDF_INFO = 'ZEROLOCK_VAULT_RECOVERY_KEY_V1';

export interface RecoveryCredentials {
  formattedCode: string;
  rawHex: string;
}

export function generateRecoverySecret(): RecoveryCredentials {
  const secretBytes = generateRandomBytes(32); // 256-bit entropy
  const rawHex = arrayBufferToHex(secretBytes).toUpperCase();

  // Format into blocks of 4 characters: XXXX-XXXX-XXXX-...
  const formattedCode = rawHex.match(/.{1,4}/g)?.join('-') || rawHex;

  return {
    formattedCode,
    rawHex,
  };
}

export async function deriveRecoveryKek(
  rawHex: string,
  salt: Uint8Array = new Uint8Array(16) // Zero or public salt for HKDF domain separation
): Promise<CryptoKey> {
  const ikm = hexToArrayBuffer(rawHex);
  const derivedKeyBytes = await deriveHkdf(ikm, salt, RECOVERY_HKDF_INFO, 32);
  return await importRawKey(derivedKeyBytes);
}

export async function wrapVaultKeyWithRecovery(
  vaultKey: CryptoKey,
  rawHex: string
): Promise<{ recoveryWrappedVaultKey: string; recoveryIv: string }> {
  const recoveryKek = await deriveRecoveryKek(rawHex);
  const wrapped = await wrapKey(vaultKey, recoveryKek);

  return {
    recoveryWrappedVaultKey: wrapped.wrappedKey,
    recoveryIv: wrapped.iv,
  };
}

export async function unwrapVaultKeyWithRecovery(
  recoveryWrappedVaultKey: string,
  rawHex: string,
  recoveryIv: string
): Promise<CryptoKey> {
  const recoveryKek = await deriveRecoveryKek(rawHex);
  return await unwrapKey(recoveryWrappedVaultKey, recoveryKek, recoveryIv);
}
