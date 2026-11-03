import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Copy,
  CheckCircle2,
  Lock,
  Printer,
} from 'lucide-react';
import { useVault } from '../context/VaultContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import {
  generateRecoverySecret,
  wrapVaultKeyWithRecovery,
  RecoveryCredentials,
} from '../crypto/recovery';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';

export const RecoveryCenterPage: React.FC = () => {
  const { vaultKey, isUnlocked, vaultMetadata } = useVault();
  const { success, error, warning } = useToast();

  const [hasRecoveryConfigured, setHasRecoveryConfigured] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newCredentials, setNewCredentials] = useState<RecoveryCredentials | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [savedCheck, setSavedCheck] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await api.getRecoveryStatus();
        setHasRecoveryConfigured(res.hasRecoveryKey);
      } catch (err) {
        console.error('Failed to get recovery status:', err);
      }
    };
    checkStatus();
  }, [vaultMetadata]);

  const handleGenerateRecovery = async () => {
    if (!vaultKey || !isUnlocked) {
      warning('Please unlock your vault before generating recovery credentials.');
      return;
    }

    try {
      setIsGenerating(true);
      // 1. Generate client-side 256-bit entropy secret
      const creds = generateRecoverySecret();

      // 2. Wrap existing Vault Key using HKDF-derived recovery key
      const wrapped = await wrapVaultKeyWithRecovery(vaultKey, creds.rawHex);

      // 3. Update server record (transmits ONLY recoveryWrappedVaultKey and recoveryIv)
      if (vaultMetadata) {
        await api.rotateVaultKey({
          salt: vaultMetadata.salt,
          kdfAlgorithm: vaultMetadata.kdfAlgorithm,
          kdfParameters: vaultMetadata.kdfParameters,
          wrappedVaultKey: vaultMetadata.wrappedVaultKey,
          wrappedVaultKeyIv: vaultMetadata.wrappedVaultKeyIv,
          recoveryWrappedVaultKey: wrapped.recoveryWrappedVaultKey,
          recoveryIv: wrapped.recoveryIv,
        });

        await api.logVaultEvent({
          eventType: 'RECOVERY_SETUP',
          status: 'SUCCESS',
          details: 'New emergency recovery key configured',
        });
      }

      setNewCredentials(creds);
      setHasRecoveryConfigured(true);
      setConfirmModalOpen(false);
      setSavedCheck(false);
      success('Emergency recovery key generated and configured client-side!');
    } catch (err: any) {
      error(err.message || 'Failed to generate recovery key');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-16 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold font-heading text-txt-main">
          Emergency Recovery Center
        </h1>
        <p className="text-xs md:text-sm text-txt-secondary mt-1">
          Cryptographic safety net. Restore your vault if you lose your Master Password without compromising zero-knowledge guarantees.
        </p>
      </div>

      {/* Recovery Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <KeyRound className="w-5 h-5 text-accent-secondary" />
            <CardTitle>Recovery Configuration Status</CardTitle>
          </div>
          <Badge variant={hasRecoveryConfigured ? 'success' : 'warning'} dot>
            {hasRecoveryConfigured ? 'Active & Configured' : 'Not Configured'}
          </Badge>
        </CardHeader>

        <div className="flex flex-col gap-4 text-xs leading-relaxed text-txt-secondary">
          <p>
            Your emergency recovery key is an independent 256-bit high-entropy secret derived with HKDF-SHA-256. It provides an alternative unwrapping path for your Vault Key without transmitting any secret keys to the server.
          </p>

          <div className="p-4 bg-bg-secondary rounded-xl border border-border-dark flex items-center justify-between gap-4">
            <div>
              <span className="font-semibold text-txt-main text-sm block">
                {hasRecoveryConfigured ? 'Recovery Key is Active' : 'No Recovery Key On File'}
              </span>
              <span className="text-[11px] text-txt-muted font-mono">
                {hasRecoveryConfigured
                  ? 'Your vault has an encrypted recovery envelope configured in database.'
                  : 'If you forget your master password, your notes will be permanently inaccessible.'}
              </span>
            </div>

            <Button
              variant={hasRecoveryConfigured ? 'secondary' : 'primary'}
              size="md"
              icon={<RefreshCw className="w-4 h-4" />}
              onClick={() => setConfirmModalOpen(true)}
              disabled={!isUnlocked}
            >
              {hasRecoveryConfigured ? 'Regenerate Key' : 'Generate Key'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Display Newly Generated Recovery Key */}
      {newCredentials && (
        <Card className="border-accent-secondary/50 bg-bg-card/95 shadow-glow-cyan">
          <CardHeader>
            <div className="flex items-center gap-2 text-accent-secondary">
              <CheckCircle2 className="w-5 h-5" />
              <CardTitle className="text-accent-secondary">
                Your New Emergency Recovery Key
              </CardTitle>
            </div>
            <span className="text-xs text-status-warning font-mono font-bold">
              Shown Once Only
            </span>
          </CardHeader>

          <div className="flex flex-col gap-4">
            <p className="text-xs text-txt-secondary leading-relaxed">
              Store this code in a secure offline location (e.g., password manager, safe deposit box). You will need this exact string if you ever forget your Master Password.
            </p>

            <div className="p-4 bg-bg-main rounded-xl border border-border-dark/80 font-mono text-sm sm:text-base text-accent-secondary text-center tracking-widest select-all break-all shadow-inner">
              {newCredentials.formattedCode}
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                icon={<Copy className="w-3.5 h-3.5" />}
                onClick={() => {
                  navigator.clipboard.writeText(newCredentials.formattedCode);
                  success('Recovery code copied to clipboard!');
                }}
              >
                Copy to Clipboard
              </Button>

              <Button
                variant="ghost"
                size="sm"
                icon={<Printer className="w-3.5 h-3.5" />}
                onClick={() => window.print()}
              >
                Print / Save PDF
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Confirmation Modal */}
      <Modal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title="Confirm Recovery Key Generation"
        description="Regenerating your recovery credentials will invalidate any previously saved recovery codes."
        maxWidth="md"
      >
        <div className="flex flex-col gap-4 mt-2">
          <div className="p-3.5 bg-status-warning/10 border border-status-warning/30 rounded-xl text-xs text-status-warning leading-relaxed flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>
              This will derive a new recovery key using HKDF-SHA-256 and re-wrap your Vault Key in your browser before saving the new envelope to the database.
            </span>
          </div>

          <label className="flex items-center gap-3 p-3 bg-bg-secondary rounded-lg border border-border-dark cursor-pointer">
            <input
              type="checkbox"
              checked={savedCheck}
              onChange={(e) => setSavedCheck(e.target.checked)}
              className="w-4 h-4 rounded text-accent-primary focus:ring-accent-primary"
            />
            <span className="text-xs text-txt-main font-medium">
              I understand that old recovery codes will no longer function.
            </span>
          </label>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-dark">
            <Button variant="ghost" size="sm" onClick={() => setConfirmModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!savedCheck}
              isLoading={isGenerating}
              onClick={handleGenerateRecovery}
              icon={<ShieldCheck className="w-4 h-4" />}
            >
              Generate New Key
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
