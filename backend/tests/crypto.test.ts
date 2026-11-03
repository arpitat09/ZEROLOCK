import { describe, it, expect } from 'vitest';
import crypto from 'crypto';

describe('Cryptographic Primitives & Envelope Invariants', () => {
  const subtle = crypto.webcrypto.subtle;

  it('generates a 256-bit AES-GCM key and encrypts/decrypts correctly', async () => {
    const key = await subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plaintext = Buffer.from('VTU Cryptography Test Note 2026: Zero-Knowledge Confirmed');

    const ciphertext = await subtle.encrypt(
      { name: 'AES-GCM', iv, tagLength: 128 },
      key,
      plaintext
    );

    expect(ciphertext.byteLength).toBe(plaintext.byteLength + 16); // 16 bytes auth tag

    const decrypted = await subtle.decrypt(
      { name: 'AES-GCM', iv, tagLength: 128 },
      key,
      ciphertext
    );

    expect(Buffer.from(decrypted).toString()).toBe(plaintext.toString());
  });

  it('rejects decryption when ciphertext is tampered (bit-flip detection)', async () => {
    const key = await subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plaintext = Buffer.from('Tamper-evident confidential note');

    const ciphertext = await subtle.encrypt(
      { name: 'AES-GCM', iv, tagLength: 128 },
      key,
      plaintext
    );

    const tampered = new Uint8Array(ciphertext);
    tampered[0] ^= 0x01; // Invert one bit

    await expect(
      subtle.decrypt({ name: 'AES-GCM', iv, tagLength: 128 }, key, tampered)
    ).rejects.toThrow();
  });

  it('rejects decryption when wrong key is provided', async () => {
    const keyA = await subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const keyB = await subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const plaintext = Buffer.from('Sensitive note payload');
    const ciphertext = await subtle.encrypt({ name: 'AES-GCM', iv, tagLength: 128 }, keyA, plaintext);

    await expect(
      subtle.decrypt({ name: 'AES-GCM', iv, tagLength: 128 }, keyB, ciphertext)
    ).rejects.toThrow();
  });

  it('verifies HKDF-SHA-256 domain separation', async () => {
    const ikm = crypto.getRandomValues(new Uint8Array(32));
    const salt = crypto.getRandomValues(new Uint8Array(16));

    const baseKey = await subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);

    const key1 = await subtle.deriveBits(
      { name: 'HKDF', hash: 'SHA-256', salt, info: Buffer.from('ZEROLOCK_RECOVERY_KEY_V1') },
      baseKey,
      256
    );

    const key2 = await subtle.deriveBits(
      { name: 'HKDF', hash: 'SHA-256', salt, info: Buffer.from('ZEROLOCK_BACKUP_KEY_V1') },
      baseKey,
      256
    );

    expect(Buffer.from(key1).toString('hex')).not.toBe(Buffer.from(key2).toString('hex'));
  });

  it('generates 1,000 distinct IVs with zero collisions', () => {
    const set = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const hex = Buffer.from(iv).toString('hex');
      expect(set.has(hex)).toBe(false);
      set.add(hex);
    }
    expect(set.size).toBe(1000);
  });
});
