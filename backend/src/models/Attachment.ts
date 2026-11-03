import mongoose, { Schema, Document } from 'mongoose';

export interface IAttachment extends Document {
  userId: mongoose.Types.ObjectId;
  noteId?: mongoose.Types.ObjectId;
  fileLocation: string;
  encryptedFileKey: string;
  fileKeyIv: string;
  fileIv: string;
  fileSize: number;
  encryptedFileName: string;
  fileNameIv: string;
  mimeType: string;
  createdAt: Date;
  updatedAt: Date;
}

const AttachmentSchema = new Schema<IAttachment>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    noteId: {
      type: Schema.Types.ObjectId,
      ref: 'Note',
      default: null,
      index: true,
    },
    fileLocation: {
      type: String,
      required: true,
    },
    encryptedFileKey: {
      type: String,
      required: true,
    },
    fileKeyIv: {
      type: String,
      required: true,
    },
    fileIv: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    encryptedFileName: {
      type: String,
      required: true,
    },
    fileNameIv: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Attachment = mongoose.model<IAttachment>('Attachment', AttachmentSchema);
