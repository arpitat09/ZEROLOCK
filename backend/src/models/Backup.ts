import mongoose, { Schema, Document } from 'mongoose';

export interface IBackup extends Document {
  userId: mongoose.Types.ObjectId;
  encryptedBackupLocation: string;
  backupVersion: string;
  checksumSha256: string;
  fileSize: number;
  createdAt: Date;
}

const BackupSchema = new Schema<IBackup>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    encryptedBackupLocation: {
      type: String,
      required: true,
    },
    backupVersion: {
      type: String,
      default: 'zerolock-v1',
    },
    checksumSha256: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const Backup = mongoose.model<IBackup>('Backup', BackupSchema);
