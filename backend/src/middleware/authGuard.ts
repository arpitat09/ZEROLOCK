import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { Session } from '../models/Session';

export interface AuthenticatedUser {
  id: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      sessionId?: string;
    }
  }
}

export const authGuard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Check Authorization header or cookie
    let token = req.cookies?.token;

    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }

    if (!token) {
      res.status(401).json({ success: false, error: 'Authentication required. No session token provided.' });
      return;
    }

    // Verify JWT
    const decoded = jwt.verify(token, config.jwtSecret) as { id: string; email: string; sessionId?: string };

    // Check if session exists and is active (not revoked or expired)
    if (decoded.sessionId) {
      const session = await Session.findOne({
        _id: decoded.sessionId,
        userId: decoded.id,
        revokedAt: null,
      });

      if (!session || session.expiresAt < new Date()) {
        res.status(401).json({ success: false, error: 'Session expired or revoked. Please log in again.' });
        return;
      }
    }

    req.user = { id: decoded.id, email: decoded.email };
    req.sessionId = decoded.sessionId;
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid or expired session token.' });
  }
};
