import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../services/api';
import { deriveArgon2idKey, DEFAULT_ARGON2_PARAMS } from '../crypto/argon2';
import { generateAesKey, importRawKey, generateSalt } from '../crypto/webCrypto';
import { wrapKey, unwrapKey } from '../crypto/envelope';
import {
  generateRecoverySecret,
  wrapVaultKeyWithRecovery,
  unwrapVaultKeyWithRecovery,
  RecoveryCredentials,
} from '../crypto/recovery';
import { base64ToArrayBuffer, arrayBufferToBase64 } from '../crypto/utils';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { VaultMetadataDTO } from '@zerolock/shared';

interface VaultContextType {
  vaultKey: CryptoKey | null;
  isUnlocked: boolean;
  isDeriving: boolean;
  kdfProgress: string;
  vaultMetadata: VaultMetadataDTO | null;
  unlock: (masterPassword: string) => Promise<boolean>;
  unlockWithRecovery: (recoveryCode: string) => Promise<boolean>;
  setupVault: (masterPassword: string) => Promise<RecoveryCredentials>;
  rotateMasterPassword: (oldPassword: string, newPassword: string) => Promise<void>;
  lock: () => void;
  autoLockMinutes: number;
  setAutoLockMinutes: (minutes: number) => void;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export const VaultProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, setVaultConfigured } = useAuth();
  const { success, error, warning } = useToast();

  const [vaultKey, setVaultKey] = useState<CryptoKey | null>(null);
  const [isDeriving, setIsDeriving] = useState<boolean>(false);
  const [kdfProgress, setKdfProgress] = useState<string>('');
  const [vaultMetadata, setVaultMetadata] = useState<VaultMetadataDTO | null>(null);
  const [autoLockMinutes, setAutoLockMinutes] = useState<number>(15);

  const idleTimerRef = useRef<number | null>(null);

  const lock = useCallback(() => {
    if (vaultKey) {
      setVaultKey(null);
      api.logVaultEvent({ eventType: 'VAULT_LOCK', status: 'SUCCESS', details: 'Vault locked' }).catch(() => {});
      warning('Vault locked. Encryption keys wiped from memory.');
    }
  }, [vaultKey, warning]);

  // Reset idle lock timer on user activity
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      window.clearTimeout(idleTimerRef.current);
    }
    if (vaultKey && autoLockMinutes > 0) {
      idleTimerRef.current = window.setTimeout(() => {
        lock();
      }, autoLockMinutes * 60 * 1000);
    }
  }, [vaultKey, autoLockMinutes, lock]);

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    const handleActivity = () => resetIdleTimer();

    events.forEach((evt) => window.addEventListener(evt, handleActivity));
    resetIdleTimer();

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleActivity));
      if (idleTimerRef.current) {
        window.clearTimeout(idleTimerRef.current);
      }
    };
  }, [resetIdleTimer]);

  // Lock vault on logout or auth failure
  useEffect(() => {
    if (!isAuthenticated) {
      setVaultKey(null);
      setVaultMetadata(null);
    }
  }, [isAuthenticated]);

  // Setup initial vault with fresh master password & recovery secret
  const setupVault = async (masterPassword: string): Promise<RecoveryCredentials> => {
    setIsDeriving(true);
    setKdfProgress('Initializing 256-bit AES-GCM Vault Key...');

    try {
      // 1. Generate 256-bit random master Vault Key
      const newVaultKey = await generateAesKey();

      // 2. Generate random 16-byte salt for Argon2id KEK
      setKdfProgress('Generating random salt and deriving KEK via Argon2id...');
      const salt = generateSalt(16);

      // 3. Derive KEK from Master Password using Argon2id
      const kekBytes = await deriveArgon2idKey(masterPassword, salt, DEFAULT_ARGON2_PARAMS);
      const kek = await importRawKey(kekBytes);

      // 4. Wrap Vault Key under KEK using AES-256-GCM
      setKdfProgress('Wrapping Vault Key with KEK...');
      const wrappedVaultKey = await wrapKey(newVaultKey, kek);

      // 5. Generate client-side emergency recovery secret and wrap Vault Key
      setKdfProgress('Generating 256-bit recovery credentials...');
      const recoveryCredentials = generateRecoverySecret();
      const wrappedRecovery = await wrapVaultKeyWithRecovery(newVaultKey, recoveryCredentials.rawHex);

      // 6. Transmit ONLY salt, public KDF parameters, and wrapped ciphertexts to backend
      setKdfProgress('Securing encrypted vault envelope...');
      const metadata = await api.setupVault({
        salt: arrayBufferToBase64(salt),
        kdfAlgorithm: 'argon2id',
        kdfParameters: DEFAULT_ARGON2_PARAMS,
        wrappedVaultKey: wrappedVaultKey.wrappedKey,
        wrappedVaultKeyIv: wrappedVaultKey.iv,
        recoveryWrappedVaultKey: wrappedRecovery.recoveryWrappedVaultKey,
        recoveryIv: wrappedRecovery.recoveryIv,
      });

      setVaultKey(newVaultKey);
      setVaultMetadata(metadata);
      setVaultConfigured(true);
      success('Cryptographic vault initialized and unlocked!');

      return recoveryCredentials;
    } catch (err: any) {
      error(err.message || 'Vault setup failed');
      throw err;
    } finally {
      setIsDeriving(false);
      setKdfProgress('');
    }
  };

  // Unlock existing vault using Master Password
  const unlock = async (masterPassword: string): Promise<boolean> => {
    setIsDeriving(true);
    setKdfProgress('Fetching encrypted vault metadata from server...');

    try {
      const metadata = await api.getVaultMetadata();
      setVaultMetadata(metadata);

      setKdfProgress(`Deriving KEK via Argon2id (${metadata.kdfParameters.memoryCost / 1024}MB RAM, ${metadata.kdfParameters.timeCost} iterations)...`);
      const saltBytes = base64ToArrayBuffer(metadata.salt);

      const kekBytes = await deriveArgon2idKey(masterPassword, saltBytes, metadata.kdfParameters);
      const kek = await importRawKey(kekBytes);

      setKdfProgress('Unwrapping Vault Key with AES-256-GCM...');
      try {
        const unwrappedVaultKey = await unwrapKey(
          metadata.wrappedVaultKey,
          kek,
          metadata.wrappedVaultKeyIv
        );

        setVaultKey(unwrappedVaultKey);
        await api.logVaultEvent({ eventType: 'VAULT_UNLOCK', status: 'SUCCESS', details: 'Vault unlocked with master password' });
        success('Vault unlocked successfully!');
        return true;
      } catch {
        await api.logVaultEvent({ eventType: 'VAULT_UNLOCK', status: 'FAILURE', details: 'Incorrect master password decryption attempt' });
        error('Invalid master password! Decryption authentication failed.');
        return false;
      }
    } catch (err: any) {
      error(err.message || 'Failed to unlock vault');
      return false;
    } finally {
      setIsDeriving(false);
      setKdfProgress('');
    }
  };

  // Emergency Unlock using Recovery Code
  const unlockWithRecovery = async (recoveryCode: string): Promise<boolean> => {
    setIsDeriving(true);
    setKdfProgress('Verifying recovery credentials...');

    try {
      const metadata = await api.getVaultMetadata();
      setVaultMetadata(metadata);

      if (!metadata.recoveryWrappedVaultKey || !metadata.recoveryIv) {
        error('No recovery key is configured for this vault.');
        return false;
      }

      const cleanHex = recoveryCode.replace(/[^0-9a-fA-F]/g, '').toUpperCase();
      if (cleanHex.length !== 64) {
        error('Invalid recovery code format. Must be 64 hexadecimal characters.');
        return false;
      }

      setKdfProgress('Deriving recovery key via HKDF-SHA-256 and unwrapping...');
      try {
        const unwrappedVaultKey = await unwrapVaultKeyWithRecovery(
          metadata.recoveryWrappedVaultKey,
          cleanHex,
          metadata.recoveryIv
        );

        setVaultKey(unwrappedVaultKey);
        await api.logVaultEvent({ eventType: 'RECOVERY_USED', status: 'SUCCESS', details: 'Vault unlocked using recovery code' });
        success('Vault unlocked using emergency recovery credentials!');
        return true;
      } catch {
        error('Invalid recovery code! Could not decrypt wrapped vault key.');
        return false;
      }
    } catch (err: any) {
      error(err.message || 'Emergency recovery failed');
      return false;
    } finally {
      setIsDeriving(false);
      setKdfProgress('');
    }
  };

  // Rotate Master Password without re-encrypting notes
  const rotateMasterPassword = async (oldPassword: string, newPassword: string): Promise<void> => {
    setIsDeriving(true);
    setKdfProgress('Verifying existing master password...');

    try {
      const metadata = await api.getVaultMetadata();
      const saltBytes = base64ToArrayBuffer(metadata.salt);
      const oldKekBytes = await deriveArgon2idKey(oldPassword, saltBytes, metadata.kdfParameters);
      const oldKek = await importRawKey(oldKekBytes);

      // Verify and unwrap existing vault key
      const currentVaultKey = await unwrapKey(
        metadata.wrappedVaultKey,
        oldKek,
        metadata.wrappedVaultKeyIv
      );

      // Generate new salt and derive new KEK
      setKdfProgress('Deriving new KEK with fresh random salt...');
      const newSalt = generateSalt(16);
      const newKekBytes = await deriveArgon2idKey(newPassword, newSalt, DEFAULT_ARGON2_PARAMS);
      const newKek = await importRawKey(newKekBytes);

      // Re-wrap the existing vault key under the new KEK
      setKdfProgress('Re-wrapping existing Vault Key under new KEK...');
      const newWrappedVaultKey = await wrapKey(currentVaultKey, newKek);

      // Update backend metadata
      const updated = await api.rotateVaultKey({
        salt: arrayBufferToBase64(newSalt),
        kdfAlgorithm: 'argon2id',
        kdfParameters: DEFAULT_ARGON2_PARAMS,
        wrappedVaultKey: newWrappedVaultKey.wrappedKey,
        wrappedVaultKeyIv: newWrappedVaultKey.iv,
      });

      setVaultKey(currentVaultKey);
      setVaultMetadata((prev) =>
        prev
          ? {
              ...prev,
              salt: arrayBufferToBase64(newSalt),
              wrappedVaultKey: newWrappedVaultKey.wrappedKey,
              wrappedVaultKeyIv: newWrappedVaultKey.iv,
              vaultVersion: updated.vaultVersion,
              updatedAt: updated.updatedAt,
            }
          : null
      );

      success(`Master password rotated successfully! (Vault v${updated.vaultVersion})`);
    } catch (err: any) {
      error(err.message || 'Master password rotation failed');
      throw err;
    } finally {
      setIsDeriving(false);
      setKdfProgress('');
    }
  };

  return (
    <VaultContext.Provider
      value={{
        vaultKey,
        isUnlocked: !!vaultKey,
        isDeriving,
        kdfProgress,
        vaultMetadata,
        unlock,
        unlockWithRecovery,
        setupVault,
        rotateMasterPassword,
        lock,
        autoLockMinutes,
        setAutoLockMinutes,
      }}
    >
      {children}
    </VaultContext.Provider>
  );
};

export const useVault = () => {
  const context = useContext(VaultContext);
  if (!context) {
    throw new Error('useVault must be used within a VaultProvider');
  }
  return context;
};
