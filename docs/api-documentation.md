# ZEROLOCK REST API Reference

Base URL: `/api`

All endpoints return JSON responses conforming to the standard wrapper:
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message",
  "error": "Optional error string"
}
```

---

## 1. Authentication Endpoints (`/api/auth`)

### `POST /api/auth/register`
Creates a new user account.
- **Request Body**:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "AccountPassword123!"
  }
  ```
- **Response**: `201 Created` with user info and session JWT. Sets `token` HttpOnly cookie.

### `POST /api/auth/login`
Authenticates user identity.
- **Request Body**:
  ```json
  {
    "email": "jane@example.com",
    "password": "AccountPassword123!"
  }
  ```
- **Response**: `200 OK` with user profile, session token, and `vaultStatus.isConfigured`.

### `POST /api/auth/logout`
Revokes active session and clears cookie. Requires authentication.

### `GET /api/auth/me`
Fetches current session user profile. Requires authentication.

### `POST /api/auth/change-password`
Changes account authentication password without altering vault keys.

---

## 2. Vault Key Management (`/api/vault`)

### `POST /api/vault/setup`
Configures a fresh zero-knowledge cryptographic vault.
- **Request Body**:
  ```json
  {
    "salt": "<Base64 16-byte random salt>",
    "kdfAlgorithm": "argon2id",
    "kdfParameters": {
      "memoryCost": 19456,
      "timeCost": 3,
      "parallelism": 1,
      "hashLength": 32
    },
    "wrappedVaultKey": "<Base64 AES-256-GCM wrapped key>",
    "wrappedVaultKeyIv": "<Base64 12-byte IV>",
    "recoveryWrappedVaultKey": "<Optional Base64 recovery-wrapped key>",
    "recoveryIv": "<Optional Base64 12-byte recovery IV>"
  }
  ```

### `GET /api/vault/metadata`
Retrieves public salt, KDF parameters, and wrapped ciphertexts required for client-side unsealing.

### `PUT /api/vault/wrapped-key`
Rotates master password by saving re-wrapped Vault Key under a new KEK.

### `GET /api/vault/recovery-status`
Returns whether an emergency recovery key is configured.

---

## 3. Encrypted Notes (`/api/notes`)

### `GET /api/notes`
Lists all encrypted notes belonging to the authenticated user.
- **Query Params**: `?pinned=true`, `?favorite=true`, `?archived=true`
- **Response**: Array of `EncryptedNoteDTO` (Zero plaintext).

### `POST /api/notes`
Persists a client-side encrypted note.
- **Request Body**:
  ```json
  {
    "encryptedContent": "<Base64 Ciphertext>",
    "contentIv": "<Base64 IV>",
    "encryptedDek": "<Base64 Wrapped Note DEK>",
    "dekIv": "<Base64 IV>",
    "encryptedMetadata": "<Base64 Ciphertext of title & tags>",
    "metadataIv": "<Base64 IV>",
    "isPinned": false,
    "isFavorite": false,
    "isArchived": false
  }
  ```

### `GET /api/notes/:id`
Retrieves an encrypted note by ID. Enforces query-level tenant ownership.

### `PUT /api/notes/:id`
Updates an encrypted note with optimistic concurrency check (`expectedVersion`).

### `DELETE /api/notes/:id`
Permanently deletes an encrypted note.

---

## 4. Encrypted Attachments (`/api/attachments`)

- `POST /api/attachments`: Uploads encrypted binary blob with envelope metadata.
- `GET /api/attachments`: Lists user's encrypted attachments.
- `GET /api/attachments/:id/download`: Streams encrypted file bytes to client for browser-side decryption.
- `DELETE /api/attachments/:id`: Deletes attachment record and disk blob.

---

## 5. Security & Sessions (`/api/security`)

- `GET /api/security/sessions`: Lists active sessions with device information and IP.
- `DELETE /api/security/sessions/:id`: Revokes an active session.
- `GET /api/security/events`: Retrieves the 50 most recent immutable security audit events.

---

## 6. Encrypted Backups (`/api/backups`)

- `POST /api/backups`: Stores an encrypted JSON backup bundle with SHA-256 checksum.
- `GET /api/backups`: Lists backups.
- `GET /api/backups/:id`: Downloads encrypted backup bundle.
