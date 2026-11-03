// Shared Types and Interfaces for ZEROLOCK

// User & Authentication Types
export interface UserDTO {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface AuthResponse {
  user: UserDTO;
  token?: string; // JWT token when not purely cookie-based
  vaultStatus: {
    isConfigured: boolean;
    vaultVersion?: number;
  };
}

// Key Derivation & Vault Metadata
export type KdfAlgorithm = 'argon2id' | 'pbkdf2';

export interface KdfParameters {
  memoryCost: number; // in KiB (e.g., 65536 = 64MB or 19456 = 19MB)
  timeCost: number;   // iterations (e.g., 3 or 4)
  parallelism: number; // threads (e.g., 1 or 4)
  hashLength: number;  // derived key length in bytes (32 = 256 bits)
}

export interface VaultMetadataDTO {
  salt: string; // Base64 or Hex encoded salt
  kdfAlgorithm: KdfAlgorithm;
  kdfParameters: KdfParameters;
  wrappedVaultKey: string;     // Base64 ciphertext of AES-256-GCM wrapped vault key
  wrappedVaultKeyIv: string;   // Base64 96-bit IV
  recoveryWrappedVaultKey?: string; // Optional recovery-wrapped vault key
  recoveryIv?: string;
  vaultVersion: number;
  updatedAt: string;
}

export interface VaultSetupRequest {
  salt: string;
  kdfAlgorithm: KdfAlgorithm;
  kdfParameters: KdfParameters;
  wrappedVaultKey: string;
  wrappedVaultKeyIv: string;
  recoveryWrappedVaultKey?: string;
  recoveryIv?: string;
}

export interface VaultRotateKeyRequest {
  salt: string;
  kdfAlgorithm: KdfAlgorithm;
  kdfParameters: KdfParameters;
  wrappedVaultKey: string;
  wrappedVaultKeyIv: string;
  recoveryWrappedVaultKey?: string;
  recoveryIv?: string;
}

// Encrypted Notes
export interface EncryptedNoteDTO {
  id: string;
  userId: string;
  encryptedContent: string;    // Base64 ciphertext of note body
  contentIv: string;           // Base64 96-bit IV
  encryptedDek: string;        // Base64 ciphertext of Note DEK wrapped with Vault Key
  dekIv: string;               // Base64 96-bit IV
  encryptedMetadata: string;   // Base64 ciphertext of JSON-stringified { title, tags, category }
  metadataIv: string;          // Base64 96-bit IV
  encryptionVersion: number;
  isPinned: boolean;
  isFavorite: boolean;
  isArchived: boolean;
  version: number;             // Optimistic concurrency control counter
  createdAt: string;
  updatedAt: string;
}

export interface CreateEncryptedNoteRequest {
  encryptedContent: string;
  contentIv: string;
  encryptedDek: string;
  dekIv: string;
  encryptedMetadata: string;
  metadataIv: string;
  encryptionVersion?: number;
  isPinned?: boolean;
  isFavorite?: boolean;
  isArchived?: boolean;
}

export interface UpdateEncryptedNoteRequest {
  encryptedContent: string;
  contentIv: string;
  encryptedDek: string;
  dekIv: string;
  encryptedMetadata: string;
  metadataIv: string;
  encryptionVersion?: number;
  isPinned?: boolean;
  isFavorite?: boolean;
  isArchived?: boolean;
  expectedVersion?: number;
}

// Client-Side Decrypted Note Representations (in browser memory only)
export interface DecryptedMetadata {
  title: string;
  tags: string[];
  category?: string;
}

export interface DecryptedNote {
  id: string;
  title: string;
  content: string; // TipTap HTML or markdown
  tags: string[];
  category?: string;
  isPinned: boolean;
  isFavorite: boolean;
  isArchived: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

// Encrypted Attachments
export interface EncryptedAttachmentDTO {
  id: string;
  userId: string;
  noteId?: string;
  fileLocation: string;
  encryptedFileKey: string; // Base64 wrapped with Vault Key
  fileKeyIv: string;
  fileIv: string;           // IV used to encrypt file payload
  fileSize: number;         // Size in bytes of ciphertext
  encryptedFileName: string;// Base64 encrypted filename
  fileNameIv: string;
  mimeType: string;
  createdAt: string;
}

export interface CreateEncryptedAttachmentDTO {
  noteId?: string;
  encryptedFileKey: string;
  fileKeyIv: string;
  fileIv: string;
  fileSize: number;
  encryptedFileName: string;
  fileNameIv: string;
  mimeType: string;
}

// Security, Sessions & Audit
export interface SessionDTO {
  id: string;
  userId: string;
  deviceInformation: string;
  ipAddress?: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export interface SecurityEventDTO {
  id: string;
  userId: string;
  eventType: 'LOGIN' | 'FAILED_LOGIN' | 'LOGOUT' | 'VAULT_SETUP' | 'VAULT_UNLOCK' | 'VAULT_LOCK' | 'KEY_ROTATION' | 'RECOVERY_SETUP' | 'RECOVERY_USED' | 'PASSWORD_CHANGE' | 'SESSION_REVOKED';
  timestamp: string;
  deviceInformation: string;
  ipAddress?: string;
  status: 'SUCCESS' | 'FAILURE' | 'WARNING';
  details?: string;
}

// Encrypted Backup
export interface EncryptedBackupBundle {
  formatVersion: 'zerolock-v1';
  exportedAt: string;
  vaultMetadata: VaultMetadataDTO;
  notes: EncryptedNoteDTO[];
  attachments: EncryptedAttachmentDTO[];
  checksumSha256: string; // SHA-256 of the combined encrypted payload
}

// Standard API Response
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
