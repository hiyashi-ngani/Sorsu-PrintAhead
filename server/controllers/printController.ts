import type { Request, Response } from 'express';
import { db } from '../db/database.ts';
import { AuthService } from '../services/authService.ts';
import { EmailNotificationService } from '../services/emailService.ts';
import {
  generateReferenceNumber,
  canStudentCancelRequest,
  validatePrintPrice,
  canSubmitPrintRequest,
} from '../../src/utils/rules.ts';
import type { PrintRequest, RequestStatus } from '../../src/types/index.ts';

export class PrintController {
  /**
   * UC2: Submit Print Request
   */
  static async submitRequest(req: Request, res: Response): Promise<void> {
    try {
      const user = AuthService.verifyToken(req.headers.authorization);
      if (!user) {
        res.status(401).json({ error: 'Unauthorized. Please sign in with your SorSU account.' });
        return;
      }

      if (!canSubmitPrintRequest(user.role)) {
        res.status(403).json({ error: 'Only Students and Student Runners can submit print requests.' });
        return;
      }

      const { fullName, roomNumber, instructionMessage, shopId } = req.body;
      const file = req.file;

      if (!fullName || !fullName.trim()) {
        res.status(400).json({ error: 'Full name is required.' });
        return;
      }
      if (!roomNumber || !roomNumber.trim()) {
        res.status(400).json({ error: 'Campus room number / location is required.' });
        return;
      }
      if (!file) {
        res.status(400).json({ error: 'Document file attachment is required.' });
        return;
      }

      const activeShops = db.getPrintShops().filter((s) => s.isActive);
      const chosenShop = shopId ? db.getPrintShopById(shopId) : activeShops[0];

      // Generate unique reference number
      const referenceNumber = generateReferenceNumber();

      const newRequest: PrintRequest = {
        id: `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        referenceNumber,
        studentId: user.id,
        fullName: fullName.trim(),
        roomNumber: roomNumber.trim(),
        shopId: chosenShop?.id || 'shop-001',
        shopName: chosenShop?.name || 'SorSU-Bulan Main Print Shop',
        instructionMessage: (instructionMessage || '').trim(),
        filePath: `/uploads/${file.filename}`,
        fileName: file.originalname,
        fileSize: file.size,
        status: 'Pending Review',
        printPrice: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      db.createPrintRequest(newRequest);

      // UC5: Dispatch notification to staff & student
      await EmailNotificationService.sendStatusChangeNotification(newRequest, 'Pending Review');

      res.status(201).json({
        success: true,
        message: 'Print request submitted successfully! Your reference number is ' + referenceNumber,
        request: newRequest,
      });
    } catch (err: any) {
      console.error('[PrintController.submitRequest] Error:', err);
      res.status(500).json({ error: err.message || 'Failed to submit print request.' });
    }
  }

  /**
   * UC3: Track Request Status (Student View)
   */
  static async getStudentRequests(req: Request, res: Response): Promise<void> {
    try {
      const user = AuthService.verifyToken(req.headers.authorization);
      if (!user) {
        res.status(401).json({ error: 'Unauthorized.' });
        return;
      }

      const all = db.getPrintRequests();
      const studentRequests = all.filter((r) => r.studentId === user.id);
      res.json({ requests: studentRequests });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch student requests.' });
    }
  }

  /**
   * UC6 & UC8: Review Print Requests (Staff View)
   */
  static async getAllRequests(req: Request, res: Response): Promise<void> {
    try {
      const user = AuthService.verifyToken(req.headers.authorization);
      if (!user) {
        res.status(401).json({ error: 'Unauthorized.' });
        return;
      }

      if (user.role !== 'print_shop_staff' && user.role !== 'admin') {
        res.status(403).json({ error: 'Access denied. Only Printing Shop staff or Admin can view all requests.' });
        return;
      }

      const all = db.getPrintRequests();
      res.json({ requests: all });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch requests.' });
    }
  }

  /**
   * UC3 & UC6: View Single Request Details
   */
  static async getRequestById(req: Request, res: Response): Promise<void> {
    try {
      const user = AuthService.verifyToken(req.headers.authorization);
      if (!user) {
        res.status(401).json({ error: 'Unauthorized.' });
        return;
      }

      const { id } = req.params;
      const request = db.getPrintRequestById(id);
      if (!request) {
        res.status(404).json({ error: 'Print request not found.' });
        return;
      }

      // Check authorization (student can only view their own)
      if (user.role === 'student' && request.studentId !== user.id) {
        res.status(403).json({ error: 'Access denied.' });
        return;
      }

      res.json({ request });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch request.' });
    }
  }

  /**
   * UC4: Cancel Print Request
   */
  static async cancelRequest(req: Request, res: Response): Promise<void> {
    try {
      const user = AuthService.verifyToken(req.headers.authorization);
      if (!user) {
        res.status(401).json({ error: 'Unauthorized.' });
        return;
      }

      const { id } = req.params;
      const request = db.getPrintRequestById(id);
      if (!request) {
        res.status(404).json({ error: 'Print request not found.' });
        return;
      }

      const cancelCheck = canStudentCancelRequest(
        { studentId: request.studentId, status: request.status },
        user.id
      );

      if (!cancelCheck.canCancel) {
        res.status(400).json({ error: cancelCheck.reason || 'Cannot cancel this request.' });
        return;
      }

      const updated = db.updatePrintRequest(request.id, {
        status: 'Cancelled',
      });

      if (updated) {
        await EmailNotificationService.sendStatusChangeNotification(updated, 'Cancelled');
      }

      res.json({
        success: true,
        message: 'Print request has been cancelled.',
        request: updated,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to cancel request.' });
    }
  }

  /**
   * UC7: Set Print Price (Staff Only)
   */
  static async setPrice(req: Request, res: Response): Promise<void> {
    try {
      const user = AuthService.verifyToken(req.headers.authorization);
      if (!user || user.role !== 'print_shop_staff') {
        res.status(403).json({ error: 'Only Print Shop Staff can set print prices.' });
        return;
      }

      const { id } = req.params;
      const { price } = req.body;

      const validation = validatePrintPrice(price);
      if (!validation.valid || validation.parsedAmount === undefined) {
        res.status(400).json({ error: validation.error || 'Invalid price amount.' });
        return;
      }

      const request = db.getPrintRequestById(id);
      if (!request) {
        res.status(404).json({ error: 'Print request not found.' });
        return;
      }

      const updated = db.updatePrintRequest(request.id, {
        printPrice: validation.parsedAmount,
        status: 'Reviewed / Awaiting Payment',
      });

      if (updated) {
        await EmailNotificationService.sendStatusChangeNotification(
          updated,
          'Reviewed / Awaiting Payment',
          `Staff set printing price to ₱${validation.parsedAmount.toFixed(2)}. Cash payment is due upon room delivery.`
        );
      }

      res.json({
        success: true,
        message: `Price ₱${validation.parsedAmount.toFixed(2)} assigned successfully.`,
        request: updated,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to set price.' });
    }
  }

  /**
   * UC8: Print Documents (Staff updates to 'Printing' or 'Ready for Delivery')
   */
  static async updatePrintStatus(req: Request, res: Response): Promise<void> {
    try {
      const user = AuthService.verifyToken(req.headers.authorization);
      if (!user || user.role !== 'print_shop_staff') {
        res.status(403).json({ error: 'Only Print Shop Staff can update print status.' });
        return;
      }

      const { id } = req.params;
      const { status } = req.body as { status: RequestStatus };

      if (status !== 'Printing' && status !== 'Ready for Delivery') {
        res.status(400).json({ error: 'Status must be Printing or Ready for Delivery.' });
        return;
      }

      const request = db.getPrintRequestById(id);
      if (!request) {
        res.status(404).json({ error: 'Print request not found.' });
        return;
      }

      if (!request.printPrice && status === 'Ready for Delivery') {
        res.status(400).json({ error: 'Cannot mark Ready for Delivery without setting print price first.' });
        return;
      }

      const updated = db.updatePrintRequest(request.id, {
        status,
      });

      if (updated) {
        await EmailNotificationService.sendStatusChangeNotification(updated, status);
      }

      res.json({
        success: true,
        message: `Request status updated to ${status}.`,
        request: updated,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update printing status.' });
    }
  }
}
