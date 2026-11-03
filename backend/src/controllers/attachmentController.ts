import { Request, Response } from 'express';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { Attachment } from '../models/Attachment';
import { config } from '../config';

const uploadsDir = path.resolve(process.cwd(), config.uploadDir);
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export class AttachmentController {
  public static async upload(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ success: false, error: 'No encrypted file uploaded' });
        return;
      }

      const {
        noteId,
        encryptedFileKey,
        fileKeyIv,
        fileIv,
        encryptedFileName,
        fileNameIv,
        mimeType,
      } = req.body;

      if (!encryptedFileKey || !fileKeyIv || !fileIv || !encryptedFileName || !fileNameIv) {
        fs.unlinkSync(req.file.path);
        res.status(400).json({ success: false, error: 'Missing required cryptographic envelope metadata' });
        return;
      }

      const attachment = await Attachment.create({
        userId: new mongoose.Types.ObjectId(req.user.id),
        noteId: noteId && mongoose.Types.ObjectId.isValid(noteId) ? new mongoose.Types.ObjectId(noteId) : null,
        fileLocation: req.file.path,
        encryptedFileKey,
        fileKeyIv,
        fileIv,
        fileSize: req.file.size,
        encryptedFileName,
        fileNameIv,
        mimeType: mimeType || 'application/octet-stream',
      });

      res.status(201).json({
        success: true,
        data: {
          id: attachment._id.toString(),
          noteId: attachment.noteId ? attachment.noteId.toString() : undefined,
          fileSize: attachment.fileSize,
          encryptedFileKey: attachment.encryptedFileKey,
          fileKeyIv: attachment.fileKeyIv,
          fileIv: attachment.fileIv,
          encryptedFileName: attachment.encryptedFileName,
          fileNameIv: attachment.fileNameIv,
          mimeType: attachment.mimeType,
          createdAt: attachment.createdAt.toISOString(),
        },
      });
    } catch (error: any) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ success: false, error: error.message || 'Failed to upload attachment' });
    }
  }

  public static async getAttachments(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const query: any = { userId: new mongoose.Types.ObjectId(req.user.id) };
      if (req.query.noteId && mongoose.Types.ObjectId.isValid(req.query.noteId as string)) {
        query.noteId = new mongoose.Types.ObjectId(req.query.noteId as string);
      }

      const attachments = await Attachment.find(query).sort({ createdAt: -1 });

      const mapped = attachments.map((a) => ({
        id: a._id.toString(),
        noteId: a.noteId ? a.noteId.toString() : undefined,
        fileSize: a.fileSize,
        encryptedFileKey: a.encryptedFileKey,
        fileKeyIv: a.fileKeyIv,
        fileIv: a.fileIv,
        encryptedFileName: a.encryptedFileName,
        fileNameIv: a.fileNameIv,
        mimeType: a.mimeType,
        createdAt: a.createdAt.toISOString(),
      }));

      res.json({ success: true, data: mapped });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to fetch attachments' });
    }
  }

  public static async download(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, error: 'Invalid attachment ID format' });
        return;
      }

      const attachment = await Attachment.findOne({
        _id: new mongoose.Types.ObjectId(id),
        userId: new mongoose.Types.ObjectId(req.user.id),
      });

      if (!attachment) {
        res.status(404).json({ success: false, error: 'Attachment not found or access denied.' });
        return;
      }

      if (!fs.existsSync(attachment.fileLocation)) {
        res.status(404).json({ success: false, error: 'Encrypted file blob missing on server storage' });
        return;
      }

      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('X-Encrypted-File-Key', attachment.encryptedFileKey);
      res.setHeader('X-File-Key-Iv', attachment.fileKeyIv);
      res.setHeader('X-File-Iv', attachment.fileIv);
      res.setHeader('X-Encrypted-File-Name', attachment.encryptedFileName);
      res.setHeader('X-File-Name-Iv', attachment.fileNameIv);
      res.setHeader('X-Mime-Type', attachment.mimeType);

      const stream = fs.createReadStream(attachment.fileLocation);
      stream.pipe(res);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to download encrypted attachment' });
    }
  }

  public static async deleteAttachment(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, error: 'Invalid attachment ID format' });
        return;
      }

      const attachment = await Attachment.findOneAndDelete({
        _id: new mongoose.Types.ObjectId(id),
        userId: new mongoose.Types.ObjectId(req.user.id),
      });

      if (!attachment) {
        res.status(404).json({ success: false, error: 'Attachment not found or access denied.' });
        return;
      }

      if (fs.existsSync(attachment.fileLocation)) {
        fs.unlinkSync(attachment.fileLocation);
      }

      res.json({ success: true, message: 'Attachment deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to delete attachment' });
    }
  }
}
