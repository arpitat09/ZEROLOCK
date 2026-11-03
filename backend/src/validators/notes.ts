import { z } from 'zod';

export const createNoteSchema = z.object({
  encryptedContent: z.string().min(1, 'Encrypted content is required'),
  contentIv: z.string().min(1, 'Content IV is required'),
  encryptedDek: z.string().min(1, 'Encrypted DEK is required'),
  dekIv: z.string().min(1, 'DEK IV is required'),
  encryptedMetadata: z.string().min(1, 'Encrypted metadata is required'),
  metadataIv: z.string().min(1, 'Metadata IV is required'),
  encryptionVersion: z.number().int().positive().optional().default(1),
  isPinned: z.boolean().optional().default(false),
  isFavorite: z.boolean().optional().default(false),
  isArchived: z.boolean().optional().default(false),
});

export const updateNoteSchema = z.object({
  encryptedContent: z.string().min(1, 'Encrypted content is required'),
  contentIv: z.string().min(1, 'Content IV is required'),
  encryptedDek: z.string().min(1, 'Encrypted DEK is required'),
  dekIv: z.string().min(1, 'DEK IV is required'),
  encryptedMetadata: z.string().min(1, 'Encrypted metadata is required'),
  metadataIv: z.string().min(1, 'Metadata IV is required'),
  encryptionVersion: z.number().int().positive().optional(),
  isPinned: z.boolean().optional(),
  isFavorite: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  expectedVersion: z.number().int().positive().optional(),
});
