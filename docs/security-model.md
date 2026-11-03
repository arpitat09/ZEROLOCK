# ZEROLOCK Formal Security Model & Threat Assessment

## 1. Trust Boundaries & Assumptions

### Trusted Entities:
- **Client Endpoint Hardware**: The user's physical machine, operating system kernel, CPU, and official browser execution environment.
- **Client Ephemeral RAM**: Memory containing unsealed keys during an active user session.

### Untrusted Entities:
- **Application Server (Node.js/Express)**: Considered semi-honest (honest-but-curious). The server executes business logic and routes ciphertexts accurately, but might inspect or leak all transmitted payloads.
- **Database (MongoDB)**: Assumed to be completely untrusted or publicly readable by adversaries.
- **Network / Internet**: Public transport layer subject to eavesdropping, packet inspection, or active man-in-the-middle (MITM) adversaries.

---

## 2. Core Security Invariants

1. **Zero-Knowledge Data Confidentiality**:
   $$\forall \text{ notes } N, \quad \Pr[\mathcal{A}(\text{ServerDB}) \to \text{Plaintext}(N)] \le \frac{1}{2^{256}} + \text{negl}(\lambda)$$
2. **Deterministic Authentication Decoupling**:
   $$\text{Password}_{\text{Account}} \cap \text{Password}_{\text{Master}} = \emptyset$$
   The server has no algorithmic procedure to derive the KEK from the stored `passwordHash`.
3. **Cryptographic Integrity & Authenticity**:
   $$\Pr[\mathcal{A} \text{ forges } (C', T') \text{ s.t. } \text{Decrypt}(K, C', T') \ne \bot] \le \frac{1}{2^{128}}$$

---

## 3. Defense-in-Depth Implementation

- **Strict Content Security Policy (CSP)**: Disallows unauthorized external scripts; permits only self-hosted WebAssembly execution.
- **HttpOnly & SameSite Cookies**: Mitigates Cross-Site Scripting (XSS) session token theft and Cross-Site Request Forgery (CSRF).
- **Express Rate Limiting**: Mitigates distributed credential stuffing and brute-force attacks against `/api/auth/*` endpoints.
- **Zod Strict Payload Parsing**: Prevents prototype pollution, NoSQL injection (`$where`, `$gt` queries), and parameter tampering.
- **Volatile Key Management**: Keys are never written to `localStorage`, `sessionStorage`, or `IndexedDB`. Auto-lock timers clear references on user inactivity.

---

## 4. Academic Limitations Disclosure

Per rigorous cryptographic design standards:
- **Compromised Host Boundary**: If an attacker gains administrative control of the web server delivering the JavaScript bundle, they could modify the delivered code to log keystrokes or exfiltrate the Master Password before hashing.
- **Endpoint Keylogger Boundary**: If an attacker installs operating system-level malware on the client, zero-knowledge web encryption cannot defend against hardware-level capture.
