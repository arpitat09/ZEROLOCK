import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Lock, Key, AlertCircle, Eye, EyeOff, CheckCircle2, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useVault } from '../context/VaultContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { PasswordStrength } from '../components/ui/PasswordStrength';
import { Modal } from '../components/ui/Modal';
import { RecoveryCredentials } from '../crypto/recovery';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const { setupVault, isDeriving, kdfProgress } = useVault();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [masterPassword, setMasterPassword] = useState('');
  const [confirmMasterPassword, setConfirmMasterPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showMasterPassword, setShowMasterPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Recovery modal state after registration
  const [recoveryCredentials, setRecoveryCredentials] = useState<RecoveryCredentials | null>(null);
  const [hasSavedRecovery, setHasSavedRecovery] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (password !== confirmPassword) {
      setErrorMessage('Account passwords do not match.');
      return;
    }

    if (masterPassword !== confirmMasterPassword) {
      setErrorMessage('Master passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Account password must be at least 8 characters long.');
      return;
    }

    if (masterPassword.length < 10) {
      setErrorMessage('Master password must be at least 10 characters long for cryptographic security.');
      return;
    }

    if (password === masterPassword) {
      setErrorMessage('Security Alert: Your Master Password must NOT be identical to your Account Password.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Create account credentials on backend (sends ONLY account password for bcrypt)
      await register(name, email, password);

      // 2. Initialize client-side cryptographic vault in browser memory
      // Master password is NEVER transmitted to the server!
      const recovery = await setupVault(masterPassword);
      setRecoveryCredentials(recovery);
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinishRegistration = () => {
    if (!hasSavedRecovery) {
      alert('Please confirm that you have saved your emergency recovery code.');
      return;
    }
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-bg-main flex items-center justify-center p-6 selection:bg-accent-primary/20 selection:text-accent-primary">
      <div className="max-w-xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-4 group">
            <div className="w-12 h-12 rounded-2xl bg-accent-primary/10 border border-accent-primary/30 flex items-center justify-center text-accent-primary group-hover:scale-105 transition-transform shadow-glow-primary">
              <Shield className="w-7 h-7" />
            </div>
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold font-heading text-txt-main">
            Create Your Zero-Knowledge Vault
          </h1>
          <p className="text-xs md:text-sm text-txt-secondary mt-1.5">
            Configure dual-credential security to isolate identity authentication from cryptographic decryption.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-status-error/10 border border-status-error/30 text-status-error text-xs flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <Card className="p-6 md:p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Step 1: Identity & Account Authentication */}
            <div className="pb-4 border-b border-border-dark flex flex-col gap-4">
              <div className="flex items-center gap-2 text-xs font-mono text-accent-secondary font-bold uppercase tracking-wider">
                <Lock className="w-4 h-4" />
                <span>1. Account Authentication Credentials</span>
              </div>

              <Input
                label="Full Name"
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <Input
                label="Email Address"
                type="email"
                placeholder="jane@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  label="Account Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="hover:text-txt-main"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />
                <Input
                  label="Confirm Account Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Step 2: Cryptographic Master Password */}
            <div className="pt-2 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono text-accent-primary font-bold uppercase tracking-wider">
                  <Key className="w-4 h-4" />
                  <span>2. Client-Side Master Password</span>
                </div>
                <span className="text-[10px] text-status-success font-mono font-medium">
                  Browser-only (Never transmitted)
                </span>
              </div>

              <div className="bg-bg-secondary/70 p-3.5 rounded-lg border border-border-dark text-xs text-txt-secondary leading-relaxed">
                <p>
                  <strong>Zero-Knowledge Invariant:</strong> Your Master Password is used exclusively inside your browser to derive a 256-bit Key Encryption Key (KEK) using Argon2id. The server never receives this password. If you lose it without recovery credentials, your notes cannot be recovered.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  label="Master Password (Min. 10 chars)"
                  type={showMasterPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  required
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowMasterPassword(!showMasterPassword)}
                      className="hover:text-txt-main"
                    >
                      {showMasterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />
                <Input
                  label="Confirm Master Password"
                  type={showMasterPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={confirmMasterPassword}
                  onChange={(e) => setConfirmMasterPassword(e.target.value)}
                  required
                />
              </div>

              <PasswordStrength password={masterPassword} label="Master Password Strength (Entropy)" />
            </div>

            {/* KDF progress state indicator */}
            {isDeriving && (
              <div className="p-3 bg-accent-primary/10 border border-accent-primary/30 rounded-lg text-xs text-accent-primary flex items-center gap-2.5">
                <div className="w-3.5 h-3.5 border-2 border-accent-primary border-t-transparent rounded-full animate-spin shrink-0" />
                <span className="font-mono">{kdfProgress}</span>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              isLoading={isLoading || isDeriving}
              icon={<Shield className="w-5 h-5" />}
            >
              Generate Cryptographic Vault
            </Button>

            <p className="text-center text-xs text-txt-muted mt-2">
              Already have a vault?{' '}
              <Link to="/login" className="text-accent-primary hover:underline font-semibold">
                Sign In
              </Link>
            </p>
          </form>
        </Card>
      </div>

      {/* Emergency Recovery Modal */}
      {recoveryCredentials && (
        <Modal
          isOpen={true}
          onClose={() => {}}
          title="Important: Save Your Emergency Recovery Key"
          description="This 256-bit recovery key can restore access to your encrypted vault if you ever forget your Master Password."
          maxWidth="lg"
        >
          <div className="flex flex-col gap-4 mt-2">
            <div className="p-4 bg-status-warning/10 border border-status-warning/30 rounded-xl text-xs text-status-warning leading-relaxed flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <strong>Write this code down or copy it to a secure location:</strong>
                <p className="mt-1 text-txt-secondary">
                  Because ZEROLOCK is a true Zero-Knowledge platform, the server administrators CANNOT reset your master password or recover your notes.
                </p>
              </div>
            </div>

            <div className="p-4 bg-bg-secondary rounded-xl border border-border-dark flex flex-col gap-2">
              <span className="text-[10px] font-mono text-txt-muted uppercase tracking-wider">
                Emergency 256-bit Recovery Code (HKDF Derived)
              </span>
              <div className="p-3 bg-bg-main rounded-lg border border-border-dark/80 font-mono text-sm sm:text-base text-accent-secondary select-all break-all tracking-wider text-center">
                {recoveryCredentials.formattedCode}
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(recoveryCredentials.formattedCode);
                  alert('Recovery code copied to clipboard!');
                }}
              >
                Copy Code to Clipboard
              </Button>
            </div>

            <label className="flex items-center gap-3 p-3 bg-bg-secondary/40 rounded-lg cursor-pointer border border-border-dark">
              <input
                type="checkbox"
                checked={hasSavedRecovery}
                onChange={(e) => setHasSavedRecovery(e.target.checked)}
                className="w-4 h-4 rounded text-accent-primary focus:ring-accent-primary"
              />
              <span className="text-xs text-txt-main font-medium">
                I have securely saved this recovery code in a safe place.
              </span>
            </label>

            <Button
              variant="primary"
              size="lg"
              disabled={!hasSavedRecovery}
              onClick={handleFinishRegistration}
              icon={<ArrowRight className="w-5 h-5" />}
            >
              Enter Secure Vault Dashboard
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};
