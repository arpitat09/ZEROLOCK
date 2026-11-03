import mongoose, { Schema, Document } from 'mongoose';

export interface ISecurityEvent extends Document {
  userId: mongoose.Types.ObjectId;
  eventType: string;
  deviceInformation: string;
  ipAddress?: string;
  status: 'SUCCESS' | 'FAILURE' | 'WARNING';
  details?: string;
  createdAt: Date;
}

const SecurityEventSchema = new Schema<ISecurityEvent>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      index: true,
    },
    deviceInformation: {
      type: String,
      default: 'Unknown Device',
    },
    ipAddress: {
      type: String,
      default: '127.0.0.1',
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILURE', 'WARNING'],
      default: 'SUCCESS',
    },
    details: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

SecurityEventSchema.index({ userId: 1, createdAt: -1 });

export const SecurityEvent = mongoose.model<ISecurityEvent>('SecurityEvent', SecurityEventSchema);
