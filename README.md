# ZEROLOCK – Zero-Knowledge Secure Notes & Personal Data Vault

> **"Your Notes. Your Keys. Your Privacy."**  
> *A 7th-Semester VTU Computer Science & Design Cryptography Project*

[![Zero-Knowledge](https://img.shields.io/badge/Security-Zero--Knowledge-brightgreen)](#)
[![Algorithm](https://img.shields.io/badge/Cipher-AES--256--GCM-blue)](#)
[![KDF](https://img.shields.io/badge/KDF-Argon2id%20(RFC%209106)-purple)](#)
[![Architecture](https://img.shields.io/badge/Hierarchy-Envelope%20Encryption-cyan)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🔒 Executive Overview

**ZEROLOCK** is a production-grade, privacy-first personal data vault and note-taking platform built to demonstrate the practical application of modern cryptographic algorithms.

Unlike traditional cloud note-taking platforms (such as Evernote, Notion, or Google Keep) where the cloud server holds master keys and processes user thoughts in plaintext, ZEROLOCK enforces an absolute **Zero-Knowledge Architecture**:
- All encryption, key derivation, and decryption occur strictly within the client browser's ephemeral RAM.
- The backend server and MongoDB database **never receive, log, or store** plaintext notes, master passwords, or raw encryption keys.
- If the database or server is completely breached, attackers obtain only cryptographically indistinguishable random ciphertext bytes.

---

## 🛡️ Core Cryptographic Architecture

```
[ Tier 1: User Memorized Secret ]
       Master Password (Never Leaves Client)
              │
              ▼  Argon2id WebAssembly (19 MB RAM, 3 iterations, 128-bit Salt)
[ Tier 2: Key Encryption Key ]
       KEK (256-bit AES Key, Volatile RAM)
              │
              ▼  AES-256-GCM Unwrap (Wrapped Vault Key)
[ Tier 3: Master Vault Key ]
       Vault Key (256-bit Random Key, Volatile RAM)
              │
              ▼  AES-256-GCM Unwrap (Wrapped Note DEKs)
[ Tier 4: Per-Note Data Encryption Keys ]
       Note DEK (256-bit Unique Per Note)
              │
              ▼  AES-256-GCM Decrypt (96-bit CSPRNG IV)
       Plaintext Note & Metadata (Title & Tags in RAM)
```

### Key Security Invariants:
1. **Dual-Credential Isolation**: Account Password authenticates session identity via bcrypt; Master Password unlocks the vault locally via Argon2id.
2. **Authenticated Symmetric Encryption**: AES-256-GCM with 128-bit GMAC authentication tags and 96-bit unique nonces. Any bit mutation fails decryption.
3. **Encrypted Metadata**: Note titles, tags, and categories are encrypted before transmission.
4. **Client-Side Search**: Encrypted records are decrypted in browser memory; search queries never hit the network.
5. **Instant Key Rotation**: Master password rotation re-wraps only the 32-byte Vault Key, preserving all existing note DEKs without re-uploading data.
6. **Emergency Recovery**: 256-bit high-entropy recovery phrase unseals the Vault Key via HKDF-SHA-256 without server backdoors.
7. **Interactive Cryptography Lab**: Real-time demonstration suite with 12 interactive tests (tamper detection, IV collision checks, KDF benchmarks).

---

## ⚡ Quickstart & Installation

### Prerequisites:
- Node.js v20.x or higher
- npm v10.x or higher
- Modern web browser (Chrome, Firefox, Safari, Edge)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/arpita/ZEROLOCK.git
cd ZEROLOCK
npm install
```

### 2. Build Shared Types & Packages
```bash
npm run build:shared
```

### 3. Start Development Servers
```bash
# Terminal 1: Start Backend (Port 5000 with auto-MongoMemoryServer fallback)
npm run dev:backend

# Terminal 2: Start Frontend (Port 3000)
npm run dev:frontend
```
*Note: If no `MONGODB_URI` is specified in `.env`, the backend automatically launches an embedded in-memory MongoDB instance for seamless zero-setup execution!*

Open your browser at: **`http://localhost:3000`**

---

## 🧪 Running Automated Tests

Run the full suite of cryptographic unit tests and API integration tests:
```bash
npm run test --workspace=backend
```

### Test Suite Coverage:
- **AES-256-GCM Roundtrip**: Encryption and decryption correctness.
- **Bit-Flip Tampering**: Automatic rejection upon 1-bit ciphertext corruption.
- **Wrong-Key Decryption**: Immediate authentication tag mismatch failure.
- **Nonce Collision Resistance**: 1,000 CSPRNG vectors with 0 collisions.
- **HKDF Domain Separation**: Orthogonal subkey generation for recovery vs backups.
- **Zero-Plaintext Database Proof**: Confirms zero plaintext fields in MongoDB records.
- **Cross-User Access Control**: Prevents unauthorized note inspection (IDOR protection).
- **Master Password Rotation**: Successful key re-wrapping without data re-upload.

---

## 🔬 Interactive Cryptography Laboratory

Navigate to **`/crypto-lab`** in the application to access the interactive test suite designed for the VTU Cryptography examination:
1. AES-256-GCM Encryption (Plaintext → IV → Ciphertext + GMAC Tag).
2. AES-256-GCM Decryption (Decrypted equality check).
3. Wrong-Key Decryption Failure (GMAC mismatch catch).
4. Bit-Flip Ciphertext Tampering Detection.
5. 96-bit Nonce Uniqueness Verification (1,000 samples).
6. Argon2id Memory-Hard KDF Benchmark (19 MB RAM).
7. HKDF-SHA-256 Domain Separation.
8. SHA-256 Avalanche Effect Verification.
9. Database Zero-Plaintext Audit.
10. Cross-User Record Boundary Isolation.
11. Plaintext Network Leakage Audit.
12. Dual-Credential Independence Verification.

Export academic JSON reports directly from the interface for lab evaluation!

---

## 📂 Project Directory Structure

```
ZEROLOCK/
├── frontend/               # React 18, Vite, TypeScript, Tailwind CSS, TipTap
│   ├── src/
│   │   ├── components/     # UI design system, note cards, modals, badges
│   │   ├── crypto/         # WebCrypto AES-GCM, Argon2id, envelope, recovery
│   │   ├── context/        # AuthContext, VaultContext, ToastContext
│   │   ├── pages/          # Landing, Register, Login, Unlock, Dashboard, Notes,
│   │   │                   # Editor, Attachments, Security, Recovery, Settings, CryptoLab
│   │   └── services/       # Typed REST API client
├── backend/                # Express.js, TypeScript, Mongoose, Helmet, Zod
│   ├── src/
│   │   ├── controllers/    # auth, vault, notes, attachments, security, backup
│   │   ├── middleware/     # authGuard, rateLimiter, errorHandler, validate
│   │   ├── models/         # User, Vault, Note, Attachment, Session, SecurityEvent
│   │   ├── routes/         # Modular REST routers
│   │   └── server.ts       # Application entrypoint
│   └── tests/              # Vitest cryptographic & integration tests
├── shared/                 # Shared TypeScript interfaces & DTO contracts
├── docs/                   # Complete VTU 7th-Semester Academic Documentation
│   ├── vtu-project-report.md  # 27-chapter complete VTU project report
│   ├── architecture.md        # Technical architecture & key hierarchy
│   ├── cryptography.md        # Detailed mathematical specification
│   ├── database-design.md     # Zero-knowledge schemas & indexes
│   ├── security-model.md      # Formal threat model & boundary assessment
│   ├── testing-report.md      # Test suite audit & verification report
│   └── api-documentation.md   # Complete REST API specification
├── package.json            # Monorepo workspaces
└── README.md
```

---

## 🚀 Deployment Guide

### Backend (Render / Railway / DigitalOcean):
- Build command: `npm run build:shared && npm run build:backend`
- Start command: `node backend/dist/server.js`
- Set environment variables from `.env.example`, including MongoDB Atlas URI and secure JWT secrets.

### Frontend (Vercel / Netlify / Cloudflare Pages):
- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`
- Configure environment variable `VITE_API_BASE` or proxy rules for production.

---

## 🎓 Academic Attribution

- **University**: Visvesvaraya Technological University (VTU), Belagavi, Karnataka
- **Degree**: Bachelor of Engineering (B.E.)
- **Department**: Computer Science and Design
- **Semester**: 7th Semester
- **Subject**: Cryptography Laboratory & Project
