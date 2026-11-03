# ZEROLOCK Database Design & Schemas

## 1. Zero-Knowledge Database Philosophy

The ZEROLOCK database schema is explicitly designed so that:
1. No plaintext note content, title, tags, or file names are stored.
2. No master passwords or raw encryption keys are stored.
3. Every read and mutation is scoped by compound index to the authenticated user ID (`userId`).

---

## 2. Entity Relationship Diagram

```mermaid
erDiagram
    USER ||--o| VAULT : owns
    USER ||--o{ NOTE : creates
    USER ||--o{ ATTACHMENT : uploads
    USER ||--o{ SESSION : establishes
    USER ||--o{ SECURITY_EVENT : triggers
    USER ||--o{ BACKUP : exports
    NOTE ||--o{ ATTACHMENT : contains

    USER {
        ObjectId _id PK
        string name
        string email UK
        string passwordHash
        date createdAt
    }

    VAULT {
        ObjectId _id PK
        ObjectId userId FK
        string salt
        string kdfAlgorithm
        object kdfParameters
        string wrappedVaultKey
        string wrappedVaultKeyIv
        string recoveryWrappedVaultKey
        string recoveryIv
        number vaultVersion
    }

    NOTE {
        ObjectId _id PK
        ObjectId userId FK
        string encryptedContent
        string contentIv
        string encryptedDek
        string dekIv
        string encryptedMetadata
        string metadataIv
        boolean isPinned
        boolean isFavorite
        boolean isArchived
        number version
        date updatedAt
    }

    ATTACHMENT {
        ObjectId _id PK
        ObjectId userId FK
        ObjectId noteId FK
        string fileLocation
        string encryptedFileKey
        string fileKeyIv
        string fileIv
        number fileSize
        string encryptedFileName
        string fileNameIv
        string mimeType
    }
```

---

## 3. Database Indexing Strategy

1. `users.email`: Unique index for $O(1)$ email lookup during authentication.
2. `vaults.userId`: Unique index ensuring exactly one cryptographic vault per user.
3. `notes.{ userId: 1, updatedAt: -1 }`: Compound index optimizing sorting and retrieval of user notes.
4. `sessions.{ expiresAt: 1 }`: MongoDB TTL index for automated background cleanup of expired sessions.
5. `security_events.{ userId: 1, createdAt: -1 }`: Compound index for rapid pagination of audit logs.
