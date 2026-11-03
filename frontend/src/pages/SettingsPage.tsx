import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Key,
  Lock,
  Clock,
  Download,
  Upload,
  AlertCircle,
  CheckCircle2,
  Cpu,
  Shield,
  FileCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useVault } from '../context/VaultContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { createEncryptedBackupBundle, verifyAndParseBackupBundle } from '../crypto/backup';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PasswordStrength } from '../components/ui/PasswordStrength';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { vaultKey, isUnlocked, vaultMetadata, rotateMasterPassword, autoLockMinutes, setAutoLockMinutes } =
    useVault();
  const { success, error, warning } = useToast();

  // Account password change state
  const [currentAccountPassword, setCurrentAccountPassword] = useState('');
  const [newAccountPassword, setNewAccountPassword] = useState('');
  const [isUpdatingAccountPassword, setIsUpdatingAccountPassword] = useState(false);

  // Master password rotation state
  const [oldMasterPassword, setOldMasterPassword] = useState('');
  const [newMasterPassword, setNewMasterPassword] = useState('');
  const [confirmNewMasterPassword, setConfirmNewMasterPassword] = useState('');
  const [isRotatingMasterPassword, setIsRotatingMasterPassword] = useState(false);

  // Backup & restore state
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleUpdateAccountPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAccountPassword || !newAccountPassword) {
      error('Please fill in both password fields');
      return;
    }
    if (newAccountPassword.length < 8) {
      error('New account password must be at least 8 characters long');
      return;
    }

    try {
      setIsUpdatingAccountPassword(true);
      await api.changeAccountPassword({
        currentPassword: currentAccountPassword,
        newPassword: newAccountPassword,
      });
      success('Account password updated! (Your vault encryption keys were not altered).');
      setCurrentAccountPassword('');
      setNewAccountPassword('');
    } catch (err: any) {
      error(err.message || 'Failed to update account password');
    } finally {
      setIsUpdatingAccountPassword(false);
    }
  };

  const handleRotateMasterPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldMasterPassword || !newMasterPassword) {
      error('Please fill in both master password fields');
      return;
    }
    if (newMasterPassword !== confirmNewMasterPassword) {
      error('New master passwords do not match');
      return;
    }
    if (newMasterPassword.length < 10) {
      error('New master password must be at least 10 characters long');
      return;
    }

    try {
      setIsRotatingMasterPassword(true);
      await rotateMasterPassword(oldMasterPassword, newMasterPassword);
      setOldMasterPassword('');
      setNewMasterPassword('');
      setConfirmNewMasterPassword('');
    } catch (err: any) {
      // Toast error handled in rotateMasterPassword
    } finally {
      setIsRotatingMasterPassword(false);
    }
  };

  const handleExportBackup = async () => {
    if (!vaultMetadata) {
      error('Vault metadata not loaded');
      return;
    }

    try {
      setIsExporting(true);
      const [notes, attachments] = await Promise.all([api.getNotes(), api.getAttachments()]);

      const bundle = await createEncryptedBackupBundle(vaultMetadata, notes, attachments);
      const jsonStr = JSON.stringify(bundle, null, 2);

      // Download file
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zerolock_encrypted_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Save to server backup records
      await api.createBackup(bundle);

      success('Encrypted vault backup generated with SHA-256 integrity checksum!');
    } catch (err: any) {
      error(err.message || 'Failed to export encrypted backup');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      const content = await file.text();

      const verification = await verifyAndParseBackupBundle(content);
      if (!verification.isValid || !verification.bundle) {
        error(verification.error || 'Invalid backup file structure or corrupted checksum');
        return;
      }

      await api.createBackup(verification.bundle);
      success(
        `Backup verified successfully! Contains ${verification.bundle.notes.length} encrypted notes.`
      );
    } catch (err: any) {
      error(err.message || 'Failed to parse backup bundle');
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-16 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold font-heading text-txt-main">
          Vault Settings & Key Management
        </h1>
        <p className="text-xs md:text-sm text-txt-secondary mt-1">
          Manage master keys, auto-lock timeouts, account passwords, and encrypted backups.
        </p>
      </div>

      {/* Auto-Lock Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-accent-secondary" />
            <CardTitle>In-Memory Auto-Lock Security Timeout</CardTitle>
          </div>
        </CardHeader>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div>
            <p className="text-txt-main font-medium">Automatic Vault Seal on Inactivity</p>
            <p className="text-txt-muted text-[11px] mt-0.5">
              Wipes unsealed encryption keys from browser RAM when idle.
            </p>
          </div>

          <select
            value={autoLockMinutes}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              setAutoLockMinutes(val);
              success(`Auto-lock timeout updated to ${val} minutes`);
            }}
            className="bg-bg-secondary text-txt-main border border-border-dark rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-accent-primary"
          >
            <option value={5}>5 minutes</option>
            <option value={15}>15 minutes (Recommended)</option>
            <option value={30}>30 minutes</option>
            <option value={60}>1 hour</option>
          </select>
        </div>
      </Card>

      {/* Master Password Rotation */}
      <Card className="border-accent-primary/40">
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <Key className="w-5 h-5 text-accent-primary" />
            <CardTitle>Master Password Rotation (Vault Key Re-wrapping)</CardTitle>
          </div>
          <span className="text-xs text-status-success font-mono">Zero Note Re-upload</span>
        </CardHeader>

        <form onSubmit={handleRotateMasterPassword} className="flex flex-col gap-4 text-xs">
          <div className="p-3 bg-bg-secondary rounded-lg border border-border-dark text-txt-secondary leading-relaxed">
            <p>
              <strong>Cryptographic Envelope Re-wrapping:</strong> Changing your Master Password derives a new KEK via Argon2id with fresh salt and re-wraps the existing 256-bit Vault Key. All existing notes stay intact because they are keyed by their own DEKs wrapped by the Vault Key!
            </p>
          </div>

          <Input
            label="Current Master Password"
            type="password"
            placeholder="••••••••••••"
            value={oldMasterPassword}
            onChange={(e) => setOldMasterPassword(e.target.value)}
            required
            disabled={!isUnlocked}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="New Master Password (Min 10 chars)"
              type="password"
              placeholder="••••••••••••"
              value={newMasterPassword}
              onChange={(e) => setNewMasterPassword(e.target.value)}
              required
              disabled={!isUnlocked}
            />
            <Input
              label="Confirm New Master Password"
              type="password"
              placeholder="••••••••••••"
              value={confirmNewMasterPassword}
              onChange={(e) => setConfirmNewMasterPassword(e.target.value)}
              required
              disabled={!isUnlocked}
            />
          </div>

          <PasswordStrength password={newMasterPassword} label="New Master Password Strength" />

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full sm:w-auto self-start mt-2"
            isLoading={isRotatingMasterPassword}
            disabled={!isUnlocked}
            icon={<Cpu className="w-4 h-4" />}
          >
            Re-derive KEK & Rotate Master Password
          </Button>
        </form>
      </Card>

      {/* Account Password Change (Separation of Concerns Demonstration) */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <Lock className="w-5 h-5 text-txt-muted" />
            <CardTitle>Account Authentication Password</CardTitle>
          </div>
          <span className="text-xs text-accent-secondary font-mono">Bcrypt Hash Only</span>
        </CardHeader>

        <form onSubmit={handleUpdateAccountPassword} className="flex flex-col gap-4 text-xs">
          <p className="text-txt-secondary">
            Your Account Password only authenticates your login session on the backend. Updating it has zero effect on your vault or note encryption keys.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Current Account Password"
              type="password"
              placeholder="••••••••"
              value={currentAccountPassword}
              onChange={(e) => setCurrentAccountPassword(e.target.value)}
              required
            />
            <Input
              label="New Account Password (Min 8 chars)"
              type="password"
              placeholder="••••••••"
              value={newAccountPassword}
              onChange={(e) => setNewAccountPassword(e.target.value)}
              required
            />
          </div>

          <Button
            type="submit"
            variant="secondary"
            size="md"
            className="w-full sm:w-auto self-start"
            isLoading={isUpdatingAccountPassword}
          >
            Update Account Password
          </Button>
        </form>
      </Card>

      {/* Encrypted Backup & Restore */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <Download className="w-5 h-5 text-status-success" />
            <CardTitle>Encrypted Backup & Portability</CardTitle>
          </div>
          <span className="text-xs text-txt-muted font-mono">SHA-256 Verified</span>
        </CardHeader>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div>
            <p className="text-txt-main font-medium">Export Encrypted Backup</p>
            <p className="text-txt-muted text-[11px] mt-0.5">
              Exports full ciphertext vault with SHA-256 integrity checksum for offline cold storage.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              variant="secondary"
              size="sm"
              icon={<Download className="w-4 h-4 text-status-success" />}
              isLoading={isExporting}
              onClick={handleExportBackup}
            >
              Export JSON Backup
            </Button>

            <label className="cursor-pointer">
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
                disabled={isImporting}
              />
              <span className="inline-flex items-center justify-center font-medium text-xs px-3 py-2 rounded-lg bg-bg-secondary hover:bg-bg-hover text-txt-main border border-border-dark transition-colors gap-1.5">
                <Upload className="w-3.5 h-3.5 text-accent-secondary" />
                <span>Import Backup</span>
              </span>
            </label>
          </div>
        </div>
      </Card>
    </div>
  );
};
