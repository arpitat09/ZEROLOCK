import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import LinkExtension from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code,
  Link as LinkIcon,
  Shield,
  Lock,
  ArrowLeft,
  Trash2,
  CheckCircle2,
  Loader2,
  Eye,
  Tag as TagIcon,
  Pin,
  Star,
  Archive,
} from 'lucide-react';
import { useVault } from '../context/VaultContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { encryptNotePayload, decryptNotePayload, EncryptedNoteEnvelope } from '../crypto/envelope';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';

export const NoteEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === 'new';
  const { vaultKey, isUnlocked } = useVault();
  const { success, error, warning } = useToast();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isPinned, setIsPinned] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isArchived, setIsArchived] = useState(false);
  const [version, setVersion] = useState<number>(1);

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const [noteId, setNoteId] = useState<string | null>(isNew ? null : id);

  // Inspector modal for cryptographic proof
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [latestEnvelope, setLatestEnvelope] = useState<EncryptedNoteEnvelope | null>(null);

  const autosaveTimeoutRef = useRef<number | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      LinkExtension.configure({
        openOnClick: false,
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Placeholder.configure({
        placeholder: 'Write your private note here... (Encrypted with AES-256-GCM before saving)',
      }),
    ],
    content: '',
    onUpdate: () => {
      setSaveStatus('unsaved');
      triggerDebouncedAutosave();
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-invert max-w-none focus:outline-none min-h-[400px] text-txt-main text-sm leading-relaxed',
      },
    },
  });

  // Load existing note
  useEffect(() => {
    if (!isNew && id && vaultKey && isUnlocked && editor) {
      const loadNote = async () => {
        try {
          const enc = await api.getNoteById(id);
          setLatestEnvelope({
            encryptedContent: enc.encryptedContent,
            contentIv: enc.contentIv,
            encryptedDek: enc.encryptedDek,
            dekIv: enc.dekIv,
            encryptedMetadata: enc.encryptedMetadata,
            metadataIv: enc.metadataIv,
          });

          // Decrypt locally in RAM
          const dec = await decryptNotePayload(vaultKey, {
            encryptedContent: enc.encryptedContent,
            contentIv: enc.contentIv,
            encryptedDek: enc.encryptedDek,
            dekIv: enc.dekIv,
            encryptedMetadata: enc.encryptedMetadata,
            metadataIv: enc.metadataIv,
          });

          setTitle(dec.title || '');
          setTags(dec.tags || []);
          setTagsInput(dec.tags ? dec.tags.join(', ') : '');
          setIsPinned(enc.isPinned);
          setIsFavorite(enc.isFavorite);
          setIsArchived(enc.isArchived);
          setVersion(enc.version);
          setNoteId(enc.id);
          editor.commands.setContent(dec.content || '');
          setSaveStatus('saved');
          setLastSavedTime(new Date(enc.updatedAt));
        } catch (err: any) {
          error(err.message || 'Failed to load and decrypt note');
        }
      };

      loadNote();
    }
  }, [id, isNew, vaultKey, isUnlocked, editor]);

  // Execute encrypted save
  const saveNote = useCallback(
    async (manual = false) => {
      if (!vaultKey || !isUnlocked || !editor) return;

      const currentContent = editor.getHTML();
      const currentTitle = title.trim() || 'Untitled Note';

      setIsSaving(true);
      setSaveStatus('saving');

      try {
        // 1. Client-Side Envelope Encryption:
        // Generates fresh Note DEK, encrypts content & metadata with DEK, wraps DEK with Vault Key
        const envelope = await encryptNotePayload(vaultKey, {
          title: currentTitle,
          content: currentContent,
          tags,
        });

        setLatestEnvelope(envelope);

        if (!noteId) {
          // POST /api/notes
          const created = await api.createNote({
            encryptedContent: envelope.encryptedContent,
            contentIv: envelope.contentIv,
            encryptedDek: envelope.encryptedDek,
            dekIv: envelope.dekIv,
            encryptedMetadata: envelope.encryptedMetadata,
            metadataIv: envelope.metadataIv,
            isPinned,
            isFavorite,
            isArchived,
          });

          setNoteId(created.id);
          setVersion(created.version);
          setLastSavedTime(new Date(created.updatedAt));
          // Update URL without reloading
          window.history.replaceState(null, '', `/notes/${created.id}`);
        } else {
          // PUT /api/notes/:id with optimistic concurrency version check
          const updated = await api.updateNote(noteId, {
            encryptedContent: envelope.encryptedContent,
            contentIv: envelope.contentIv,
            encryptedDek: envelope.encryptedDek,
            dekIv: envelope.dekIv,
            encryptedMetadata: envelope.encryptedMetadata,
            metadataIv: envelope.metadataIv,
            isPinned,
            isFavorite,
            isArchived,
            expectedVersion: version,
          });

          setVersion(updated.version);
          setLastSavedTime(new Date(updated.updatedAt));
        }

        setSaveStatus('saved');
        if (manual) success('Note encrypted and safely stored in database!');
      } catch (err: any) {
        setSaveStatus('unsaved');
        error(err.message || 'Failed to save note');
      } finally {
        setIsSaving(false);
      }
    },
    [vaultKey, isUnlocked, editor, title, tags, noteId, isPinned, isFavorite, isArchived, version, success, error]
  );

  const triggerDebouncedAutosave = useCallback(() => {
    if (autosaveTimeoutRef.current) {
      window.clearTimeout(autosaveTimeoutRef.current);
    }
    autosaveTimeoutRef.current = window.setTimeout(() => {
      saveNote(false);
    }, 1500);
  }, [saveNote]);

  // Handle Tags input
  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTagsInput(val);
    const split = val
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);
    setTags(split);
    setSaveStatus('unsaved');
    triggerDebouncedAutosave();
  };

  const handleDelete = async () => {
    if (!noteId) {
      navigate('/notes');
      return;
    }
    if (confirm('Are you sure you want to permanently delete this encrypted note?')) {
      await api.deleteNote(noteId);
      success('Note deleted.');
      navigate('/notes');
    }
  };

  if (!isUnlocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="w-16 h-16 rounded-2xl bg-status-warning/10 border border-status-warning/30 flex items-center justify-center text-status-warning mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold font-heading text-txt-main mb-2">
          Vault is Locked
        </h2>
        <p className="text-xs text-txt-secondary max-w-sm mb-6">
          To edit or view this note, you must unlock your vault by deriving the KEK locally in your browser.
        </p>
        <Link to="/unlock">
          <Button variant="primary" size="lg">
            Unlock Vault
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 pb-16 max-w-5xl mx-auto">
      {/* Top Header Controls */}
      <div className="flex items-center justify-between pb-4 border-b border-border-dark flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link
            to="/notes"
            className="p-2 rounded-lg bg-bg-secondary hover:bg-bg-hover text-txt-secondary hover:text-txt-main transition-colors border border-border-dark"
            title="Back to notes"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div>
            <span className="text-xs font-mono text-accent-secondary uppercase tracking-wider block">
              AES-256-GCM Note Editor
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              {saveStatus === 'saving' ? (
                <span className="text-xs text-accent-primary flex items-center gap-1.5 font-mono">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Encrypting payload...
                </span>
              ) : saveStatus === 'saved' ? (
                <span className="text-xs text-status-success flex items-center gap-1.5 font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Saved encrypted {lastSavedTime ? `at ${lastSavedTime.toLocaleTimeString()}` : ''}
                </span>
              ) : (
                <span className="text-xs text-status-warning font-mono">
                  Unsaved changes (Autosaving...)
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Inspect Ciphertext Envelope */}
          {latestEnvelope && (
            <Button
              variant="outline"
              size="sm"
              icon={<Eye className="w-3.5 h-3.5 text-accent-secondary" />}
              onClick={() => setInspectModalOpen(true)}
              title="Inspect raw base64 ciphertext and IV before transmission"
            >
              Inspect Ciphertext
            </Button>
          )}

          {/* Pin toggle */}
          <button
            type="button"
            onClick={() => {
              setIsPinned(!isPinned);
              setSaveStatus('unsaved');
              triggerDebouncedAutosave();
            }}
            className={`p-2 rounded-lg border transition-colors ${
              isPinned
                ? 'bg-accent-primary/10 border-accent-primary/40 text-accent-primary'
                : 'bg-bg-card border-border-dark text-txt-muted hover:text-txt-main'
            }`}
            title={isPinned ? 'Unpin' : 'Pin note'}
          >
            <Pin className="w-4 h-4" />
          </button>

          {/* Favorite toggle */}
          <button
            type="button"
            onClick={() => {
              setIsFavorite(!isFavorite);
              setSaveStatus('unsaved');
              triggerDebouncedAutosave();
            }}
            className={`p-2 rounded-lg border transition-colors ${
              isFavorite
                ? 'bg-status-warning/10 border-status-warning/40 text-status-warning'
                : 'bg-bg-card border-border-dark text-txt-muted hover:text-txt-main'
            }`}
            title={isFavorite ? 'Remove from favorites' : 'Mark favorite'}
          >
            <Star className="w-4 h-4" />
          </button>

          {/* Manual Save Button */}
          <Button
            variant="primary"
            size="sm"
            onClick={() => saveNote(true)}
            isLoading={isSaving}
            icon={<Shield className="w-4 h-4" />}
          >
            Encrypt & Save
          </Button>

          {/* Delete Button */}
          {!isNew && (
            <button
              type="button"
              onClick={handleDelete}
              className="p-2 rounded-lg bg-status-error/10 border border-status-error/20 text-status-error hover:bg-status-error/20 transition-colors"
              title="Delete note"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Note Title Input */}
      <div>
        <input
          type="text"
          placeholder="Note Title..."
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setSaveStatus('unsaved');
            triggerDebouncedAutosave();
          }}
          className="w-full bg-transparent text-2xl md:text-3xl font-bold font-heading text-txt-main placeholder-txt-muted/50 border-b border-border-dark/60 pb-3 focus:outline-none focus:border-accent-primary transition-colors"
        />
      </div>

      {/* Note Tags Input */}
      <div className="flex items-center gap-2 bg-bg-secondary/40 px-3 py-1.5 rounded-lg border border-border-dark">
        <TagIcon className="w-3.5 h-3.5 text-accent-secondary shrink-0" />
        <input
          type="text"
          placeholder="Add tags separated by comma (e.g. cryptography, vtu, research)..."
          value={tagsInput}
          onChange={handleTagsChange}
          className="w-full bg-transparent text-xs text-txt-main placeholder-txt-muted/60 focus:outline-none"
        />
        {tags.length > 0 && (
          <div className="flex items-center gap-1">
            {tags.map((t) => (
              <span
                key={t}
                className="text-[10px] font-mono px-2 py-0.5 rounded bg-bg-card border border-border-dark text-accent-secondary"
              >
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* TipTap Rich Text Toolbar */}
      {editor && (
        <div className="sticky top-16 z-30 flex items-center flex-wrap gap-1 p-2 bg-bg-secondary/90 backdrop-blur-md rounded-xl border border-border-dark shadow-sm">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded-lg transition-colors ${
              editor.isActive('bold') ? 'bg-accent-primary/20 text-accent-primary' : 'text-txt-muted hover:text-txt-main'
            }`}
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded-lg transition-colors ${
              editor.isActive('italic') ? 'bg-accent-primary/20 text-accent-primary' : 'text-txt-muted hover:text-txt-main'
            }`}
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-1.5 rounded-lg transition-colors ${
              editor.isActive('underline') ? 'bg-accent-primary/20 text-accent-primary' : 'text-txt-muted hover:text-txt-main'
            }`}
            title="Underline"
          >
            <UnderlineIcon className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-border-dark mx-1" />

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`p-1.5 rounded-lg transition-colors ${
              editor.isActive('heading', { level: 1 })
                ? 'bg-accent-primary/20 text-accent-primary'
                : 'text-txt-muted hover:text-txt-main'
            }`}
            title="Heading 1"
          >
            <Heading1 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-1.5 rounded-lg transition-colors ${
              editor.isActive('heading', { level: 2 })
                ? 'bg-accent-primary/20 text-accent-primary'
                : 'text-txt-muted hover:text-txt-main'
            }`}
            title="Heading 2"
          >
            <Heading2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`p-1.5 rounded-lg transition-colors ${
              editor.isActive('heading', { level: 3 })
                ? 'bg-accent-primary/20 text-accent-primary'
                : 'text-txt-muted hover:text-txt-main'
            }`}
            title="Heading 3"
          >
            <Heading3 className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-border-dark mx-1" />

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded-lg transition-colors ${
              editor.isActive('bulletList')
                ? 'bg-accent-primary/20 text-accent-primary'
                : 'text-txt-muted hover:text-txt-main'
            }`}
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded-lg transition-colors ${
              editor.isActive('orderedList')
                ? 'bg-accent-primary/20 text-accent-primary'
                : 'text-txt-muted hover:text-txt-main'
            }`}
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            className={`p-1.5 rounded-lg transition-colors ${
              editor.isActive('taskList')
                ? 'bg-accent-primary/20 text-accent-primary'
                : 'text-txt-muted hover:text-txt-main'
            }`}
            title="Checklist / Task List"
          >
            <CheckSquare className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-border-dark mx-1" />

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`p-1.5 rounded-lg transition-colors ${
              editor.isActive('blockquote')
                ? 'bg-accent-primary/20 text-accent-primary'
                : 'text-txt-muted hover:text-txt-main'
            }`}
            title="Blockquote"
          >
            <Quote className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={`p-1.5 rounded-lg transition-colors ${
              editor.isActive('codeBlock')
                ? 'bg-accent-primary/20 text-accent-primary'
                : 'text-txt-muted hover:text-txt-main'
            }`}
            title="Code Block"
          >
            <Code className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Editor Content Area */}
      <div className="bg-bg-card border border-border-dark rounded-xl p-6 min-h-[450px] shadow-card">
        <EditorContent editor={editor} />
      </div>

      {/* Cryptographic Inspector Modal */}
      {latestEnvelope && (
        <Modal
          isOpen={inspectModalOpen}
          onClose={() => setInspectModalOpen(false)}
          title="Cryptographic Proof & Ciphertext Inspector"
          description="View the exact zero-knowledge payload transmitted over the network and stored in MongoDB."
          maxWidth="lg"
        >
          <div className="flex flex-col gap-4 text-xs font-mono">
            <div className="p-3 bg-bg-secondary rounded-lg border border-border-dark">
              <span className="text-txt-muted text-[10px] uppercase block mb-1">
                Wrapped Note DEK (Encrypted with 256-bit Vault Key)
              </span>
              <p className="text-accent-primary select-all break-all">{latestEnvelope.encryptedDek}</p>
              <span className="text-[10px] text-txt-muted mt-1 block">IV: {latestEnvelope.dekIv}</span>
            </div>

            <div className="p-3 bg-bg-secondary rounded-lg border border-border-dark">
              <span className="text-txt-muted text-[10px] uppercase block mb-1">
                Encrypted Note Body (AES-256-GCM Ciphertext + 128-bit Auth Tag)
              </span>
              <p className="text-accent-secondary select-all break-all max-h-32 overflow-y-auto">
                {latestEnvelope.encryptedContent}
              </p>
              <span className="text-[10px] text-txt-muted mt-1 block">IV: {latestEnvelope.contentIv}</span>
            </div>

            <div className="p-3 bg-bg-secondary rounded-lg border border-border-dark">
              <span className="text-txt-muted text-[10px] uppercase block mb-1">
                Encrypted Metadata (Title, Tags, Category)
              </span>
              <p className="text-status-success select-all break-all">{latestEnvelope.encryptedMetadata}</p>
              <span className="text-[10px] text-txt-muted mt-1 block">IV: {latestEnvelope.metadataIv}</span>
            </div>

            <div className="p-3 rounded-lg bg-status-success/10 border border-status-success/30 text-[11px] text-status-success font-sans">
              <strong>Zero-Knowledge Guarantee:</strong> Notice that neither your title nor note content appear in plaintext anywhere in this payload. Only the client holding the unsealed Vault Key can decrypt these fields.
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
