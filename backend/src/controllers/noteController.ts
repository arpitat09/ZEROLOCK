import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Note } from '../models/Note';

export class NoteController {
  public static async getNotes(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const query: any = { userId: new mongoose.Types.ObjectId(req.user.id) };

      if (req.query.archived === 'true') {
        query.isArchived = true;
      } else if (req.query.archived === 'false' || req.query.archived === undefined) {
        query.isArchived = false;
      }

      if (req.query.favorite === 'true') {
        query.isFavorite = true;
      }

      if (req.query.pinned === 'true') {
        query.isPinned = true;
      }

      const notes = await Note.find(query).sort({ isPinned: -1, updatedAt: -1 });

      const mappedNotes = notes.map((n) => ({
        id: n._id.toString(),
        userId: n.userId.toString(),
        encryptedContent: n.encryptedContent,
        contentIv: n.contentIv,
        encryptedDek: n.encryptedDek,
        dekIv: n.dekIv,
        encryptedMetadata: n.encryptedMetadata,
        metadataIv: n.metadataIv,
        encryptionVersion: n.encryptionVersion,
        isPinned: n.isPinned,
        isFavorite: n.isFavorite,
        isArchived: n.isArchived,
        version: n.version,
        createdAt: n.createdAt.toISOString(),
        updatedAt: n.updatedAt.toISOString(),
      }));

      res.json({
        success: true,
        data: mappedNotes,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to fetch notes' });
    }
  }

  public static async getNoteById(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, error: 'Invalid note ID format' });
        return;
      }

      const note = await Note.findOne({
        _id: new mongoose.Types.ObjectId(id),
        userId: new mongoose.Types.ObjectId(req.user.id),
      });

      if (!note) {
        res.status(404).json({ success: false, error: 'Note not found or access denied.' });
        return;
      }

      res.json({
        success: true,
        data: {
          id: note._id.toString(),
          userId: note.userId.toString(),
          encryptedContent: note.encryptedContent,
          contentIv: note.contentIv,
          encryptedDek: note.encryptedDek,
          dekIv: note.dekIv,
          encryptedMetadata: note.encryptedMetadata,
          metadataIv: note.metadataIv,
          encryptionVersion: note.encryptionVersion,
          isPinned: note.isPinned,
          isFavorite: note.isFavorite,
          isArchived: note.isArchived,
          version: note.version,
          createdAt: note.createdAt.toISOString(),
          updatedAt: note.updatedAt.toISOString(),
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to fetch note' });
    }
  }

  public static async createNote(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const {
        encryptedContent,
        contentIv,
        encryptedDek,
        dekIv,
        encryptedMetadata,
        metadataIv,
        encryptionVersion,
        isPinned,
        isFavorite,
        isArchived,
      } = req.body;

      const note = await Note.create({
        userId: new mongoose.Types.ObjectId(req.user.id),
        encryptedContent,
        contentIv,
        encryptedDek,
        dekIv,
        encryptedMetadata,
        metadataIv,
        encryptionVersion: encryptionVersion || 1,
        isPinned: !!isPinned,
        isFavorite: !!isFavorite,
        isArchived: !!isArchived,
        version: 1,
      });

      res.status(201).json({
        success: true,
        data: {
          id: note._id.toString(),
          userId: note.userId.toString(),
          encryptedContent: note.encryptedContent,
          contentIv: note.contentIv,
          encryptedDek: note.encryptedDek,
          dekIv: note.dekIv,
          encryptedMetadata: note.encryptedMetadata,
          metadataIv: note.metadataIv,
          encryptionVersion: note.encryptionVersion,
          isPinned: note.isPinned,
          isFavorite: note.isFavorite,
          isArchived: note.isArchived,
          version: note.version,
          createdAt: note.createdAt.toISOString(),
          updatedAt: note.updatedAt.toISOString(),
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to create note' });
    }
  }

  public static async updateNote(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, error: 'Invalid note ID format' });
        return;
      }

      const note = await Note.findOne({
        _id: new mongoose.Types.ObjectId(id),
        userId: new mongoose.Types.ObjectId(req.user.id),
      });

      if (!note) {
        res.status(404).json({ success: false, error: 'Note not found or access denied.' });
        return;
      }

      const {
        encryptedContent,
        contentIv,
        encryptedDek,
        dekIv,
        encryptedMetadata,
        metadataIv,
        encryptionVersion,
        isPinned,
        isFavorite,
        isArchived,
        expectedVersion,
      } = req.body;

      // Optimistic concurrency check
      if (expectedVersion !== undefined && note.version !== expectedVersion) {
        res.status(409).json({
          success: false,
          error: 'Conflict: Note was modified elsewhere. Please refresh before saving.',
          currentVersion: note.version,
        });
        return;
      }

      note.encryptedContent = encryptedContent;
      note.contentIv = contentIv;
      note.encryptedDek = encryptedDek;
      note.dekIv = dekIv;
      note.encryptedMetadata = encryptedMetadata;
      note.metadataIv = metadataIv;
      if (encryptionVersion !== undefined) note.encryptionVersion = encryptionVersion;
      if (isPinned !== undefined) note.isPinned = isPinned;
      if (isFavorite !== undefined) note.isFavorite = isFavorite;
      if (isArchived !== undefined) note.isArchived = isArchived;
      note.version += 1;

      await note.save();

      res.json({
        success: true,
        data: {
          id: note._id.toString(),
          userId: note.userId.toString(),
          encryptedContent: note.encryptedContent,
          contentIv: note.contentIv,
          encryptedDek: note.encryptedDek,
          dekIv: note.dekIv,
          encryptedMetadata: note.encryptedMetadata,
          metadataIv: note.metadataIv,
          encryptionVersion: note.encryptionVersion,
          isPinned: note.isPinned,
          isFavorite: note.isFavorite,
          isArchived: note.isArchived,
          version: note.version,
          createdAt: note.createdAt.toISOString(),
          updatedAt: note.updatedAt.toISOString(),
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to update note' });
    }
  }

  public static async deleteNote(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, error: 'Invalid note ID format' });
        return;
      }

      const note = await Note.findOneAndDelete({
        _id: new mongoose.Types.ObjectId(id),
        userId: new mongoose.Types.ObjectId(req.user.id),
      });

      if (!note) {
        res.status(404).json({ success: false, error: 'Note not found or access denied.' });
        return;
      }

      res.json({
        success: true,
        message: 'Encrypted note deleted permanently.',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to delete note' });
    }
  }
}
