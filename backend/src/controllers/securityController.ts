import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Session } from '../models/Session';
import { SecurityEvent } from '../models/SecurityEvent';
import { AuditService } from '../services/auditService';

export class SecurityController {
  public static async getSessions(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const sessions = await Session.find({
        userId: new mongoose.Types.ObjectId(req.user.id),
        revokedAt: null,
        expiresAt: { $gt: new Date() },
      }).sort({ createdAt: -1 });

      const mapped = sessions.map((s) => ({
        id: s._id.toString(),
        userId: s.userId.toString(),
        deviceInformation: s.deviceInformation,
        ipAddress: s.ipAddress,
        createdAt: s.createdAt.toISOString(),
        expiresAt: s.expiresAt.toISOString(),
        isCurrent: req.sessionId ? s._id.toString() === req.sessionId : false,
      }));

      res.json({ success: true, data: mapped });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to fetch sessions' });
    }
  }

  public static async revokeSession(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, error: 'Invalid session ID' });
        return;
      }

      const session = await Session.findOneAndUpdate(
        {
          _id: new mongoose.Types.ObjectId(id),
          userId: new mongoose.Types.ObjectId(req.user.id),
        },
        { revokedAt: new Date() },
        { new: true }
      );

      if (!session) {
        res.status(404).json({ success: false, error: 'Session not found' });
        return;
      }

      await AuditService.logEvent(req.user.id, 'SESSION_REVOKED', req, 'SUCCESS', `Session revoked: ${session.deviceInformation}`);

      res.json({ success: true, message: 'Session revoked successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to revoke session' });
    }
  }

  public static async getSecurityEvents(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const events = await SecurityEvent.find({
        userId: new mongoose.Types.ObjectId(req.user.id),
      })
        .sort({ createdAt: -1 })
        .limit(50);

      const mapped = events.map((e) => ({
        id: e._id.toString(),
        userId: e.userId.toString(),
        eventType: e.eventType,
        timestamp: e.createdAt.toISOString(),
        deviceInformation: e.deviceInformation,
        ipAddress: e.ipAddress,
        status: e.status,
        details: e.details,
      }));

      res.json({ success: true, data: mapped });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to fetch security events' });
    }
  }
}
