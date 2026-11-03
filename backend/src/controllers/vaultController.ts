import { Request, Response } from 'express';
import { Vault } from '../models/Vault';
import { AuditService } from '../services/auditService';

export class VaultController {
  public static async setup(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const existingVault = await Vault.findOne({ userId: req.user.id });
      if (existingVault) {
        res.status(400).json({ success: false, error: 'Vault is already configured for this account.' });
        return;
      }

      const {
        salt,
        kdfAlgorithm,
        kdfParameters,
        wrappedVaultKey,
        wrappedVaultKeyIv,
        recoveryWrappedVaultKey,
        recoveryIv,
      } = req.body;

      const vault = await Vault.create({
        userId: req.user.id,
        salt,
        kdfAlgorithm,
        kdfParameters,
        wrappedVaultKey,
        wrappedVaultKeyIv,
        recoveryWrappedVaultKey: recoveryWrappedVaultKey || null,
        recoveryIv: recoveryIv || null,
        vaultVersion: 1,
      });

      await AuditService.logEvent(req.user.id, 'VAULT_SETUP', req, 'SUCCESS', 'Cryptographic vault configured');

      if (recoveryWrappedVaultKey) {
        await AuditService.logEvent(req.user.id, 'RECOVERY_SETUP', req, 'SUCCESS', 'Emergency recovery key configured');
      }

      res.status(201).json({
        success: true,
        data: {
          salt: vault.salt,
          kdfAlgorithm: vault.kdfAlgorithm,
          kdfParameters: vault.kdfParameters,
          wrappedVaultKey: vault.wrappedVaultKey,
          wrappedVaultKeyIv: vault.wrappedVaultKeyIv,
          recoveryWrappedVaultKey: vault.recoveryWrappedVaultKey,
          recoveryIv: vault.recoveryIv,
          vaultVersion: vault.vaultVersion,
          updatedAt: vault.updatedAt.toISOString(),
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to setup vault' });
    }
  }

  public static async getMetadata(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const vault = await Vault.findOne({ userId: req.user.id });
      if (!vault) {
        res.status(404).json({ success: false, error: 'Vault not initialized. Please complete setup.' });
        return;
      }

      res.json({
        success: true,
        data: {
          salt: vault.salt,
          kdfAlgorithm: vault.kdfAlgorithm,
          kdfParameters: vault.kdfParameters,
          wrappedVaultKey: vault.wrappedVaultKey,
          wrappedVaultKeyIv: vault.wrappedVaultKeyIv,
          recoveryWrappedVaultKey: vault.recoveryWrappedVaultKey,
          recoveryIv: vault.recoveryIv,
          vaultVersion: vault.vaultVersion,
          updatedAt: vault.updatedAt.toISOString(),
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to retrieve vault metadata' });
    }
  }

  public static async rotateKey(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const vault = await Vault.findOne({ userId: req.user.id });
      if (!vault) {
        res.status(404).json({ success: false, error: 'Vault not found' });
        return;
      }

      const {
        salt,
        kdfAlgorithm,
        kdfParameters,
        wrappedVaultKey,
        wrappedVaultKeyIv,
        recoveryWrappedVaultKey,
        recoveryIv,
      } = req.body;

      vault.salt = salt;
      vault.kdfAlgorithm = kdfAlgorithm;
      vault.kdfParameters = kdfParameters;
      vault.wrappedVaultKey = wrappedVaultKey;
      vault.wrappedVaultKeyIv = wrappedVaultKeyIv;
      if (recoveryWrappedVaultKey !== undefined) {
        vault.recoveryWrappedVaultKey = recoveryWrappedVaultKey;
        vault.recoveryIv = recoveryIv || null;
      }
      vault.vaultVersion += 1;

      await vault.save();

      await AuditService.logEvent(req.user.id, 'KEY_ROTATION', req, 'SUCCESS', `Master password rotated (Vault v${vault.vaultVersion})`);

      res.json({
        success: true,
        data: {
          vaultVersion: vault.vaultVersion,
          updatedAt: vault.updatedAt.toISOString(),
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to rotate vault key' });
    }
  }

  public static async recoveryStatus(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const vault = await Vault.findOne({ userId: req.user.id });
      if (!vault) {
        res.status(404).json({ success: false, error: 'Vault not found' });
        return;
      }

      res.json({
        success: true,
        data: {
          hasRecoveryKey: !!vault.recoveryWrappedVaultKey,
          vaultVersion: vault.vaultVersion,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to get recovery status' });
    }
  }

  public static async logEvent(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { eventType, status, details } = req.body;
      if (['VAULT_UNLOCK', 'VAULT_LOCK', 'RECOVERY_USED'].includes(eventType)) {
        await AuditService.logEvent(req.user.id, eventType as any, req, status || 'SUCCESS', details || '');
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}
