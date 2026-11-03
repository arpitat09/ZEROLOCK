import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { Vault } from '../models/Vault';
import { Session } from '../models/Session';
import { config } from '../config';
import { AuditService } from '../services/auditService';

export class AuthController {
  public static async register(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, password } = req.body;

      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        res.status(400).json({ success: false, error: 'An account with this email already exists.' });
        return;
      }

      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash(password, salt);

      const user = await User.create({
        name,
        email: email.toLowerCase(),
        passwordHash,
      });

      const deviceInformation = (req.headers['user-agent'] as string) || 'Browser Session';
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const session = await Session.create({
        userId: user._id,
        tokenHash: 'pending',
        deviceInformation,
        ipAddress,
        expiresAt,
      });

      const token = jwt.sign(
        { id: user._id.toString(), email: user.email, sessionId: session._id.toString() },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn as any }
      );

      session.tokenHash = await bcrypt.hash(token.slice(-16), 8);
      await session.save();

      res.cookie('token', token, {
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      await AuditService.logEvent(user._id, 'LOGIN', req, 'SUCCESS', 'Account registered and logged in');

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            createdAt: user.createdAt.toISOString(),
          },
          token,
          vaultStatus: {
            isConfigured: false,
          },
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Registration failed' });
    }
  }

  public static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        res.status(401).json({ success: false, error: 'Invalid email or password.' });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        await AuditService.logEvent(user._id, 'FAILED_LOGIN', req, 'FAILURE', 'Incorrect account password');
        res.status(401).json({ success: false, error: 'Invalid email or password.' });
        return;
      }

      const vault = await Vault.findOne({ userId: user._id });

      const deviceInformation = (req.headers['user-agent'] as string) || 'Browser Session';
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const session = await Session.create({
        userId: user._id,
        tokenHash: 'pending',
        deviceInformation,
        ipAddress,
        expiresAt,
      });

      const token = jwt.sign(
        { id: user._id.toString(), email: user.email, sessionId: session._id.toString() },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn as any }
      );

      session.tokenHash = await bcrypt.hash(token.slice(-16), 8);
      await session.save();

      res.cookie('token', token, {
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      await AuditService.logEvent(user._id, 'LOGIN', req, 'SUCCESS', 'Account login successful');

      res.json({
        success: true,
        data: {
          user: {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            createdAt: user.createdAt.toISOString(),
          },
          token,
          vaultStatus: {
            isConfigured: !!vault,
            vaultVersion: vault?.vaultVersion,
          },
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Login failed' });
    }
  }

  public static async logout(req: Request, res: Response): Promise<void> {
    try {
      if (req.sessionId) {
        await Session.findByIdAndUpdate(req.sessionId, { revokedAt: new Date() });
      }

      if (req.user) {
        await AuditService.logEvent(req.user.id, 'LOGOUT', req, 'SUCCESS', 'User logged out');
      }

      res.clearCookie('token');
      res.json({ success: true, message: 'Logged out successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Logout failed' });
    }
  }

  public static async me(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const user = await User.findById(req.user.id);
      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      const vault = await Vault.findOne({ userId: user._id });

      res.json({
        success: true,
        data: {
          user: {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            createdAt: user.createdAt.toISOString(),
          },
          vaultStatus: {
            isConfigured: !!vault,
            vaultVersion: vault?.vaultVersion,
          },
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to fetch user profile' });
    }
  }

  public static async changePassword(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { currentPassword, newPassword } = req.body;
      const user = await User.findById(req.user.id);
      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) {
        res.status(400).json({ success: false, error: 'Current account password is incorrect.' });
        return;
      }

      const salt = await bcrypt.genSalt(12);
      user.passwordHash = await bcrypt.hash(newPassword, salt);
      await user.save();

      await AuditService.logEvent(user._id, 'PASSWORD_CHANGE', req, 'SUCCESS', 'Account password changed');

      res.json({ success: true, message: 'Account password updated successfully. Note that this did not affect your vault encryption key.' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to change password' });
    }
  }
}
