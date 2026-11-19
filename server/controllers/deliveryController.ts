import type { Request, Response } from 'express';
import { db } from '../db/database.ts';
import { AuthService } from '../services/authService.ts';
import { EmailNotificationService } from '../services/emailService.ts';
import { canAcceptDeliveryJob, canRunnerAcceptJob, canCompleteRequest } from '../../src/utils/rules.ts';
import type { DeliveryJob, Payment } from '../../src/types/index.ts';

export class DeliveryController {
  /**
   * UC9: Get available delivery jobs (Ready for Delivery and unclaimed)
   */
  static async getAvailableJobs(req: Request, res: Response): Promise<void> {
    try {
      const user = AuthService.verifyToken(req.headers.authorization);
      if (!user) {
        res.status(401).json({ error: 'Unauthorized.' });
        return;
      }
      if (!canAcceptDeliveryJob(user.role)) {
        res.status(403).json({ error: 'Only Students and Student Runners can view available delivery jobs.' });
        return;
      }

      const all = db.getPrintRequests();
      const available = all.filter((r) =>
        canRunnerAcceptJob(
          { status: r.status, runnerId: r.deliveryJob?.runnerId, studentId: r.studentId },
          user.id
        )
      );
      res.json({ jobs: available });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch available jobs.' });
    }
  }

  /**
   * UC10: Get runner's active and completed jobs
   */
  static async getRunnerJobs(req: Request, res: Response): Promise<void> {
    try {
      const user = AuthService.verifyToken(req.headers.authorization);
      if (!user) {
        res.status(401).json({ error: 'Unauthorized.' });
        return;
      }
      if (!canAcceptDeliveryJob(user.role)) {
        res.status(403).json({ error: 'Only Students and Student Runners can view assigned delivery jobs.' });
        return;
      }

      const all = db.getPrintRequests();
      const myJobs = all.filter(
        (r) => r.deliveryJob && r.deliveryJob.runnerId === user.id
      );

      res.json({ jobs: myJobs });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch runner jobs.' });
    }
  }

  /**
   * UC9: Accept Delivery Job (Combined Student + Runner portal)
   */
  static async acceptJob(req: Request, res: Response): Promise<void> {
    try {
      const user = AuthService.verifyToken(req.headers.authorization);
      if (!user || !canAcceptDeliveryJob(user.role)) {
        res.status(403).json({ error: 'Only Students and Student Runners can accept delivery jobs.' });
        return;
      }

      const { id } = req.params;
      const request = db.getPrintRequestById(id);

      if (!request) {
        res.status(404).json({ error: 'Print request not found.' });
        return;
      }

      if (request.studentId === user.id) {
        res.status(400).json({ error: 'You cannot accept a delivery job for your own print request.' });
        return;
      }

      if (request.status !== 'Ready for Delivery') {
        res.status(400).json({ error: 'Job is not ready for delivery or has already been taken.' });
        return;
      }

      if (request.deliveryJob && request.deliveryJob.runnerId) {
        res.status(409).json({ error: 'Another runner has already accepted this delivery job.' });
        return;
      }

      const deliveryJob: DeliveryJob = {
        id: `job-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        printRequestId: request.id,
        runnerId: user.id,
        runnerName: user.fullName,
        deliveryStatus: 'Out for Delivery',
        acceptedAt: new Date().toISOString(),
        deliveredAt: null,
      };

      db.createDeliveryJob(deliveryJob);

      const updated = db.updatePrintRequest(request.id, {
        status: 'Out for Delivery',
        deliveryJob,
      });

      if (updated) {
        await EmailNotificationService.sendStatusChangeNotification(
          updated,
          'Out for Delivery',
          `Student Runner ${user.fullName} accepted your delivery job and is on their way to ${request.roomNumber}. Total amount to pay: ₱${request.printPrice ? request.printPrice.toFixed(2) : '0.00'}.`
        );
      }

      res.json({
        success: true,
        message: `Delivery job ${request.referenceNumber} accepted! Proceed to deliver to ${request.roomNumber}.`,
        request: updated,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to accept delivery job.' });
    }
  }

  /**
   * UC10: Deliver Printouts (Mark job as delivered to room)
   */
  static async markDelivered(req: Request, res: Response): Promise<void> {
    try {
      const user = AuthService.verifyToken(req.headers.authorization);
      if (!user || !canAcceptDeliveryJob(user.role)) {
        res.status(403).json({ error: 'Only authorized delivery users can mark printouts as delivered.' });
        return;
      }

      const { id } = req.params;
      const request = db.getPrintRequestById(id);

      if (!request || !request.deliveryJob) {
        res.status(404).json({ error: 'Delivery job not found.' });
        return;
      }

      if (request.deliveryJob.runnerId !== user.id) {
        res.status(403).json({ error: 'You are not assigned to this delivery job.' });
        return;
      }

      const deliveredAt = new Date().toISOString();
      const updatedJob = db.updateDeliveryJob(request.deliveryJob.id, {
        deliveryStatus: 'Delivered',
        deliveredAt,
      });

      const hasPaid = Boolean(request.payment && request.payment.paymentStatus === 'Confirmed');
      const isComplete = canCompleteRequest(true, hasPaid);

      const updated = db.updatePrintRequest(request.id, {
        status: isComplete ? 'Completed' : request.status,
        deliveryJob: {
          ...request.deliveryJob,
          deliveryStatus: 'Delivered',
          deliveredAt,
        },
      });

      if (updated && isComplete) {
        await EmailNotificationService.sendStatusChangeNotification(
          updated,
          'Completed',
          'Document has been delivered to your room and cash payment was confirmed.'
        );
      }

      res.json({
        success: true,
        message: 'Printout marked as delivered to student room!',
        request: updated,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to mark as delivered.' });
    }
  }

  /**
   * UC11: Confirm Cash Payment
   * Rule: Record cash payment, runner responsible, and mark Completed once delivered and paid.
   */
  static async confirmPayment(req: Request, res: Response): Promise<void> {
    try {
      const user = AuthService.verifyToken(req.headers.authorization);
      if (!user || !canAcceptDeliveryJob(user.role)) {
        res.status(403).json({ error: 'Only authorized delivery users can confirm cash payments.' });
        return;
      }

      const { id } = req.params;
      const request = db.getPrintRequestById(id);

      if (!request) {
        res.status(404).json({ error: 'Print request not found.' });
        return;
      }

      if (!request.deliveryJob || request.deliveryJob.runnerId !== user.id) {
        res.status(403).json({ error: 'You are not authorized for this delivery transaction.' });
        return;
      }

      if (request.payment && request.payment.paymentStatus === 'Confirmed') {
        res.status(400).json({ error: 'Cash payment has already been confirmed.' });
        return;
      }

      const amount = request.printPrice || 0;
      const payment: Payment = {
        id: `pay-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        printRequestId: request.id,
        runnerId: user.id,
        runnerName: user.fullName,
        amount,
        paymentMethod: 'Cash on Delivery',
        paymentStatus: 'Confirmed',
        confirmedAt: new Date().toISOString(),
      };

      db.createPayment(payment);

      const isDelivered = request.deliveryJob.deliveryStatus === 'Delivered';
      const isComplete = canCompleteRequest(isDelivered, true);

      const updated = db.updatePrintRequest(request.id, {
        status: isComplete ? 'Completed' : request.status,
        payment,
      });

      if (updated && isComplete) {
        await EmailNotificationService.sendStatusChangeNotification(
          updated,
          'Completed',
          `Cash payment of ₱${amount.toFixed(2)} received and verified by Runner ${user.fullName}. Request is now Completed.`
        );
      }

      res.json({
        success: true,
        message: `Cash payment of ₱${amount.toFixed(2)} confirmed successfully!`,
        request: updated,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to confirm cash payment.' });
    }
  }
}
