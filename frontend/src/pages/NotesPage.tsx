import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileText,
  Plus,
  Search,
  Pin,
  Star,
  Archive,
  Filter,
  Tag,
  Lock,
  Unlock,
  ShieldCheck,
  Cpu,
} from 'lucide-react';
import { useVault } from '../context/VaultContext';
import { api } from '../services/api';
import { decryptNotePayload } from '../crypto/envelope';
import { DecryptedNote, EncryptedNoteDTO } from '@zerolock/shared';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { NoteCard } from '../components/notes/NoteCard';

export const NotesPage: React.FC = () => {
  const { vaultKey, isUnlocked } = useVault();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [notes, setNotes] = useState<DecryptedNote[]>([]);
  const [encryptedNotesRaw, setEncryptedNotesRaw] = useState<EncryptedNoteDTO[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'all' | 'pinned' | 'favorites' | 'archived'>('all');

  // Read URL parameters on mount
  useEffect(() => {
    if (searchParams.get('pinned') === 'true') setActiveTab('pinned');
    else if (searchParams.get('favorite') === 'true') setActiveTab('favorites');
    else if (searchParams.get('archived') === 'true') setActiveTab('archived');
  }, [searchParams]);

  // Fetch and decrypt notes
  const fetchNotes = async () => {
    try {
      setIsLoading(true);
      const remoteNotes = await api.getNotes();
      setEncryptedNotesRaw(remoteNotes);

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
              tags: dec.tags || [],
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
      console.error('Error fetching notes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [vaultKey, isUnlocked]);

  // Collect all unique tags from decrypted notes
  const allTags = useMemo(() => {
    const set = new Set<string>();
    notes.forEach((n) => n.tags?.forEach((t) => set.add(t)));
    return Array.from(set);
  }, [notes]);

  // Client-Side Zero-Knowledge Search and Filtering
  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      // Tab filter
      if (activeTab === 'pinned' && !note.isPinned) return false;
      if (activeTab === 'favorites' && !note.isFavorite) return false;
      if (activeTab === 'archived' && !note.isArchived) return false;
      if (activeTab !== 'archived' && note.isArchived) return false;

      // Tag filter
      if (selectedTag !== 'all' && !note.tags.includes(selectedTag)) return false;

      // Local query search across title and stripped content
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = note.title.toLowerCase().includes(q);
        const contentMatch = note.content.toLowerCase().includes(q);
        const tagMatch = note.tags.some((t) => t.toLowerCase().includes(q));
        if (!titleMatch && !contentMatch && !tagMatch) return false;
      }

      return true;
    });
  }, [notes, activeTab, selectedTag, searchQuery]);

  const handleTogglePin = async (id: string, current: boolean) => {
    const note = notes.find((n) => n.id === id);
    const enc = encryptedNotesRaw.find((n) => n.id === id);
    if (!note || !enc) return;

    await api.updateNote(id, {
      encryptedContent: enc.encryptedContent,
      contentIv: enc.contentIv,
      encryptedDek: enc.encryptedDek,
      dekIv: enc.dekIv,
      encryptedMetadata: enc.encryptedMetadata,
      metadataIv: enc.metadataIv,
      isPinned: !current,
      expectedVersion: enc.version,
    });

    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, isPinned: !current } : n)));
    setEncryptedNotesRaw((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isPinned: !current, version: n.version + 1 } : n))
    );
  };

  const handleToggleFavorite = async (id: string, current: boolean) => {
    const note = notes.find((n) => n.id === id);
    const enc = encryptedNotesRaw.find((n) => n.id === id);
    if (!note || !enc) return;

    await api.updateNote(id, {
      encryptedContent: enc.encryptedContent,
      contentIv: enc.contentIv,
      encryptedDek: enc.encryptedDek,
      dekIv: enc.dekIv,
      encryptedMetadata: enc.encryptedMetadata,
      metadataIv: enc.metadataIv,
      isFavorite: !current,
      expectedVersion: enc.version,
    });

    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, isFavorite: !current } : n)));
    setEncryptedNotesRaw((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isFavorite: !current, version: n.version + 1 } : n))
    );
  };

  const handleToggleArchive = async (id: string, current: boolean) => {
    const note = notes.find((n) => n.id === id);
    const enc = encryptedNotesRaw.find((n) => n.id === id);
    if (!note || !enc) return;

    await api.updateNote(id, {
      encryptedContent: enc.encryptedContent,
      contentIv: enc.contentIv,
      encryptedDek: enc.encryptedDek,
      dekIv: enc.dekIv,
      encryptedMetadata: enc.encryptedMetadata,
      metadataIv: enc.metadataIv,
      isArchived: !current,
      expectedVersion: enc.version,
    });

    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, isArchived: !current } : n)));
    setEncryptedNotesRaw((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isArchived: !current, version: n.version + 1 } : n))
    );
  };

  const handleDelete = async (id: string) => {
    await api.deleteNote(id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
    setEncryptedNotesRaw((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-txt-main">Your Encrypted Notes</h1>
          <p className="text-xs text-txt-secondary mt-1">
            Client-side search active. Search queries are computed in your browser and never sent over the network.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => {
            if (!isUnlocked) {
              navigate('/unlock');
            } else {
              navigate('/notes/new');
            }
          }}
        >
          New Note
        </Button>
      </div>

      {/* Search & Tabs Toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Local Search Input */}
        <div className="relative flex-1 max-w-md">
          <Input
            placeholder="Search decrypted notes locally in RAM..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-txt-muted" />}
            disabled={!isUnlocked}
          />
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1 bg-bg-secondary p-1 rounded-xl border border-border-dark overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'all'
                ? 'bg-bg-card text-txt-main shadow'
                : 'text-txt-muted hover:text-txt-secondary'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>All ({encryptedNotesRaw.filter((n) => !n.isArchived).length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pinned')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'pinned'
                ? 'bg-bg-card text-accent-primary shadow'
                : 'text-txt-muted hover:text-txt-secondary'
            }`}
          >
            <Pin className="w-3.5 h-3.5" />
            <span>Pinned</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('favorites')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'favorites'
                ? 'bg-bg-card text-status-warning shadow'
                : 'text-txt-muted hover:text-txt-secondary'
            }`}
          >
            <Star className="w-3.5 h-3.5" />
            <span>Favorites</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('archived')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'archived'
                ? 'bg-bg-card text-txt-main shadow'
                : 'text-txt-muted hover:text-txt-secondary'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Archive</span>
          </button>
        </div>
      </div>

      {/* Tag Filters */}
      {allTags.length > 0 && isUnlocked && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-txt-muted font-medium flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Tags:
          </span>
          <button
            type="button"
            onClick={() => setSelectedTag('all')}
            className={`px-2.5 py-1 rounded-full text-xs font-mono transition-colors ${
              selectedTag === 'all'
                ? 'bg-accent-primary text-bg-main font-semibold'
                : 'bg-bg-card border border-border-dark text-txt-secondary hover:text-txt-main'
            }`}
          >
            all
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setSelectedTag(tag)}
              className={`px-2.5 py-1 rounded-full text-xs font-mono transition-colors ${
                selectedTag === tag
                  ? 'bg-accent-secondary text-bg-main font-semibold'
                  : 'bg-bg-card border border-border-dark text-txt-secondary hover:text-txt-main'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Notes Grid */}
      {!isUnlocked ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {encryptedNotesRaw.map((raw) => (
            <NoteCard
              key={raw.id}
              note={{ id: raw.id, isLocked: true, updatedAt: raw.updatedAt }}
              isUnlocked={false}
            />
          ))}
        </div>
      ) : filteredNotes.length === 0 ? (
        <Card className="p-12 text-center flex flex-col items-center justify-center border-dashed border-border-dark">
          <FileText className="w-10 h-10 text-txt-muted mb-3" />
          <h3 className="font-heading font-bold text-base text-txt-main mb-1">
            {searchQuery ? 'No matching decrypted notes found' : 'No notes in this category'}
          </h3>
          <p className="text-xs text-txt-secondary max-w-sm mb-4">
            {searchQuery
              ? 'Try adjusting your search terms. Note that search matches are evaluated inside your browser memory.'
              : 'Create a new encrypted note to begin storing personal knowledge.'}
          </p>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => navigate('/notes/new')}
          >
            Create Note
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              isUnlocked={isUnlocked}
              onTogglePin={handleTogglePin}
              onToggleFavorite={handleToggleFavorite}
              onToggleArchive={handleToggleArchive}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};
