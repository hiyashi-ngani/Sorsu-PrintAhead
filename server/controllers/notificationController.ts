import type { Request, Response } from 'express';
import { db } from '../db/database.ts';
import { AuthService } from '../services/authService.ts';

export class NotificationController {
  static async getNotifications(req: Request, res: Response): Promise<void> {
    try {
      const user = AuthService.verifyToken(req.headers.authorization);
      if (!user) {
        res.status(401).json({ error: 'Unauthorized.' });
        return;
      }

      const notifications = db.getNotifications(user.id);
      res.json({ notifications });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch notifications.' });
    }
  }

  static async markRead(req: Request, res: Response): Promise<void> {
    try {
      const user = AuthService.verifyToken(req.headers.authorization);
      if (!user) {
        res.status(401).json({ error: 'Unauthorized.' });
        return;
      }

      const { id } = req.params;
      db.markNotificationAsRead(id, user.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to mark read.' });
    }
  }

  static async markAllRead(req: Request, res: Response): Promise<void> {
    try {
      const user = AuthService.verifyToken(req.headers.authorization);
      if (!user) {
        res.status(401).json({ error: 'Unauthorized.' });
        return;
      }

      db.markAllNotificationsAsRead(user.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to mark all read.' });
    }
  }

  static async getEmailLogs(req: Request, res: Response): Promise<void> {
    try {
      const user = AuthService.verifyToken(req.headers.authorization);
      if (!user) {
        res.status(401).json({ error: 'Unauthorized.' });
        return;
      }

      const allLogs = db.getEmailLogs();
      const emailLogs =
        user.role === 'admin' || user.role === 'print_shop_staff'
          ? allLogs
          : allLogs.filter((e) => e.toEmail.toLowerCase() === user.email.toLowerCase());
      res.json({ emailLogs });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch email logs.' });
    }
  }

  static async getBrevoConfig(req: Request, res: Response): Promise<void> {
    const { EmailNotificationService } = await import('../services/emailService.ts');
    const status = EmailNotificationService.getBrevoStatus();
    res.json(status);
  }
}
