import {
  generateAesKey,
  generateIv,
  importRawKey,
  exportRawKey,
  encryptAesGcm,
  decryptAesGcm,
} from './webCrypto';
import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
  stringToArrayBuffer,
  arrayBufferToString,
} from './utils';
import { DecryptedMetadata } from '@zerolock/shared';

export interface EncryptedNoteEnvelope {
  encryptedContent: string;
  contentIv: string;
  encryptedDek: string;
  dekIv: string;
  encryptedMetadata: string;
  metadataIv: string;
}

export interface EncryptedFileEnvelope {
  encryptedFileBlob: Blob;
  encryptedFileKey: string;
  fileKeyIv: string;
  fileIv: string;
  encryptedFileName: string;
  fileNameIv: string;
}

// Key Wrapping: Wrap targetKey under wrappingKey using AES-256-GCM
export async function wrapKey(
  targetKey: CryptoKey,
  wrappingKey: CryptoKey
): Promise<{ wrappedKey: string; iv: string }> {
  const rawKeyBytes = await exportRawKey(targetKey);
  const iv = generateIv();
  const encryptedKeyBytes = await encryptAesGcm(wrappingKey, rawKeyBytes, iv);

  return {
    wrappedKey: arrayBufferToBase64(encryptedKeyBytes),
    iv: arrayBufferToBase64(iv),
  };
}

// Key Unwrapping: Decrypt and reconstruct CryptoKey
export async function unwrapKey(
  wrappedKeyBase64: string,
  wrappingKey: CryptoKey,
  ivBase64: string
): Promise<CryptoKey> {
  const ciphertextBytes = base64ToArrayBuffer(wrappedKeyBase64);
  const iv = base64ToArrayBuffer(ivBase64);
  const decryptedRawBytes = await decryptAesGcm(wrappingKey, ciphertextBytes, iv);

  return await importRawKey(decryptedRawBytes);
}

// Note Encryption: Generates Note DEK, encrypts content and metadata, wraps DEK
export async function encryptNotePayload(
  vaultKey: CryptoKey,
  noteData: { title: string; content: string; tags: string[]; category?: string }
): Promise<EncryptedNoteEnvelope> {
  // 1. Generate unique 256-bit Note Data Encryption Key (DEK)
  const noteDek = await generateAesKey();

  // 2. Encrypt Note Content
  const contentBytes = stringToArrayBuffer(noteData.content);
  const contentIv = generateIv();
  const encryptedContentBytes = await encryptAesGcm(noteDek, contentBytes, contentIv);

  // 3. Encrypt Note Metadata (Title, Tags, Category)
  const metadata: DecryptedMetadata = {
    title: noteData.title,
    tags: noteData.tags || [],
    category: noteData.category || '',
  };
  const metadataBytes = stringToArrayBuffer(JSON.stringify(metadata));
  const metadataIv = generateIv();
  const encryptedMetadataBytes = await encryptAesGcm(noteDek, metadataBytes, metadataIv);

  // 4. Wrap Note DEK with Vault Key
  const wrappedDek = await wrapKey(noteDek, vaultKey);

  return {
    encryptedContent: arrayBufferToBase64(encryptedContentBytes),
    contentIv: arrayBufferToBase64(contentIv),
    encryptedDek: wrappedDek.wrappedKey,
    dekIv: wrappedDek.iv,
    encryptedMetadata: arrayBufferToBase64(encryptedMetadataBytes),
    metadataIv: arrayBufferToBase64(metadataIv),
  };
}

// Note Decryption: Unwraps Note DEK with Vault Key, decrypts content and metadata
export async function decryptNotePayload(
  vaultKey: CryptoKey,
  envelope: EncryptedNoteEnvelope
): Promise<{ title: string; content: string; tags: string[]; category?: string }> {
  // 1. Unwrap Note DEK
  const noteDek = await unwrapKey(envelope.encryptedDek, vaultKey, envelope.dekIv);

  // 2. Decrypt Content
  const contentBytes = base64ToArrayBuffer(envelope.encryptedContent);
  const contentIv = base64ToArrayBuffer(envelope.contentIv);
  const decryptedContentBytes = await decryptAesGcm(noteDek, contentBytes, contentIv);
  const content = arrayBufferToString(decryptedContentBytes);

  // 3. Decrypt Metadata
  const metadataBytes = base64ToArrayBuffer(envelope.encryptedMetadata);
  const metadataIv = base64ToArrayBuffer(envelope.metadataIv);
  const decryptedMetadataBytes = await decryptAesGcm(noteDek, metadataBytes, metadataIv);
  const metadataStr = arrayBufferToString(decryptedMetadataBytes);
  const metadata: DecryptedMetadata = JSON.parse(metadataStr);

  return {
    title: metadata.title || 'Untitled Note',
    content,
    tags: metadata.tags || [],
    category: metadata.category,
  };
}

// Attachment Encryption: Client-side file encryption before transmission
export async function encryptBinaryFile(
  vaultKey: CryptoKey,
  fileBytes: ArrayBuffer,
  fileName: string,
  mimeType: string
): Promise<EncryptedFileEnvelope> {
  const fileDek = await generateAesKey();

  // Encrypt file binary
  const fileIv = generateIv();
  const encryptedFileBytes = await encryptAesGcm(fileDek, new Uint8Array(fileBytes), fileIv);

  // Encrypt original filename
  const fileNameIv = generateIv();
  const encryptedFileNameBytes = await encryptAesGcm(
    fileDek,
    stringToArrayBuffer(fileName),
    fileNameIv
  );

  // Wrap File DEK with Vault Key
  const wrappedKey = await wrapKey(fileDek, vaultKey);

  return {
    encryptedFileBlob: new Blob([encryptedFileBytes as any], { type: 'application/octet-stream' }),
    encryptedFileKey: wrappedKey.wrappedKey,
    fileKeyIv: wrappedKey.iv,
    fileIv: arrayBufferToBase64(fileIv),
    encryptedFileName: arrayBufferToBase64(encryptedFileNameBytes),
    fileNameIv: arrayBufferToBase64(fileNameIv),
  };
}

// Attachment Decryption: Client-side file decryption after download
export async function decryptBinaryFile(
  vaultKey: CryptoKey,
  encryptedBytes: ArrayBuffer,
  envelope: {
    encryptedFileKey: string;
    fileKeyIv: string;
    fileIv: string;
    encryptedFileName: string;
    fileNameIv: string;
  },
  mimeType: string
): Promise<{ fileBlob: Blob; fileName: string }> {
  // 1. Unwrap File DEK
  const fileDek = await unwrapKey(envelope.encryptedFileKey, vaultKey, envelope.fileKeyIv);

  // 2. Decrypt Filename
  const fileNameBytes = base64ToArrayBuffer(envelope.encryptedFileName);
  const fileNameIv = base64ToArrayBuffer(envelope.fileNameIv);
  const decryptedFileNameBytes = await decryptAesGcm(fileDek, fileNameBytes, fileNameIv);
  const fileName = arrayBufferToString(decryptedFileNameBytes);

  // 3. Decrypt File Payload
  const fileIv = base64ToArrayBuffer(envelope.fileIv);
  const decryptedFileBytes = await decryptAesGcm(fileDek, new Uint8Array(encryptedBytes), fileIv);

  return {
    fileBlob: new Blob([decryptedFileBytes as any], { type: mimeType || 'application/octet-stream' }),
    fileName,
  };
}
