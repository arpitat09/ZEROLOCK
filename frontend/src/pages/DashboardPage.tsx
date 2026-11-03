import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  Pin,
  Star,
  HardDrive,
  ShieldCheck,
  Plus,
  Terminal,
  Lock,
  Unlock,
  Key,
  ArrowRight,
  Search,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useVault } from '../context/VaultContext';
import { api } from '../services/api';
import { decryptNotePayload } from '../crypto/envelope';
import { DecryptedNote, EncryptedNoteDTO } from '@zerolock/shared';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { NoteCard } from '../components/notes/NoteCard';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { vaultKey, isUnlocked, vaultMetadata } = useVault();
  const navigate = useNavigate();

  const [notes, setNotes] = useState<DecryptedNote[]>([]);
  const [encryptedNotesRaw, setEncryptedNotesRaw] = useState<EncryptedNoteDTO[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [totalEncryptedBytes, setTotalEncryptedBytes] = useState<number>(0);

  useEffect(() => {
    const fetchAndDecryptNotes = async () => {
      try {
        setIsLoading(true);
        const remoteNotes = await api.getNotes();
        setEncryptedNotesRaw(remoteNotes);

        // Compute total encrypted storage payload size
        let bytes = 0;
        remoteNotes.forEach((n) => {
          bytes += (n.encryptedContent?.length || 0) + (n.encryptedMetadata?.length || 0);
        });
        setTotalEncryptedBytes(bytes);

        // If vault is unlocked, decrypt notes client-side in RAM
        if (vaultKey && isUnlocked) {
          const decryptedList: DecryptedNote[] = [];
          for (const enc of remoteNotes) {
            try {
              const dec = await decryptNotePayload(vaultKey, {
                encryptedContent: enc.encryptedContent,
                contentIv: enc.contentIv,
                encryptedDek: enc.encryptedDek,
                dekIv: enc.dekIv,
                encryptedMetadata: enc.encryptedMetadata,
                metadataIv: enc.metadataIv,
              });

              decryptedList.push({
                id: enc.id,
                title: dec.title,
                content: dec.content,
                tags: dec.tags,
                category: dec.category,
                isPinned: enc.isPinned,
                isFavorite: enc.isFavorite,
                isArchived: enc.isArchived,
                version: enc.version,
                createdAt: enc.createdAt,
                updatedAt: enc.updatedAt,
              });
            } catch (decErr) {
              console.error(`Failed to decrypt note ${enc.id}:`, decErr);
            }
          }
          setNotes(decryptedList);
        } else {
          setNotes([]);
        }
      } catch (err) {
        console.error('Error fetching dashboard notes:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAndDecryptNotes();
  }, [vaultKey, isUnlocked]);

  const pinnedCount = encryptedNotesRaw.filter((n) => n.isPinned).length;
  const favoriteCount = encryptedNotesRaw.filter((n) => n.isFavorite).length;

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* Top Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border-dark">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-heading text-txt-main">
            Welcome back, {user?.name || 'Vault Owner'}
          </h1>
          <p className="text-xs md:text-sm text-txt-secondary mt-1">
            Zero-Knowledge vault is active. Plaintext notes reside strictly in device memory.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/crypto-lab">
            <Button variant="outline" size="sm" icon={<Terminal className="w-4 h-4 text-accent-secondary" />}>
              Crypto Lab
            </Button>
          </Link>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => {
              if (!isUnlocked) {
                navigate('/unlock');
              } else {
                navigate('/notes/new');
              }
            }}
          >
            Create Note
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Notes */}
        <Card hover className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center text-accent-primary shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-txt-muted font-medium">Total Notes</span>
            <p className="text-2xl font-bold font-heading text-txt-main">{encryptedNotesRaw.length}</p>
          </div>
        </Card>

        {/* Pinned Notes */}
        <Card hover className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-accent-secondary/10 border border-accent-secondary/20 flex items-center justify-center text-accent-secondary shrink-0">
            <Pin className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-txt-muted font-medium">Pinned Notes</span>
            <p className="text-2xl font-bold font-heading text-txt-main">{pinnedCount}</p>
          </div>
        </Card>

        {/* Favorites */}
        <Card hover className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-status-warning/10 border border-status-warning/20 flex items-center justify-center text-status-warning shrink-0">
            <Star className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-txt-muted font-medium">Favorite Notes</span>
            <p className="text-2xl font-bold font-heading text-txt-main">{favoriteCount}</p>
          </div>
        </Card>

        {/* Encrypted Storage Size */}
        <Card hover className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-status-success/10 border border-status-success/20 flex items-center justify-center text-status-success shrink-0">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-txt-muted font-medium">Encrypted Payload</span>
            <p className="text-2xl font-bold font-heading text-txt-main">
              {(totalEncryptedBytes / 1024).toFixed(1)} KB
            </p>
          </div>
        </Card>
      </div>

      {/* Cryptographic Security Engine Status Card */}
      <Card className="border-accent-primary/30 bg-bg-card/90">
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-accent-primary" />
            <CardTitle>Active Cryptographic Engine & Security Invariants</CardTitle>
          </div>
          <Badge variant={isUnlocked ? 'success' : 'warning'} dot>
            {isUnlocked ? 'RAM Decryption Active' : 'Vault Locked in RAM'}
          </Badge>
        </CardHeader>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
          <div className="p-3 bg-bg-secondary rounded-lg border border-border-dark flex flex-col gap-1">
            <span className="text-txt-muted text-[10px] uppercase">KDF Algorithm</span>
            <span className="text-txt-main font-semibold">Argon2id (Wasm)</span>
            <span className="text-[10px] text-accent-secondary">
              {vaultMetadata?.kdfParameters
                ? `${vaultMetadata.kdfParameters.memoryCost / 1024}MB / ${vaultMetadata.kdfParameters.timeCost} iter`
                : '19MB / 3 iter'}
            </span>
          </div>

          <div className="p-3 bg-bg-secondary rounded-lg border border-border-dark flex flex-col gap-1">
            <span className="text-txt-muted text-[10px] uppercase">Symmetric Cipher</span>
            <span className="text-txt-main font-semibold">AES-256-GCM</span>
            <span className="text-[10px] text-status-success">128-bit Auth Tag + 96b Nonce</span>
          </div>

          <div className="p-3 bg-bg-secondary rounded-lg border border-border-dark flex flex-col gap-1">
            <span className="text-txt-muted text-[10px] uppercase">Key Architecture</span>
            <span className="text-txt-main font-semibold">Multi-Tier Envelope</span>
            <span className="text-[10px] text-accent-primary">KEK → Vault Key → Note DEK</span>
          </div>

          <div className="p-3 bg-bg-secondary rounded-lg border border-border-dark flex flex-col gap-1">
            <span className="text-txt-muted text-[10px] uppercase">Database Confidentiality</span>
            <span className="text-status-success font-semibold">Zero Plaintext</span>
            <span className="text-[10px] text-txt-muted">Titles & tags encrypted</span>
          </div>
        </div>
      </Card>

      {/* Recent Notes Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold font-heading text-txt-main">Recent Encrypted Notes</h2>
            {isUnlocked && (
              <Badge variant="cyan" size="sm">
                {notes.length} Decrypted in RAM
              </Badge>
            )}
          </div>
          <Link
            to="/notes"
            className="text-xs text-accent-primary hover:text-accent-primary-hover font-semibold flex items-center gap-1"
          >
            <span>View All Notes</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {!isUnlocked ? (
          <Card className="p-8 text-center flex flex-col items-center justify-center border-dashed border-status-warning/40">
            <div className="w-12 h-12 rounded-2xl bg-status-warning/10 border border-status-warning/30 flex items-center justify-center text-status-warning mb-3">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="font-heading font-bold text-base text-txt-main mb-1">
              Vault is Locked
            </h3>
            <p className="text-xs text-txt-secondary max-w-md mb-4">
              Your {encryptedNotesRaw.length} note(s) are stored on the server as opaque ciphertext. Enter your Master Password to derive the KEK and decrypt your vault.
            </p>
            <Button
              variant="primary"
              size="md"
              icon={<Unlock className="w-4 h-4" />}
              onClick={() => navigate('/unlock')}
            >
              Unlock Vault
            </Button>
          </Card>
        ) : notes.length === 0 ? (
          <Card className="p-8 text-center flex flex-col items-center justify-center border-dashed border-border-dark">
            <div className="w-12 h-12 rounded-2xl bg-bg-secondary flex items-center justify-center text-txt-muted mb-3">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="font-heading font-bold text-base text-txt-main mb-1">
              No notes created yet
            </h3>
            <p className="text-xs text-txt-secondary max-w-sm mb-4">
              Create your first end-to-end encrypted note. Every note receives its own unique 256-bit AES-GCM data encryption key.
            </p>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => navigate('/notes/new')}
            >
              Create First Encrypted Note
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {notes.slice(0, 6).map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                isUnlocked={isUnlocked}
                onDelete={async (id) => {
                  await api.deleteNote(id);
                  setNotes((prev) => prev.filter((n) => n.id !== id));
                  setEncryptedNotesRaw((prev) => prev.filter((n) => n.id !== id));
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
