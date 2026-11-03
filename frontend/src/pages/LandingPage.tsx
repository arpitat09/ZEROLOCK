import React from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  Lock,
  Key,
  Database,
  Cpu,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Terminal,
  FileCheck,
  RefreshCw,
  Search,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-bg-main text-txt-main flex flex-col selection:bg-accent-primary/20 selection:text-accent-primary">
      {/* Top Header */}
      <header className="border-b border-border-dark/60 bg-bg-main/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between max-w-7xl w-full mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-primary/10 border border-accent-primary/30 flex items-center justify-center text-accent-primary shadow-glow-primary">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <span className="font-heading font-bold text-xl tracking-wider text-txt-main">ZEROLOCK</span>
            <span className="text-[10px] block font-mono text-accent-secondary uppercase tracking-widest -mt-1">
              Zero-Knowledge Vault
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/crypto-lab">
            <Button variant="ghost" size="sm" icon={<Terminal className="w-4 h-4 text-accent-secondary" />}>
              Crypto Lab
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="secondary" size="sm">
              Sign In
            </Button>
          </Link>
          <Link to="/register">
            <Button variant="primary" size="sm" icon={<ArrowRight className="w-4 h-4" />}>
              Get Started
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-6 max-w-5xl mx-auto text-center flex flex-col items-center">
        <Badge variant="cyan" size="md" className="mb-6 font-mono">
          VTU 7th-Semester Computer Science & Design Project
        </Badge>

        <h1 className="text-4xl md:text-6xl font-bold font-heading tracking-tight leading-tight mb-6">
          Your Thoughts Belong to You.{' '}
          <span className="bg-gradient-to-r from-accent-primary via-accent-secondary to-status-success bg-clip-text text-transparent">
            Not the Server.
          </span>
        </h1>

        <p className="text-lg md:text-xl text-txt-secondary max-w-3xl mb-10 leading-relaxed">
          Experience private note-taking powered by client-side envelope encryption and zero-knowledge security
          architecture. Plaintext notes, master passwords, and raw keys never leave your browser.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link to="/register">
            <Button size="lg" variant="primary" icon={<Shield className="w-5 h-5" />}>
              Create Secure Vault
            </Button>
          </Link>
          <a href="#how-it-works">
            <Button size="lg" variant="secondary">
              Learn How It Works
            </Button>
          </a>
          <Link to="/crypto-lab">
            <Button size="lg" variant="outline" icon={<Terminal className="w-5 h-5" />}>
              Explore Crypto Lab
            </Button>
          </Link>
        </div>
      </section>

      {/* Architecture Interactive Flow Section */}
      <section id="how-it-works" className="py-16 px-6 max-w-6xl mx-auto w-full">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold font-heading mb-3">
            How Zero-Knowledge Architecture Works
          </h2>
          <p className="text-txt-secondary text-sm max-w-2xl mx-auto">
            ZEROLOCK decouples user identity authentication from data decryption. Here is the exact cryptographic data flow.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Step 1: Client Browser */}
          <Card className="border-accent-primary/40 bg-bg-card/90 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono text-accent-primary font-bold">CLIENT BROWSER (RAM ONLY)</span>
                <Cpu className="w-5 h-5 text-accent-primary" />
              </div>
              <h3 className="text-base font-semibold text-txt-main mb-2">1. Local Key Derivation</h3>
              <p className="text-xs text-txt-secondary leading-relaxed mb-4">
                You enter your Master Password. WebAssembly executes <strong>Argon2id</strong> (19MB RAM, 3 iterations) to derive a 256-bit Key Encryption Key (KEK).
              </p>
              <div className="bg-bg-secondary p-3 rounded-lg border border-border-dark font-mono text-[11px] text-accent-secondary">
                Master Password → Argon2id → KEK (256-bit)
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-border-dark/60 text-[11px] text-status-success flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Password never sent to network
            </div>
          </Card>

          {/* Step 2: Envelope Encryption */}
          <Card className="border-accent-secondary/40 bg-bg-card/90 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono text-accent-secondary font-bold">ENVELOPE ENCRYPTION</span>
                <Lock className="w-5 h-5 text-accent-secondary" />
              </div>
              <h3 className="text-base font-semibold text-txt-main mb-2">2. AES-256-GCM Encryption</h3>
              <p className="text-xs text-txt-secondary leading-relaxed mb-4">
                The KEK unwraps your Vault Key. For every note, a unique 256-bit Data Encryption Key (DEK) and 96-bit CSPRNG IV are generated to encrypt both content and metadata.
              </p>
              <div className="bg-bg-secondary p-3 rounded-lg border border-border-dark font-mono text-[11px] text-accent-primary">
                Note Content + DEK → AES-256-GCM Ciphertext
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-border-dark/60 text-[11px] text-status-success flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> 128-bit authentication tag verification
            </div>
          </Card>

          {/* Step 3: Zero-Knowledge Server */}
          <Card className="border-status-success/40 bg-bg-card/90 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono text-status-success font-bold">MONGODB DATABASE</span>
                <Database className="w-5 h-5 text-status-success" />
              </div>
              <h3 className="text-base font-semibold text-txt-main mb-2">3. Zero-Knowledge Storage</h3>
              <p className="text-xs text-txt-secondary leading-relaxed mb-4">
                The backend receives and stores strictly opaque ciphertext, IVs, and wrapped keys. Even if the server is compromised, attackers only get scrambled bytes.
              </p>
              <div className="bg-bg-secondary p-3 rounded-lg border border-border-dark font-mono text-[11px] text-txt-muted truncate">
                {"{ content: 'dGVzdGNpcGhlcg==', iv: '...' }"}
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-border-dark/60 text-[11px] text-status-success flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Zero plaintext in database records
            </div>
          </Card>
        </div>
      </section>

      {/* Privacy Comparison Table */}
      <section className="py-16 px-6 max-w-5xl mx-auto w-full">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold font-heading mb-3">
            ZEROLOCK vs Traditional Cloud Notes
          </h2>
          <p className="text-txt-secondary text-sm">
            Why traditional note-taking applications cannot guarantee confidentiality.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-border-dark bg-bg-card/70 rounded-xl overflow-hidden">
            <thead>
              <tr className="border-b border-border-dark bg-bg-secondary/80 text-xs font-mono text-txt-muted uppercase">
                <th className="p-4">Feature / Security Property</th>
                <th className="p-4 text-accent-primary">ZEROLOCK</th>
                <th className="p-4">Standard Cloud Notes (Evernote / Notion)</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-border-dark">
              <tr>
                <td className="p-4 font-medium text-txt-main">Client-Side Encryption</td>
                <td className="p-4 text-status-success font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Yes (AES-256-GCM in browser)
                </td>
                <td className="p-4 text-status-error flex items-center gap-2">
                  <XCircle className="w-4 h-4" /> No (Encrypted only at rest by server)
                </td>
              </tr>
              <tr>
                <td className="p-4 font-medium text-txt-main">Server Plaintext Access</td>
                <td className="p-4 text-status-success font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Zero-Knowledge (Impossible)
                </td>
                <td className="p-4 text-status-error flex items-center gap-2">
                  <XCircle className="w-4 h-4" /> Server holds master keys & reads notes
                </td>
              </tr>
              <tr>
                <td className="p-4 font-medium text-txt-main">Key Derivation Function</td>
                <td className="p-4 text-status-success font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Argon2id (Memory-hard against GPUs)
                </td>
                <td className="p-4 text-status-warning flex items-center gap-2">
                  <XCircle className="w-4 h-4" /> Simple bcrypt or plain JWT auth
                </td>
              </tr>
              <tr>
                <td className="p-4 font-medium text-txt-main">Encrypted Metadata (Titles & Tags)</td>
                <td className="p-4 text-status-success font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Fully Encrypted Client-Side
                </td>
                <td className="p-4 text-status-error flex items-center gap-2">
                  <XCircle className="w-4 h-4" /> Stored in plaintext for server indexing
                </td>
              </tr>
              <tr>
                <td className="p-4 font-medium text-txt-main">Search Architecture</td>
                <td className="p-4 text-status-success font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> In-Memory Client-Side Search
                </td>
                <td className="p-4 text-status-error flex items-center gap-2">
                  <XCircle className="w-4 h-4" /> Server queries database plaintext
                </td>
              </tr>
              <tr>
                <td className="p-4 font-medium text-txt-main">Master Password Rotation</td>
                <td className="p-4 text-status-success font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Vault Key Re-wrapping (No note re-upload)
                </td>
                <td className="p-4 text-status-warning flex items-center gap-2">
                  <XCircle className="w-4 h-4" /> Not applicable
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-dark py-8 px-6 mt-auto bg-bg-secondary/50 text-center">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-heading font-bold text-sm text-txt-main">
            <Shield className="w-4 h-4 text-accent-primary" />
            <span>ZEROLOCK – Zero-Knowledge Secure Notes Platform</span>
          </div>
          <p className="text-xs text-txt-muted font-mono">
            VTU 7th-Semester Computer Science and Design • Cryptography Project
          </p>
          <div className="flex items-center gap-4 text-xs text-txt-secondary">
            <Link to="/crypto-lab" className="hover:text-accent-secondary">Crypto Lab</Link>
            <Link to="/login" className="hover:text-accent-primary">Sign In</Link>
            <Link to="/register" className="hover:text-accent-primary">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
