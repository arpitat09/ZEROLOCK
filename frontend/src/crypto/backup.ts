import {
  EncryptedBackupBundle,
  VaultMetadataDTO,
  EncryptedNoteDTO,
  EncryptedAttachmentDTO,
} from '@zerolock/shared';
import { computeSha256 } from './webCrypto';

export async function createEncryptedBackupBundle(
  vaultMetadata: VaultMetadataDTO,
  notes: EncryptedNoteDTO[],
  attachments: EncryptedAttachmentDTO[]
): Promise<EncryptedBackupBundle> {
  const partialBundle = {
    formatVersion: 'zerolock-v1' as const,
    exportedAt: new Date().toISOString(),
    vaultMetadata,
    notes,
    attachments,
  };

  const payloadString = JSON.stringify(partialBundle);
  const checksumSha256 = await computeSha256(payloadString);

  return {
    ...partialBundle,
    checksumSha256,
  };
}

export async function verifyAndParseBackupBundle(
  rawJson: string
): Promise<{ isValid: boolean; bundle?: EncryptedBackupBundle; error?: string }> {
  try {
    const parsed = JSON.parse(rawJson);

    if (parsed.formatVersion !== 'zerolock-v1') {
      return { isValid: false, error: 'Unsupported backup format version.' };
    }

    if (!parsed.vaultMetadata || !Array.isArray(parsed.notes)) {
      return { isValid: false, error: 'Malformed backup bundle: missing metadata or notes.' };
    }

    // Verify SHA-256 integrity
    const { checksumSha256, ...partial } = parsed;
    const recomputedHash = await computeSha256(JSON.stringify(partial));

    if (recomputedHash !== checksumSha256) {
      return {
        isValid: false,
        error: 'Backup integrity verification failed! File may have been corrupted or tampered with.',
      };
    }

    return { isValid: true, bundle: parsed };
  } catch (err: any) {
    return { isValid: false, error: 'Failed to parse backup JSON: ' + err.message };
  }
}
