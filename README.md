# ZEROLOCK – Zero-Knowledge Secure Notes & Personal Data Vault

> **"Your Notes. Your Keys. Your Privacy."**  
> *A 7th-Semester VTU Computer Science & Design Cryptography Project*

[![GitHub Repository](https://img.shields.io/badge/GitHub-arpitat09%2FZEROLOCK-181717?logo=github)](https://github.com/arpitat09/ZEROLOCK)
[![Zero-Knowledge](https://img.shields.io/badge/Architecture-Zero--Knowledge-10B981?style=flat&logo=shield)](https://github.com/arpitat09/ZEROLOCK)
[![Cipher: AES-256-GCM](https://img.shields.io/badge/Cipher-AES--256--GCM-3B82F6?style=flat)](https://github.com/arpitat09/ZEROLOCK)
[![KDF: Argon2id RFC 9106](https://img.shields.io/badge/KDF-Argon2id%20(RFC%209106)-8B5CF6?style=flat)](https://github.com/arpitat09/ZEROLOCK)
[![Key Hierarchy: Envelope Encryption](https://img.shields.io/badge/Key%20Hierarchy-Envelope%20Encryption-06B6D4?style=flat)](https://github.com/arpitat09/ZEROLOCK)
[![Tests: 12/12 Passed](https://img.shields.io/badge/Tests-12%2F12%20Passed%20(100%25)-success)](https://github.com/arpitat09/ZEROLOCK)
[![License: MIT](https://img.shields.io/badge/License-MIT-F59E0B.svg)](https://opensource.org/licenses/MIT)

---

## 📑 Table of Contents
1. [Executive Overview](#-executive-overview)
2. [Why ZEROLOCK? (Comparison Matrix)](#-why-zerolock-comparison-matrix)
3. [Cryptographic Architecture](#-cryptographic-architecture)
   - [Key Hierarchy](#1-multi-tier-envelope-encryption-hierarchy)
   - [Cryptographic Primitives](#2-cryptographic-primitives--parameters)
   - [Trust & Boundary Security Model](#3-trust-boundary--threat-model)
4. [Core Features](#-core-features)
5. [Interactive Cryptography Laboratory (12 Live Tests)](#-interactive-cryptography-laboratory)
6. [Tech Stack](#-tech-stack)
7. [Getting Started & Quickstart](#-getting-started--quickstart)
8. [Automated Test Suite](#-automated-test-suite)
9. [REST API Endpoints](#-rest-api-endpoints)
10. [Repository Structure](#-repository-structure)
11. [Production Deployment](#-production-deployment)
12. [VTU Academic Attribution](#-vtu-academic-attribution)

---

## 🔒 Executive Overview

**ZEROLOCK** is a production-grade, privacy-first personal data vault and note-taking platform built to demonstrate the practical application of modern cryptographic algorithms.

Unlike traditional cloud note-taking platforms (such as Evernote, Notion, or Google Keep) where the cloud server holds master keys and processes user thoughts in plaintext, ZEROLOCK enforces an absolute **Zero-Knowledge Architecture**:
- All encryption, key derivation, and decryption occur strictly within the client browser's ephemeral RAM.
- The backend server and MongoDB database **never receive, log, or store** plaintext notes, note titles, tags, master passwords, or raw encryption keys.
- If the database or server infrastructure is compromised, an attacker obtains only cryptographically indistinguishable random ciphertext bytes and authenticated tags.

---

## ⚖️ Why ZEROLOCK? (Comparison Matrix)

| Feature / Security Property | Standard Cloud Notes (Evernote / Notion) | ZEROLOCK (Zero-Knowledge Vault) |
| :--- | :--- | :--- |
| **Encryption Location** | Server-side (at rest only) | **Client-side in browser RAM** (AES-256-GCM) |
| **Server Plaintext Visibility** | Complete access to user notes & metadata | **Zero knowledge** (cryptographically impossible) |
| **Key Derivation (KDF)** | Server bcrypt / plain JWT auth | **RFC 9106 Argon2id WebAssembly** ($19\text{ MB}$, $t=3$, $p=1$) |
| **Metadata Protection** | Titles & tags stored in plaintext for indexing | **Titles, tags & categories 100% encrypted** |
| **Search Architecture** | Server queries plaintext database | **In-memory client-side search** over decrypted RAM |
| **Credential Separation** | Single password for auth and storage | **Dual Credentials**: Account Password $\neq$ Master Password |
| **Master Password Rotation** | N/A (Server holds data keys) | **Instant Vault Key Re-wrapping** ($<10\text{ms}$, 0 note re-uploads) |
| **Emergency Recovery** | Admin password reset backdoors | **256-bit High-Entropy Recovery Phrase** (HKDF unwrap) |
| **Ciphertext Tamper Detection** | Weak or absent checksums | **128-bit GMAC Authentication Tag** verification |

---

## 🛡️ Cryptographic Architecture

### 1. Multi-Tier Envelope Encryption Hierarchy

```
[ Tier 1: User Memorized Secret ]
       Master Password (Never Leaves Client Browser)
              │
              ▼  Argon2id WebAssembly (19 MB RAM, 3 iterations, 128-bit CSPRNG Salt)
[ Tier 2: Key Encryption Key ]
       KEK (256-bit AES-GCM Key, Ephemeral RAM Only)
              │
              ▼  AES-256-GCM Unwrap (Wrapped Vault Key from Server)
[ Tier 3: Master Vault Key ]
       Vault Key (256-bit CSPRNG Symmetric Key, Ephemeral RAM Only)
              │
              ▼  AES-256-GCM Unwrap (Per-Note Wrapped DEKs)
[ Tier 4: Per-Note Data Encryption Keys ]
       Note DEK (256-bit Unique Per Note)
              │
              ▼  AES-256-GCM Decrypt (96-bit CSPRNG IV + 128-bit GMAC Tag)
       Plaintext Note, Metadata, and Attachments in Ephemeral RAM
```

### 2. Cryptographic Primitives & Parameters

* **Symmetric Cipher**: **AES-256-GCM** (NIST SP 800-38D)
  * Key Size: 256 bits ($32$ bytes)
  * Initialization Vector (IV): 96 bits ($12$ bytes) generated via CSPRNG `crypto.getRandomValues()`
  * Authentication Tag: 128 bits ($16$ bytes) Galois Message Authentication Code (GMAC)
  * Guarantee: Authenticated Encryption with Associated Data (AEAD) ensures both confidentiality and integrity. A single bit flip triggers an immediate `OperationError`.
* **Key Derivation Function (KDF)**: **Argon2id** (RFC 9106)
  * Execution: Compiled to WebAssembly (`argon2-browser`) for client-side execution
  * Memory Cost ($m$): $19\text{ MB}$ ($19,456\text{ KB}$)
  * Time Cost ($t$): $3$ iterations
  * Parallelism ($p$): $1$ lane
  * Salt: 128-bit ($16$ bytes) unique cryptographic salt per user
  * Guarantee: Memory-hard defense against GPU, FPGA, and ASIC dictionary attacks.
* **Key Derivation for Recovery**: **HKDF-SHA-256** (RFC 5869)
  * Extracts pseudorandom keys and expands them with domain separation strings (`zerolock-vault-recovery-v1`).
* **Session Authentication**: **bcrypt** ($12$ rounds) on the backend server for identity authentication only; completely isolated from vault encryption keys.

### 3. Trust Boundary & Threat Model

```
┌─────────────────────────────────────────────────────────────┐
│ CLIENT BROWSER (Trusted Execution Environment)               │
│  - Master Password in Volatile RAM                          │
│  - Argon2id Wasm Execution (KEK Derivation)                 │
│  - 256-bit Vault Key in Volatile Memory                     │
│  - AES-256-GCM Encryption / Decryption                      │
│  - In-Memory Decrypted Note Index for Search               │
│  - Auto-Lock Inactivity Timer (Zeroizes RAM on Timeout)     │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / TLS 1.3
                               │ Transmits ONLY:
                               │   - Base64 Ciphertext
                               │   - 96-bit CSPRNG IVs
                               │   - 128-bit GMAC Tags
                               │   - Wrapped Vault Key
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ SERVER & DATABASE (Untrusted Storage Boundary)              │
│  - Express.js REST API                                      │
│  - MongoDB Database                                         │
│  - ZERO access to Master Password                           │
│  - ZERO access to Vault Key or DEKs                         │
│  - ZERO plaintext note bodies, titles, or tags              │
└─────────────────────────────────────────────────────────────┘
```

---

## ✨ Core Features

1. **Dual-Credential Isolation**:
   - **Account Password**: Authenticates session identity via bcrypt; protects against unauthorized API access.
   - **Master Password**: Derives local 256-bit KEK via Argon2id; never leaves client RAM; never sent over HTTP.
2. **Encrypted Rich-Text Editor**:
   - Powered by TipTap with real-time formatting (bold, italic, code blocks, checklists, quotes).
   - Live Raw Ciphertext Inspector: Inspect the 256-bit ciphertext, IV, and auth tag generated in RAM.
3. **Encrypted Attachments**:
   - Files are encrypted client-side using unique AES-256-GCM keys before transmission.
   - Decrypted and reconstructed on-demand in browser memory as object URLs.
4. **Client-Side In-Memory Search**:
   - Fast full-text search across titles, contents, and tags executed entirely in memory.
   - Server never receives search queries, eliminating metadata leakage.
5. **Instant Master Password Rotation**:
   - Changing the master password derives a new KEK and re-wraps only the 32-byte Vault Key ($<10\text{ms}$).
   - All existing note ciphertexts remain completely valid without re-encrypting or re-uploading gigabytes of data.
6. **Emergency Recovery System**:
   - Generates a 256-bit high-entropy emergency recovery phrase during registration.
   - Derives a secondary recovery key via HKDF-SHA-256 to unwrap the Vault Key if the master password is lost.
7. **Offline Encrypted Backup & Restore**:
   - Exports the entire vault into an AES-256-GCM encrypted JSON file with SHA-256 integrity checksums.
8. **Security Audit Center**:
   - Real-time logging of authentication events, IP addresses, rate-limiting violations, and key rotation events.
   - Auto-lock timer: Automatically wipes decrypted keys and plaintext from RAM after inactivity.

---

## 🔬 Interactive Cryptography Laboratory

Navigate to **`/crypto-lab`** in the web application to access the interactive verification suite built for academic demonstration:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                  ZEROLOCK INTERACTIVE CRYPTOGRAPHY LAB                       │
├────┬──────────────────────────────────────┬──────────────────────────────────┤
│ #  │ Verification Test                    │ Cryptographic Guarantee Checked  │
├────┼──────────────────────────────────────┼──────────────────────────────────┤
│ 01 │ AES-256-GCM Encryption Roundtrip     │ Plaintext → IV → Ciphertext      │
│ 02 │ AES-256-GCM Decryption Verification  │ Decrypted text == Plaintext      │
│ 03 │ Wrong-Key Decryption Failure         │ Authentication tag GMAC mismatch │
│ 04 │ Bit-Flip Tamper Detection            │ 1-bit corrupted ciphertext catch │
│ 05 │ 96-bit Nonce Collision Resistance    │ 1,000 CSPRNG IVs with 0 overlap  │
│ 06 │ Argon2id Memory-Hard KDF Benchmark   │ 19 MB RAM execution measurement  │
│ 07 │ HKDF-SHA-256 Domain Separation       │ Distinct keys from same secret   │
│ 08 │ SHA-256 Avalanche Effect Check       │ >50% bit flip on 1-character mod │
│ 09 │ Database Zero-Plaintext Audit        │ Verifies 0 plaintext in MongoDB  │
│ 10 │ Cross-User Tenant Isolation (IDOR)   │ Rejects cross-user data fetches  │
│ 11 │ Plaintext Network Leakage Audit      │ Validates 0 plaintext payloads   │
│ 12 │ Dual-Credential Independence Test    │ Ensures Account Pass != Master   │
└────┴──────────────────────────────────────┴──────────────────────────────────┘
```
*Export academic verification JSON reports directly from the interface for evaluation!*

---

## 💻 Tech Stack

### Frontend:
* **Framework**: React 18 with TypeScript
* **Build Tool**: Vite 5
* **Styling**: Tailwind CSS (Cybersecurity Dark Theme `#090B10`, `#151B26`, `#A78BFA`, `#22D3EE`)
* **Icons**: Lucide React
* **Typography**: Space Grotesk (Headings), Inter (Body), JetBrains Mono (Code & Hashes)
* **Rich Text**: TipTap StarterKit with TaskList extensions
* **State Management**: React Context (`AuthContext`, `VaultContext`, `ToastContext`)
* **Data Fetching**: TanStack React Query

### Cryptography (Client-Side):
* **Web Crypto API**: Native browser `crypto.subtle` for AES-256-GCM, HKDF-SHA-256, SHA-256
* **Argon2id**: WebAssembly RFC 9106 implementation (`argon2-browser`)
* **Entropy**: Browser CSPRNG `crypto.getRandomValues()`

### Backend:
* **Runtime**: Node.js v20+ with TypeScript
* **Framework**: Express.js
* **Security Middleware**: Helmet, CORS, Express Rate Limit
* **Validation**: Zod Schemas
* **Authentication**: JSON Web Tokens (JWT) + bcrypt ($12$ rounds)
* **Database**: MongoDB with Mongoose
* **Zero-Setup Database**: Automatic fallback to embedded `MongoMemoryServer` if local MongoDB is not running!

---

## ⚡ Getting Started & Quickstart

### Prerequisites:
- **Node.js**: v20.x or higher
- **npm**: v10.x or higher

### 1. Clone the Repository
```bash
git clone https://github.com/arpitat09/ZEROLOCK.git
cd ZEROLOCK
```

### 2. Install Monorepo Dependencies
```bash
npm install
```

### 3. Build Shared Packages
```bash
npm run build:shared
```

### 4. Run Development Servers (Single Command)
```bash
npm run dev
```
*Starts both backend and frontend concurrently:*
* **Frontend Web Application**: [http://localhost:3000](http://localhost:3000)
* **Backend REST API**: [http://localhost:5000](http://localhost:5000)

> **Zero-Config Database**: If a local MongoDB instance is running on `mongodb://localhost:27017/zerolock`, the backend connects to it automatically. If not found, it automatically starts an in-memory database (**`MongoMemoryServer`**) so the entire application runs with **zero database configuration required**!

---

## 🧪 Automated Test Suite

ZEROLOCK includes an automated Vitest test suite verifying all cryptographic properties and REST API security boundaries.

Run the test suite:
```bash
npm run test --workspace=backend
```

### Sample Output:
```
 ✓ tests/crypto.test.ts (5)
   ✓ generates a 256-bit AES-GCM key and encrypts/decrypts correctly
   ✓ rejects decryption when ciphertext is tampered (bit-flip detection)
   ✓ rejects decryption when wrong key is provided
   ✓ verifies HKDF-SHA-256 domain separation
   ✓ generates 1,000 distinct IVs with zero collisions

 ✓ tests/api.test.ts (7)
   ✓ registers User A with account password (never sends master password)
   ✓ registers User B for tenancy isolation tests
   ✓ stores User A vault envelope (Argon2id salt + wrapped vault key)
   ✓ creates an encrypted note for User A (zero plaintext fields)
   ✓ rejects User B from accessing User A note (Cross-User / IDOR Protection)
   ✓ allows User A to fetch their encrypted note
   ✓ rotates User A vault key without affecting note ciphertexts

 Test Files  2 passed (2)
      Tests  12 passed (12)
   Duration  4.26s
   Pass Rate 100%
```

---

## 📡 REST API Endpoints

All endpoints enforce JWT authentication (except registration & login). Plaintext note titles and bodies are strictly rejected by input validation schemas.

| Method | Endpoint | Description | Zero-Knowledge Invariant |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register account identity | Receives Account Pass only; Master Pass is never sent |
| `POST` | `/api/auth/login` | Authenticate account session | Issues HTTP JWT; Vault remains locked until client KDF |
| `GET` | `/api/vault/envelope` | Fetch wrapped vault key | Returns wrapped key + Argon2id salt |
| `POST` | `/api/vault/setup` | Store wrapped vault key | Client wraps 256-bit Vault Key with KEK before upload |
| `PUT` | `/api/vault/wrapped-key`| Rotate master password | Updates wrapped Vault Key; existing note ciphertexts unchanged |
| `GET` | `/api/notes` | List user notes | Returns encrypted note DTOs (ciphertext, IVs, auth tags) |
| `POST` | `/api/notes` | Create encrypted note | Server receives only ciphertext; 0 plaintext fields accepted |
| `GET` | `/api/notes/:id` | Get single note | Enforces tenancy boundaries (IDOR protection) |
| `PUT` | `/api/notes/:id` | Update encrypted note | Overwrites encrypted payload and updates version |
| `DELETE`| `/api/notes/:id` | Delete encrypted note | Permanently removes note and associated attachments |
| `POST` | `/api/attachments/upload`| Upload file | Receives client-encrypted binary chunks |
| `GET` | `/api/security/events` | Audit security log | Lists authentication attempts, IP logs, and key rotations |
| `GET` | `/api/backups/export` | Export vault snapshot | Downloads encrypted JSON backup bundle |

---

## 📂 Repository Structure

```
ZEROLOCK/
├── frontend/                     # React 18 + Vite + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── crypto/               # WebCrypto, Argon2id Wasm, envelope, recovery, backup
│   │   ├── context/              # AuthContext, VaultContext, ToastContext
│   │   ├── components/           # UI design system, note cards, TipTap editor, modals
│   │   ├── pages/                # Dashboard, Notes, NoteEditor, Attachments, CryptoLab,
│   │   │                         # SecurityCenter, RecoveryCenter, Settings, Auth
│   │   └── services/             # Typed REST API service client
│   ├── package.json
│   └── vite.config.ts
├── backend/                      # Node.js + Express + TypeScript + Mongoose
│   ├── src/
│   │   ├── controllers/          # auth, vault, notes, attachments, security, backup
│   │   ├── middleware/           # authGuard, rateLimiter, errorHandler, validator
│   │   ├── models/               # User, Vault, Note, Attachment, Session, SecurityEvent
│   │   ├── routes/               # Modular REST routes
│   │   └── server.ts             # Express server entrypoint & MongoDB auto-connector
│   ├── tests/                    # Vitest cryptographic tests & API security integration
│   └── package.json
├── shared/                       # Shared TypeScript interfaces & DTO schemas
│   ├── src/                      # DecryptedNote, EncryptedNoteDTO, VaultDTO, CryptoContracts
│   └── package.json
├── docs/                         # Comprehensive VTU Academic Deliverables
│   ├── vtu-project-report.md     # Complete 27-chapter academic project report
│   ├── architecture.md           # System component diagrams & data flows
│   ├── cryptography.md           # Mathematical formulas & cryptographic specifications
│   ├── database-design.md        # Schema diagrams & zero-knowledge invariants
│   ├── security-model.md         # Threat modeling, attack vectors & mitigations
│   ├── testing-report.md         # Automated test execution report
│   └── api-documentation.md      # Complete REST API schemas & endpoints
├── package.json                  # Root monorepo workspace configuration
└── README.md                     # System documentation & quickstart manual
```

---

## 🚀 Production Deployment

### Backend (Render / Railway / DigitalOcean):
```bash
npm run build:shared
npm run build:backend
node backend/dist/server.js
```
*Configure environment variables:*
- `PORT=5000`
- `MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/zerolock`
- `JWT_SECRET=<64-character-cryptographically-random-secret>`
- `CLIENT_URL=https://your-frontend-domain.com`

### Frontend (Vercel / Netlify / Cloudflare Pages):
```bash
npm run build:frontend
```
*Deploy the generated `frontend/dist` directory.* Set `VITE_API_BASE=https://your-backend-domain.com`.

---

## 🎓 VTU Academic Attribution

* **Institution**: Visvesvaraya Technological University (VTU), Belagavi, Karnataka
* **Degree**: Bachelor of Engineering (B.E.)
* **Department**: Computer Science and Design
* **Semester**: 7th Semester
* **Subject**: Cryptography & Network Security Laboratory Project
* **Author / GitHub**: [@arpitat09](https://github.com/arpitat09)
* **Project Repository**: [https://github.com/arpitat09/ZEROLOCK](https://github.com/arpitat09/ZEROLOCK)

---

<p align="center">
  <b>ZEROLOCK – True Zero-Knowledge Personal Data Vault</b><br>
  <i>Designed and developed for 7th-Semester VTU Computer Science & Design Cryptography Project.</i>
</p>
