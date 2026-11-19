import { db } from '../db/database.ts';
import type { RequestStatus, PrintRequest } from '../../src/types/index.ts';

export class EmailNotificationService {
  private static lastBrevoError: { code?: string; message?: string; suggestion?: string } | null = null;

  /**
   * Returns current Brevo integration configuration status
   */
  static getBrevoStatus(): {
    provider: string;
    isConfigured: boolean;
    senderEmail: string;
    senderName: string;
    lastError: { code?: string; message?: string; suggestion?: string } | null;
  } {
    const brevoApiKey = process.env.BREVO_API_KEY || '';
    const isConfigured = Boolean(brevoApiKey.trim() && brevoApiKey !== 'MY_BREVO_API_KEY');
    const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_NOTIFICATION_SENDER || 'printahead-noreply@sorsu.edu.ph';
    const senderName = process.env.BREVO_SENDER_NAME || 'SorSU: PrintAhead (Bulan Campus)';

    return {
      provider: 'Brevo',
      isConfigured,
      senderEmail,
      senderName,
      lastError: this.lastBrevoError,
    };
  }

  /**
   * Dispatches institutional email notifications via Brevo Transactional Email API (UC5)
   */
  static async sendStatusChangeNotification(
    request: PrintRequest,
    newStatus: RequestStatus,
    customMessage?: string,
    initiatorRole?: string
  ): Promise<void> {
    const student = db.getUserById(request.studentId);
    const toEmail = student?.email || 'student@sorsu.edu.ph';
    const studentName = student?.fullName || request.fullName;

    const subject = `[SorSU: PrintAhead] Status Update for Request ${request.referenceNumber}: ${newStatus}`;
    let bodyDesc = customMessage || '';

    switch (newStatus) {
      case 'Pending Review':
        bodyDesc = `Your printing request ${request.referenceNumber} has been received and is currently Pending Review by the Print Shop Staff. Document: ${request.fileName}.`;
        break;
      case 'Reviewed / Awaiting Payment':
        bodyDesc = `Your request ${request.referenceNumber} has been reviewed by the Print Shop Staff. The assigned printing price is ₱${request.printPrice ? request.printPrice.toFixed(2) : '0.00'}. The job is queued for printing. Payment will be collected in cash upon delivery to your room.`;
        break;
      case 'Printing':
        bodyDesc = `Good news! Your document ${request.fileName} (${request.referenceNumber}) is currently being printed at the SorSU-Bulan Campus Print Shop.`;
        break;
      case 'Ready for Delivery':
        bodyDesc = `Your printout for request ${request.referenceNumber} is printed and packaged! It is now Ready for Delivery. A Student Runner will pick it up and deliver it to ${request.roomNumber}. Total cash amount to prepare: ₱${request.printPrice ? request.printPrice.toFixed(2) : '0.00'}.`;
        break;
      case 'Out for Delivery':
        bodyDesc = `Your printout (${request.referenceNumber}) is now Out for Delivery! Student Runner ${request.deliveryJob?.runnerName || 'assigned runner'} is on their way to deliver it to ${request.roomNumber}. Please prepare ₱${request.printPrice ? request.printPrice.toFixed(2) : '0.00'} in cash.`;
        break;
      case 'Completed':
        bodyDesc = `Your print request ${request.referenceNumber} has been marked Completed! Document delivery and cash payment of ₱${request.printPrice ? request.printPrice.toFixed(2) : '0.00'} have both been confirmed. Thank you for using SorSU: PrintAhead!`;
        break;
      case 'Cancelled':
        bodyDesc = `Your print request ${request.referenceNumber} has been Cancelled as requested. No printing charges apply.`;
        break;
    }

    const fullBody = `Dear ${studentName},

This is an automated update from the SorSU-Bulan Campus Printing & Delivery Management System (PrintAhead).

Request Reference Number: ${request.referenceNumber}
Current Status: ${newStatus}
Room Destination: ${request.roomNumber}
Document: ${request.fileName}
${request.printPrice ? `Printing Fee: ₱${request.printPrice.toFixed(2)} (Cash upon Delivery)` : ''}

Update Details:
${bodyDesc}

If you have any questions, please contact the SorSU Print Shop Staff or look up your request using reference number ${request.referenceNumber} in the portal.

Sincerely,
SorSU PrintAhead System
Sorsogon State University - Bulan Campus`;

    const escapeHtml = (value: string): string =>
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const safeStudentName = escapeHtml(studentName);
    const safeBodyDesc = escapeHtml(bodyDesc);
    const safeRef = escapeHtml(request.referenceNumber);
    const safeStatus = escapeHtml(newStatus);
    const safeRoom = escapeHtml(request.roomNumber);
    const safeFileName = escapeHtml(request.fileName);

    // University-styled HTML template for Brevo
    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #E5E5E5; border-radius: 12px; overflow: hidden; background: #ffffff;">
        <div style="background-color: #800000; padding: 20px 24px; color: #ffffff;">
          <h1 style="margin: 0; font-size: 20px; font-weight: bold; letter-spacing: -0.5px;">Sorsu: <span style="color: #ffffff;">PrintAhead</span></h1>
          <p style="margin: 4px 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #fbcfe8;">Sorsogon State University &bull; Bulan Campus</p>
        </div>
        <div style="padding: 24px; color: #242424; font-size: 14px; line-height: 1.6;">
          <p style="margin-top: 0;">Dear <strong>${safeStudentName}</strong>,</p>
          <p>${safeBodyDesc}</p>
          <div style="background-color: #F5F5F5; border: 1px solid #E5E5E5; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr>
                <td style="padding: 6px 0; color: #666666;">Reference:</td>
                <td style="padding: 6px 0; font-weight: bold; color: #800000; font-family: monospace;">${safeRef}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #666666;">Current Status:</td>
                <td style="padding: 6px 0; font-weight: bold;">${safeStatus}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #666666;">Delivery Room:</td>
                <td style="padding: 6px 0; font-weight: bold;">${safeRoom}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #666666;">Document:</td>
                <td style="padding: 6px 0;">${safeFileName}</td>
              </tr>
              ${request.printPrice ? `
              <tr>
                <td style="padding: 6px 0; color: #666666;">Cash Fee Due:</td>
                <td style="padding: 6px 0; font-weight: bold; color: #047857; font-size: 15px;">₱${request.printPrice.toFixed(2)} (Cash on Delivery)</td>
              </tr>` : ''}
            </table>
          </div>
          <p style="font-size: 12px; color: #777777;">You can track this document anytime in the SorSU: PrintAhead web portal.</p>
        </div>
        <div style="background-color: #F5F5F5; padding: 16px 24px; text-align: center; font-size: 11px; color: #888888; border-top: 1px solid #E5E5E5;">
          Dispatched via Brevo &bull; Sorsogon State University Bulan Campus Printing System &bull; Confidential
        </div>
      </div>
    `;

    // 1. Dispatch through Brevo REST API if configured
    const { isConfigured, senderEmail, senderName } = this.getBrevoStatus();
    let provider: 'Brevo' | 'Brevo (Simulation)' | 'Brevo (Permission Required)' = 'Brevo (Simulation)';
    let messageId = `sim-brevo-${Date.now()}`;
    let errorDetails: string | undefined = undefined;

    if (isConfigured) {
      try {
        const brevoApiKey = process.env.BREVO_API_KEY!.trim();
        const brevoPayload = {
          sender: {
            name: senderName,
            email: senderEmail,
          },
          to: [
            {
              email: toEmail,
              name: studentName,
            },
          ],
          subject,
          htmlContent: htmlBody,
          textContent: fullBody,
        };

        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'api-key': brevoApiKey,
            'content-type': 'application/json',
          },
          body: JSON.stringify(brevoPayload),
        });

        if (response.ok) {
          const resData = await response.json();
          provider = 'Brevo';
          messageId = resData.messageId || `brevo-${Date.now()}`;
          this.lastBrevoError = null;
          console.log(`[Brevo] Successfully sent transactional email to ${toEmail}. MessageID: ${messageId}`);
        } else {
          const errText = await response.text();
          let parsedErr: any = {};
          try {
            parsedErr = JSON.parse(errText);
          } catch {}

          if (response.status === 403 && parsedErr.code === 'permission_denied') {
            this.lastBrevoError = {
              code: 'permission_denied',
              message: 'Brevo API key is not authorized for resource "transactional.email".',
              suggestion: 'In your Brevo dashboard, navigate to SMTP & API > API Keys, and generate a new key with "Transactional Email" (or Full Access) permissions. Ensure you also verify your sender address under Senders & IP.',
            };
            provider = 'Brevo (Permission Required)';
            errorDetails = 'API Key lacks transactional.email scope. In Brevo: SMTP & API > API Keys > Grant Transactional Email permission.';
            messageId = `sim-brevo-perm-${Date.now()}`;
            console.log('[Brevo Notice] API key lacks transactional.email permission in Brevo Dashboard. Safely stored notification in audit log.');
          } else {
            this.lastBrevoError = {
              code: parsedErr.code || `${response.status}`,
              message: parsedErr.message || errText,
              suggestion: 'Verify sender address in Brevo under Senders & IP, or check API key validity.',
            };
            provider = 'Brevo (Simulation)';
            errorDetails = parsedErr.message || errText;
            console.log(`[Brevo Notice] Brevo returned status ${response.status}. Safely stored notification in audit log.`);
          }
        }
      } catch (err: any) {
        console.log('[Brevo Notice] Network connection notice:', err?.message || err);
        provider = 'Brevo (Simulation)';
      }
    } else {
      console.log(`[Brevo] No BREVO_API_KEY detected in env. Recording notification into simulated Brevo audit outbox.`);
    }

    // 2. Log to Email Notification Service Store
    const emailLogEntry = {
      id: `email-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      toEmail,
      subject,
      referenceNumber: request.referenceNumber,
      newStatus,
      body: fullBody,
      sentAt: new Date().toISOString(),
      provider,
      messageId,
      htmlContent: htmlBody,
      errorDetails,
    };
    db.logEmail(emailLogEntry);

    // 3. Register in-app notification for student
    if (student) {
      db.createNotification({
        id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        userId: student.id,
        printRequestId: request.id,
        message: `Status updated to ${newStatus}: ${request.referenceNumber}`,
        notificationType: 'STATUS_UPDATE',
        isRead: false,
        createdAt: new Date().toISOString(),
        referenceNumber: request.referenceNumber,
      });
    }

    // 4. Notify Staff or Runner if applicable
    if (newStatus === 'Ready for Delivery') {
      const runners = db.getUsers().filter((u) => u.role === 'student_runner');
      for (const r of runners) {
        db.createNotification({
          id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          userId: r.id,
          printRequestId: request.id,
          message: `New delivery job available: ${request.referenceNumber} to ${request.roomNumber} (₱${request.printPrice?.toFixed(2) || '0.00'})`,
          notificationType: 'JOB_AVAILABLE',
          isRead: false,
          createdAt: new Date().toISOString(),
          referenceNumber: request.referenceNumber,
        });
      }
    } else if (newStatus === 'Pending Review') {
      const staffList = db.getUsers().filter((u) => u.role === 'print_shop_staff');
      for (const s of staffList) {
        db.createNotification({
          id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          userId: s.id,
          printRequestId: request.id,
          message: `New print request submitted by ${studentName}: ${request.referenceNumber} (${request.fileName})`,
          notificationType: 'NEW_REQUEST',
          isRead: false,
          createdAt: new Date().toISOString(),
          referenceNumber: request.referenceNumber,
        });
      }
    }
  }
}
