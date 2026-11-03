import mongoose, { Schema, Document } from 'mongoose';

export interface INote extends Document {
  userId: mongoose.Types.ObjectId;
  encryptedContent: string;    // Base64 ciphertext of note body
  contentIv: string;           // Base64 96-bit IV
  encryptedDek: string;        // Base64 ciphertext of Note DEK wrapped with Vault Key
  dekIv: string;               // Base64 96-bit IV
  encryptedMetadata: string;   // Base64 ciphertext of JSON { title, tags, category }
  metadataIv: string;          // Base64 96-bit IV
  encryptionVersion: number;
  isPinned: boolean;
  isFavorite: boolean;
  isArchived: boolean;
  version: number;             // Optimistic concurrency control
  createdAt: Date;
  updatedAt: Date;
}

const NoteSchema = new Schema<INote>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    encryptedContent: {
      type: String,
      required: true,
    },
    contentIv: {
      type: String,
      required: true,
    },
    encryptedDek: {
      type: String,
      required: true,
    },
    dekIv: {
      type: String,
      required: true,
    },
    encryptedMetadata: {
      type: String,
      required: true,
    },
    metadataIv: {
      type: String,
      required: true,
    },
    encryptionVersion: {
      type: Number,
      default: 1,
    },
    isPinned: {
      type: Boolean,
      default: false,
      index: true,
    },
    isFavorite: {
      type: Boolean,
      default: false,
      index: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    version: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying user notes ordered by update time
NoteSchema.index({ userId: 1, updatedAt: -1 });

export const Note = mongoose.model<INote>('Note', NoteSchema);
