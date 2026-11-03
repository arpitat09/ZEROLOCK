import { Request } from 'express';
import mongoose from 'mongoose';
import { SecurityEvent } from '../models/SecurityEvent';

export class AuditService {
  public static async logEvent(
    userId: string | mongoose.Types.ObjectId,
    eventType: 'LOGIN' | 'FAILED_LOGIN' | 'LOGOUT' | 'VAULT_SETUP' | 'VAULT_UNLOCK' | 'VAULT_LOCK' | 'KEY_ROTATION' | 'RECOVERY_SETUP' | 'RECOVERY_USED' | 'PASSWORD_CHANGE' | 'SESSION_REVOKED',
    req: Request,
    status: 'SUCCESS' | 'FAILURE' | 'WARNING' = 'SUCCESS',
    details: string = ''
  ): Promise<void> {
    try {
      const deviceInformation = req.headers['user-agent'] || 'Unknown Browser';
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

      await SecurityEvent.create({
        userId: new mongoose.Types.ObjectId(userId),
        eventType,
        deviceInformation,
        ipAddress,
        status,
        details,
      });
    } catch (err) {
      console.error('Failed to log security audit event:', err);
    }
  }
}
