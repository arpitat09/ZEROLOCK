import { Request, Response } from 'express';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Backup } from '../models/Backup';
import { config } from '../config';

const backupsDir = path.resolve(process.cwd(), config.uploadDir, 'backups');
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

export class BackupController {
  public static async createBackup(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { bundle } = req.body;
      if (!bundle || !bundle.vaultMetadata || !bundle.notes) {
        res.status(400).json({ success: false, error: 'Invalid encrypted backup bundle structure' });
        return;
      }

      const bundleStr = JSON.stringify(bundle);
      const computedHash = crypto.createHash('sha256').update(bundleStr).digest('hex');

      const filename = `backup_${req.user.id}_${Date.now()}.enc.json`;
      const filePath = path.join(backupsDir, filename);

      fs.writeFileSync(filePath, bundleStr, 'utf-8');

      const backup = await Backup.create({
        userId: new mongoose.Types.ObjectId(req.user.id),
        encryptedBackupLocation: filePath,
        backupVersion: bundle.formatVersion || 'zerolock-v1',
        checksumSha256: computedHash,
        fileSize: Buffer.byteLength(bundleStr),
      });

      res.status(201).json({
        success: true,
        data: {
          id: backup._id.toString(),
          backupVersion: backup.backupVersion,
          checksumSha256: backup.checksumSha256,
          fileSize: backup.fileSize,
          createdAt: backup.createdAt.toISOString(),
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to store backup' });
    }
  }

  public static async getBackups(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const backups = await Backup.find({
        userId: new mongoose.Types.ObjectId(req.user.id),
      }).sort({ createdAt: -1 });

      const mapped = backups.map((b) => ({
        id: b._id.toString(),
        backupVersion: b.backupVersion,
        checksumSha256: b.checksumSha256,
        fileSize: b.fileSize,
        createdAt: b.createdAt.toISOString(),
      }));

      res.json({ success: true, data: mapped });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to list backups' });
    }
  }

  public static async downloadBackup(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const backup = await Backup.findOne({
        _id: new mongoose.Types.ObjectId(id),
        userId: new mongoose.Types.ObjectId(req.user.id),
      });

      if (!backup || !fs.existsSync(backup.encryptedBackupLocation)) {
        res.status(404).json({ success: false, error: 'Backup not found' });
        return;
      }

      const content = fs.readFileSync(backup.encryptedBackupLocation, 'utf-8');
      const parsed = JSON.parse(content);

      res.json({ success: true, data: parsed });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to retrieve backup' });
    }
  }

  public static async deleteBackup(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const backup = await Backup.findOneAndDelete({
        _id: new mongoose.Types.ObjectId(id),
        userId: new mongoose.Types.ObjectId(req.user.id),
      });

      if (!backup) {
        res.status(404).json({ success: false, error: 'Backup not found' });
        return;
      }

      if (fs.existsSync(backup.encryptedBackupLocation)) {
        fs.unlinkSync(backup.encryptedBackupLocation);
      }

      res.json({ success: true, message: 'Backup deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to delete backup' });
    }
  }
}
