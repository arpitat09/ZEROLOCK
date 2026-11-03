import { z } from 'zod';

export const vaultSetupSchema = z.object({
  salt: z.string().min(16, 'Salt must be at least 16 characters base64'),
  kdfAlgorithm: z.enum(['argon2id', 'pbkdf2']),
  kdfParameters: z.object({
    memoryCost: z.number().int().positive(),
    timeCost: z.number().int().positive(),
    parallelism: z.number().int().positive(),
    hashLength: z.number().int().positive(),
  }),
  wrappedVaultKey: z.string().min(1, 'Wrapped vault key is required'),
  wrappedVaultKeyIv: z.string().min(1, 'Wrapped vault key IV is required'),
  recoveryWrappedVaultKey: z.string().optional(),
  recoveryIv: z.string().optional(),
});

export const vaultRotateSchema = z.object({
  salt: z.string().min(16, 'Salt must be at least 16 characters base64'),
  kdfAlgorithm: z.enum(['argon2id', 'pbkdf2']),
  kdfParameters: z.object({
    memoryCost: z.number().int().positive(),
    timeCost: z.number().int().positive(),
    parallelism: z.number().int().positive(),
    hashLength: z.number().int().positive(),
  }),
  wrappedVaultKey: z.string().min(1, 'Wrapped vault key is required'),
  wrappedVaultKeyIv: z.string().min(1, 'Wrapped vault key IV is required'),
  recoveryWrappedVaultKey: z.string().optional(),
  recoveryIv: z.string().optional(),
});
