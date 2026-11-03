import mongoose, { Schema, Document } from 'mongoose';
import { KdfParameters } from '@zerolock/shared';

export interface IVault extends Document {
  userId: mongoose.Types.ObjectId;
  salt: string;                   // Base64 salt used for Argon2id KEK derivation
  kdfAlgorithm: 'argon2id' | 'pbkdf2';
  kdfParameters: KdfParameters;
  wrappedVaultKey: string;        // Base64 ciphertext of AES-256-GCM wrapped vault key
  wrappedVaultKeyIv: string;      // Base64 96-bit IV
  recoveryWrappedVaultKey?: string; // Optional recovery-wrapped vault key
  recoveryIv?: string;
  vaultVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

const VaultSchema = new Schema<IVault>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    salt: {
      type: String,
      required: true,
    },
    kdfAlgorithm: {
      type: String,
      enum: ['argon2id', 'pbkdf2'],
      default: 'argon2id',
      required: true,
    },
    kdfParameters: {
      memoryCost: { type: Number, required: true },
      timeCost: { type: Number, required: true },
      parallelism: { type: Number, required: true },
      hashLength: { type: Number, required: true },
    },
    wrappedVaultKey: {
      type: String,
      required: true,
    },
    wrappedVaultKeyIv: {
      type: String,
      required: true,
    },
    recoveryWrappedVaultKey: {
      type: String,
      default: null,
    },
    recoveryIv: {
      type: String,
      default: null,
    },
    vaultVersion: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

export const Vault = mongoose.model<IVault>('Vault', VaultSchema);
