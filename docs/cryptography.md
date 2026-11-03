# ZEROLOCK Cryptographic Specifications & Mathematical Principles

This document details the exact mathematical formulas, standard specifications, and implementation decisions governing the cryptographic primitives utilized in ZEROLOCK.

---

## 1. AES-256-GCM (Galois/Counter Mode)

### Standard: NIST SP 800-38D

AES-256-GCM is an Authenticated Encryption with Associated Data (AEAD) algorithm that delivers confidentiality, integrity, and authenticity in a single operation.

### Mathematical Foundations:
1. **Confidentiality (CTR Mode)**:
   Plaintext $P$ is partitioned into 128-bit blocks $P_1, P_2, \dots, P_n$. Counter values $CB_i$ are derived from the 96-bit Initial Vector (IV) concatenated with a 32-bit incrementing integer:
   $$CB_i = \text{IV} \parallel \text{incr}_{32}(i)$$
   Each counter is encrypted using the 256-bit symmetric key $K$:
   $$C_i = P_i \oplus \text{AES}_K(CB_i)$$

2. **Authenticity & Integrity (GHASH over $GF(2^{128})$)**:
   The authentication tag $T$ is computed over the Additional Authenticated Data (AAD) and the ciphertext using the GHASH polynomial evaluation function in the Galois field $GF(2^{128})$ defined by the irreducible polynomial:
   $$f(x) = x^{128} + x^7 + x^2 + x + 1$$
   $$H = \text{AES}_K(0^{128})$$
   $$T = \text{GHASH}_H(\text{AAD}, C) \oplus \text{AES}_K(\text{IV} \parallel 0^{31}1)$$

### Security Invariants:
- **Nonce Uniqueness**: Nonce collision with the same key catastrophically leaks the XOR of plaintexts and allows forgery of the GHASH hash key $H$. ZEROLOCK eliminates nonce reuse by:
  1. Generating unique per-note DEKs.
  2. Drawing 96 fresh bits from a hardware CSPRNG for every operation.
- **Tampering Resistance**: If an adversary alters any bit of ciphertext $C_i$ or AAD, the computed GHASH tag will not equal $T$. The WebCrypto API unconditionally aborts and throws `DOMException: OperationError`.

---

## 2. Argon2id Key Derivation Function

### Standard: RFC 9106

Argon2 won the Password Hashing Competition (PHC) in 2015 as the premier memory-hard password hashing algorithm.

### Algorithmic Architecture:
Argon2id combines:
- **Argon2d**: Data-dependent memory accesses, providing maximum resistance against GPU/ASIC brute-force cracking rigs.
- **Argon2i**: Data-independent memory indexing, protecting against side-channel cache timing attacks.

### Memory Array Construction:
The memory cost parameter $m = 19,456\text{ KiB}$ forms a two-dimensional matrix of $B[i][j]$ blocks, each 1024 bytes (1 KiB). The state is updated over $t = 3$ time iterations across $p = 1$ parallelism lanes:
$$B[i][j] = G(B[i][j-1], B[i'][j'])$$
Where $G$ is a permutation based on the Blake2b compression function.

### Parameter Justification:
- **Memory Cost ($19\text{ MB}$)**: Enforces that any attacker attempting $1,000,000$ parallel evaluations requires $\sim 19\text{ TB}$ of high-speed ultra-low latency RAM, rendering GPU farms cost-ineffective.
- **Time Cost ($3\text{ passes}$)**: Provides high algebraic mixing while ensuring sub-200ms completion on standard web browser engines.

---

## 3. HKDF (RFC 5869)

HKDF follows the extract-and-expand paradigm:

### Step 1: Extract
Extracts a pseudorandom key (PRK) of fixed length (256 bits) from the input key material (IKM) using salt:
$$\text{PRK} = \text{HMAC-SHA256}(\text{salt}, \text{IKM})$$

### Step 2: Expand
Expands the PRK to the desired key length $L$ using application-specific context info:
$$T(1) = \text{HMAC-SHA256}(\text{PRK}, \text{info} \parallel 0x01)$$
$$\text{OKM} = T(1)$$

### Domain Separation in ZEROLOCK:
- `info = "ZEROLOCK_VAULT_RECOVERY_KEY_V1"`: Derives emergency recovery key.
- `info = "ZEROLOCK_BACKUP_INTEGRITY_V1"`: Derives backup verification key.

This guarantees that exposing one derived key yields zero mathematical information about other derived keys.
