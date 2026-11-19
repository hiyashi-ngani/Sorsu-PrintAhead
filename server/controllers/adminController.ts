import type { Request, Response } from 'express';
import { db } from '../db/database.ts';
import { AuthService } from '../services/authService.ts';
import type { UserRole, PrintShop } from '../../src/types/index.ts';

export class AdminController {
  private static requireAdmin(req: Request, res: Response) {
    const user = AuthService.verifyToken(req.headers.authorization);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized.' });
      return null;
    }
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Admin privileges required.' });
      return null;
    }
    return user;
  }

  /**
   * System-wide overview metrics for Admin Dashboard
   */
  static async getOverview(req: Request, res: Response): Promise<void> {
    const admin = AdminController.requireAdmin(req, res);
    if (!admin) return;

    const users = db.getUsers();
    const shops = db.getPrintShops();
    const requests = db.getPrintRequests();
    const payments = db.getPayments();

    const completedRevenue = payments
      .filter((p) => p.paymentStatus === 'Confirmed')
      .reduce((sum, p) => sum + p.amount, 0);

    res.json({
      stats: {
        totalUsers: users.length,
        totalStudentsAndRunners: users.filter(
          (u) => u.role === 'student' || u.role === 'student_runner'
        ).length,
        totalShopStaff: users.filter((u) => u.role === 'print_shop_staff').length,
        totalShops: shops.length,
        activeShops: shops.filter((s) => s.isActive).length,
        totalRequests: requests.length,
        activeRequests: requests.filter(
          (r) => r.status !== 'Completed' && r.status !== 'Cancelled'
        ).length,
        completedRequests: requests.filter((r) => r.status === 'Completed').length,
        completedRevenue,
      },
      users,
      shops,
      requests,
    });
  }

  /**
   * List all registered system accounts
   */
  static async getUsers(req: Request, res: Response): Promise<void> {
    const admin = AdminController.requireAdmin(req, res);
    if (!admin) return;
    res.json({ users: db.getUsers() });
  }

  /**
   * Assign or update a user's system role (admin, student, student_runner, print_shop_staff)
   */
  static async updateUserRole(req: Request, res: Response): Promise<void> {
    const admin = AdminController.requireAdmin(req, res);
    if (!admin) return;

    const { id } = req.params;
    const { role, shopId } = req.body as { role: UserRole; shopId?: string | null };

    const validRoles: UserRole[] = ['admin', 'student', 'student_runner', 'print_shop_staff'];
    if (!validRoles.includes(role)) {
      res.status(400).json({ error: 'Invalid user role specified.' });
      return;
    }

    if (id === admin.id && role !== 'admin') {
      res.status(400).json({ error: 'You cannot revoke your own admin role while signed in.' });
      return;
    }

    const updated = db.updateUserRole(id, role, shopId);
    if (!updated) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    res.json({ success: true, user: updated });
  }

  /**
   * Public/authenticated list of campus printing shops
   */
  static async getShops(req: Request, res: Response): Promise<void> {
    const user = AuthService.verifyToken(req.headers.authorization);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    const shops = db.getPrintShops();
    res.json({
      shops: user.role === 'admin' ? shops : shops.filter((s) => s.isActive),
    });
  }

  /**
   * Create a new campus printing shop (Admin only)
   */
  static async createShop(req: Request, res: Response): Promise<void> {
    const admin = AdminController.requireAdmin(req, res);
    if (!admin) return;

    const { name, location, operatingHours, contactEmail } = req.body;
    if (!name || !name.trim() || !location || !location.trim()) {
      res.status(400).json({ error: 'Shop name and campus location are required.' });
      return;
    }

    const newShop: PrintShop = {
      id: `shop-${Date.now()}`,
      name: name.trim(),
      location: location.trim(),
      operatingHours: (operatingHours || '8:00 AM - 5:00 PM (Mon-Fri)').trim(),
      contactEmail: (contactEmail || 'printshop@sorsu.edu.ph').trim(),
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    db.createPrintShop(newShop);
    res.status(201).json({ success: true, shop: newShop });
  }

  /**
   * Update / toggle status of a printing shop (Admin only)
   */
  static async updateShop(req: Request, res: Response): Promise<void> {
    const admin = AdminController.requireAdmin(req, res);
    if (!admin) return;

    const { id } = req.params;
    const { name, location, operatingHours, contactEmail, isActive } = req.body;

    const updates: Partial<PrintShop> = {};
    if (typeof name === 'string' && name.trim()) updates.name = name.trim();
    if (typeof location === 'string' && location.trim()) updates.location = location.trim();
    if (typeof operatingHours === 'string' && operatingHours.trim()) updates.operatingHours = operatingHours.trim();
    if (typeof contactEmail === 'string' && contactEmail.trim()) updates.contactEmail = contactEmail.trim();
    if (typeof isActive === 'boolean') updates.isActive = isActive;

    const updated = db.updatePrintShop(id, updates);
    if (!updated) {
      res.status(404).json({ error: 'Printing shop not found.' });
      return;
    }

    res.json({ success: true, shop: updated });
  }
}
