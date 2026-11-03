import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Lock, Unlock, Key, KeyRound, Eye, EyeOff, AlertCircle, ShieldAlert, Cpu } from 'lucide-react';
import { useVault } from '../context/VaultContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

export const VaultUnlockPage: React.FC = () => {
  const { unlock, unlockWithRecovery, isDeriving, kdfProgress } = useVault();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState<'password' | 'recovery'>('password');
  const [masterPassword, setMasterPassword] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const redirectTo = (location.state as any)?.redirectTo || '/dashboard';

  const handleUnlockPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!masterPassword) {
      setErrorMessage('Master password is required.');
      return;
    }

    const success = await unlock(masterPassword);
    if (success) {
      navigate(redirectTo);
    }
  };

  const handleUnlockRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!recoveryCode) {
      setErrorMessage('Emergency recovery code is required.');
      return;
    }

    const success = await unlockWithRecovery(recoveryCode);
    if (success) {
      navigate(redirectTo);
    }
  };

  return (
    <div className="min-h-screen bg-bg-main flex items-center justify-center p-6 selection:bg-accent-primary/20 selection:text-accent-primary">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-accent-primary/10 border border-accent-primary/30 flex items-center justify-center text-accent-primary mb-4 shadow-glow-primary">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold font-heading text-txt-main">
            Unlock Encrypted Vault
          </h1>
          <p className="text-xs md:text-sm text-txt-secondary mt-1.5">
            Derive your 256-bit Key Encryption Key (KEK) client-side to unwrap your vault.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-bg-secondary p-1 rounded-xl mb-4 border border-border-dark">
          <button
            type="button"
            onClick={() => {
              setActiveTab('password');
              setErrorMessage('');
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
              activeTab === 'password'
                ? 'bg-bg-card text-txt-main shadow'
                : 'text-txt-muted hover:text-txt-secondary'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Master Password</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('recovery');
              setErrorMessage('');
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
              activeTab === 'recovery'
                ? 'bg-bg-card text-txt-main shadow'
                : 'text-txt-muted hover:text-txt-secondary'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Emergency Recovery</span>
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3.5 rounded-xl bg-status-error/10 border border-status-error/30 text-status-error text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <Card className="p-6">
          {activeTab === 'password' ? (
            <form onSubmit={handleUnlockPassword} className="flex flex-col gap-4">
              <Input
                label="Master Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter vault master password..."
                value={masterPassword}
                onChange={(e) => setMasterPassword(e.target.value)}
                autoFocus
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

              {isDeriving && (
                <div className="p-3 bg-accent-primary/10 border border-accent-primary/30 rounded-lg text-xs text-accent-primary flex items-center gap-2.5">
                  <Cpu className="w-4 h-4 animate-spin shrink-0" />
                  <span className="font-mono">{kdfProgress}</span>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full mt-2"
                isLoading={isDeriving}
                icon={<Unlock className="w-4 h-4" />}
              >
                Derive KEK & Unlock
              </Button>

              <div className="pt-3 border-t border-border-dark flex items-center justify-between text-[11px] text-txt-muted">
                <span>Algorithm: Argon2id + AES-GCM</span>
                <Link to="/recovery" className="text-accent-secondary hover:underline">
                  Lost Password?
                </Link>
              </div>
            </form>
          ) : (
            <form onSubmit={handleUnlockRecovery} className="flex flex-col gap-4">
              <div className="p-3 bg-status-warning/10 border border-status-warning/20 rounded-lg text-xs text-status-warning">
                Enter your 64-character hexadecimal emergency recovery key formatted with or without hyphens.
              </div>

              <Input
                label="Emergency Recovery Code"
                type="text"
                placeholder="XXXX-XXXX-XXXX-XXXX..."
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value)}
                className="font-mono text-xs uppercase"
                autoFocus
                required
              />

              {isDeriving && (
                <div className="p-3 bg-accent-primary/10 border border-accent-primary/30 rounded-lg text-xs text-accent-primary flex items-center gap-2.5">
                  <Cpu className="w-4 h-4 animate-spin shrink-0" />
                  <span className="font-mono">{kdfProgress}</span>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full mt-2"
                isLoading={isDeriving}
                icon={<KeyRound className="w-4 h-4" />}
              >
                Restore Vault with Recovery Key
              </Button>
            </form>
          )}
        </Card>

        {/* Security Assurance Footer */}
        <div className="mt-6 p-4 rounded-xl bg-bg-secondary/40 border border-border-dark/60 text-center flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-1.5 text-xs text-txt-secondary font-medium">
            <ShieldAlert className="w-4 h-4 text-accent-secondary" />
            <span>Zero-Knowledge Proof</span>
          </div>
          <p className="text-[11px] text-txt-muted max-w-sm">
            Your master password is processed strictly in your local device RAM. The server never receives your plaintext key.
          </p>
        </div>
      </div>
    </div>
  );
};
