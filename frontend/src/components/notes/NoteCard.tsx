import React from 'react';
import { Link } from 'react-router-dom';
import { Pin, Star, Archive, Trash2, Lock, Tag, Clock } from 'lucide-react';
import { DecryptedNote } from '@zerolock/shared';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

interface NoteCardProps {
  note: DecryptedNote | { id: string; isLocked: true; updatedAt: string };
  isUnlocked: boolean;
  onTogglePin?: (id: string, current: boolean) => void;
  onToggleFavorite?: (id: string, current: boolean) => void;
  onToggleArchive?: (id: string, current: boolean) => void;
  onDelete?: (id: string) => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  isUnlocked,
  onTogglePin,
  onToggleFavorite,
  onToggleArchive,
  onDelete,
}) => {
  // If locked, render encrypted placeholder
  if (!isUnlocked || 'isLocked' in note) {
    return (
      <Card hover className="flex flex-col justify-between border-dashed border-border-dark bg-bg-card/60">
        <div>
          <div className="flex items-center justify-between mb-3">
            <Badge variant="warning" size="sm" dot>
              Encrypted Payload
            </Badge>
            <Lock className="w-4 h-4 text-txt-muted" />
          </div>
          <h4 className="font-mono text-xs text-txt-muted truncate mb-2">
            ID: {note.id.substring(0, 16)}...
          </h4>
          <p className="text-xs text-txt-muted/70 line-clamp-3 font-mono">
            Ciphertext: [256-bit AES-GCM Encrypted Blob + Tag]
          </p>
        </div>
        <div className="mt-4 pt-3 border-t border-border-dark flex items-center justify-between text-[11px] text-txt-muted">
          <span>Locked in RAM</span>
          <Link to="/unlock" className="text-accent-primary hover:underline font-semibold">
            Unlock
          </Link>
        </div>
      </Card>
    );
  }

  // Strip HTML tags for clean snippet preview
  const plainSnippet = note.content ? note.content.replace(/<[^>]*>?/gm, '').trim() : '';

  const formattedDate = new Date(note.updatedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Card hover className="flex flex-col justify-between group">
      <div>
        {/* Top Header Controls */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {note.isPinned && (
              <Badge variant="primary" size="sm">
                Pinned
              </Badge>
            )}
            {note.isFavorite && (
              <Badge variant="cyan" size="sm">
                Favorite
              </Badge>
            )}
            {note.isArchived && (
              <Badge variant="neutral" size="sm">
                Archived
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
            {onTogglePin && (
              <button
                type="button"
                onClick={() => onTogglePin(note.id, note.isPinned)}
                className={`p-1.5 rounded-lg transition-colors ${
                  note.isPinned
                    ? 'text-accent-primary bg-accent-primary/10'
                    : 'text-txt-muted hover:text-txt-main hover:bg-bg-hover'
                }`}
                title={note.isPinned ? 'Unpin' : 'Pin note'}
              >
                <Pin className="w-3.5 h-3.5" />
              </button>
            )}
            {onToggleFavorite && (
              <button
                type="button"
                onClick={() => onToggleFavorite(note.id, note.isFavorite)}
                className={`p-1.5 rounded-lg transition-colors ${
                  note.isFavorite
                    ? 'text-status-warning bg-status-warning/10'
                    : 'text-txt-muted hover:text-txt-main hover:bg-bg-hover'
                }`}
                title={note.isFavorite ? 'Remove Favorite' : 'Mark Favorite'}
              >
                <Star className="w-3.5 h-3.5" />
              </button>
            )}
            {onToggleArchive && (
              <button
                type="button"
                onClick={() => onToggleArchive(note.id, note.isArchived)}
                className="p-1.5 text-txt-muted hover:text-txt-main hover:bg-bg-hover rounded-lg transition-colors"
                title={note.isArchived ? 'Unarchive' : 'Archive note'}
              >
                <Archive className="w-3.5 h-3.5" />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Permanently delete this encrypted note? This cannot be undone.')) {
                    onDelete(note.id);
                  }
                }}
                className="p-1.5 text-txt-muted hover:text-status-error hover:bg-bg-hover rounded-lg transition-colors"
                title="Delete note"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Note Title & Content Link */}
        <Link to={`/notes/${note.id}`} className="block group-hover:text-accent-primary transition-colors">
          <h3 className="font-heading font-bold text-base text-txt-main mb-2 line-clamp-1">
            {note.title || 'Untitled Note'}
          </h3>
          <p className="text-xs text-txt-secondary line-clamp-3 leading-relaxed mb-3">
            {plainSnippet || <span className="italic text-txt-muted">Empty note body</span>}
          </p>
        </Link>

        {/* Tags */}
        {note.tags && note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {note.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-bg-secondary text-txt-muted border border-border-dark"
              >
                <Tag className="w-2.5 h-2.5 text-accent-secondary" />
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-4 pt-3 border-t border-border-dark flex items-center justify-between text-[11px] text-txt-muted">
        <span className="flex items-center gap-1 font-mono">
          <Clock className="w-3 h-3" />
          {formattedDate}
        </span>
        <span className="font-mono text-[10px] text-accent-primary font-semibold">
          v{note.version} (AES-256)
        </span>
      </div>
    </Card>
  );
};
