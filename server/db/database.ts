import fs from 'fs';
import path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { User, UserRole, PrintShop, PrintRequest, DeliveryJob, Payment, AppNotification, EmailLogEntry } from '../../src/types/index.ts';

// Check for Supabase environment variables
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

export let supabase: SupabaseClient | null = null;
if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('[Database] Connected to external Supabase PostgreSQL at:', supabaseUrl);
  } catch (err) {
    console.warn('[Database] Failed to initialize Supabase client:', err);
  }
} else {
  console.log('[Database] No external Supabase credentials found. Running embedded persistent database engine.');
}

// Local persistent storage file
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'db.json');

interface DatabaseStore {
  users: User[];
  printShops: PrintShop[];
  printRequests: PrintRequest[];
  deliveryJobs: DeliveryJob[];
  payments: Payment[];
  notifications: AppNotification[];
  emailLogs: EmailLogEntry[];
}

function getDefaultShops(): PrintShop[] {
  return [
    {
      id: 'shop-001',
      name: 'SorSU-Bulan Main Print Shop',
      location: 'Ground Floor, Administration Building',
      operatingHours: '7:30 AM - 5:00 PM (Mon-Fri)',
      contactEmail: 'staff.printshop@sorsu.edu.ph',
      isActive: true,
      createdAt: new Date(Date.now() - 86400000 * 60).toISOString(),
    },
    {
      id: 'shop-002',
      name: 'IT Building Print Kiosk',
      location: 'Lobby, IT & Computer Studies Building',
      operatingHours: '8:00 AM - 4:30 PM (Mon-Fri)',
      contactEmail: 'kiosk.it@sorsu.edu.ph',
      isActive: true,
      createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    },
  ];
}

function getDefaultAdminUser(): User {
  return {
    id: 'user-admin-001',
    fullName: 'Campus System Administrator',
    email: 'admin@sorsu.edu.ph',
    role: 'admin',
    createdAt: new Date(Date.now() - 86400000 * 60).toISOString(),
  };
}

function getDefaultSecondStudent(): User {
  return {
    id: 'user-student-002',
    fullName: 'Maria Clara',
    email: 'maria.clara@sorsu.edu.ph',
    role: 'student',
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
  };
}

function getSampleReadyJobForOthers(): PrintRequest {
  return {
    id: 'req-004',
    referenceNumber: 'PR-2026-55210',
    studentId: 'user-student-002',
    fullName: 'Maria Clara',
    roomNumber: 'Room 202, Academic Hall A',
    shopId: 'shop-001',
    shopName: 'SorSU-Bulan Main Print Shop',
    instructionMessage: '[Specs: 2 copies | A4 (8.27" x 11.69") | Black & White | Double-Sided | Stapled (Top-Left)] Research handout.',
    filePath: '/uploads/Networking2-LabManual.pdf',
    fileName: 'Networking2-LabManual.pdf',
    fileSize: 2097152,
    status: 'Ready for Delivery',
    printPrice: 30.0,
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 1).toISOString(),
  };
}

function getInitialData(): DatabaseStore {
  const adminUser = getDefaultAdminUser();
  const studentUser: User = {
    id: 'user-student-001',
    fullName: 'Juan Dela Cruz',
    email: 'juan.delacruz@sorsu.edu.ph',
    role: 'student',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  };
  const student2User = getDefaultSecondStudent();

  const staffUser: User = {
    id: 'user-staff-001',
    fullName: 'Engr. Maria Santos (Print Shop)',
    email: 'staff.printshop@sorsu.edu.ph',
    role: 'print_shop_staff',
    shopId: 'shop-001',
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
  };

  const runnerUser: User = {
    id: 'user-runner-001',
    fullName: 'Carlos Reyes (Student Runner)',
    email: 'carlos.runner@sorsu.edu.ph',
    role: 'student_runner',
    createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
  };

  const shops = getDefaultShops();

  // Seed sample requests for SorSU-Bulan Campus
  const req1: PrintRequest = {
    id: 'req-001',
    referenceNumber: 'PR-2026-48912',
    studentId: studentUser.id,
    fullName: studentUser.fullName,
    roomNumber: 'Room 304, IT Building',
    shopId: 'shop-001',
    shopName: 'SorSU-Bulan Main Print Shop',
    instructionMessage: 'Please print 2 copies on short bond paper, back-to-back. Stapled on top-left.',
    filePath: '/uploads/CS301-Thesis-Chapter1-DelaCruz.pdf',
    fileName: 'CS301-Thesis-Chapter1-DelaCruz.pdf',
    fileSize: 1048576,
    status: 'Pending Review',
    printPrice: null,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  };

  const req2: PrintRequest = {
    id: 'req-002',
    referenceNumber: 'PR-2026-91340',
    studentId: studentUser.id,
    fullName: studentUser.fullName,
    roomNumber: 'Room 201, Academic Hall B',
    shopId: 'shop-001',
    shopName: 'SorSU-Bulan Main Print Shop',
    instructionMessage: 'Color print for title page, grayscale for the rest. Total 15 pages.',
    filePath: '/uploads/Networking2-LabManual.pdf',
    fileName: 'Networking2-LabManual.pdf',
    fileSize: 2097152,
    status: 'Ready for Delivery',
    printPrice: 45.0,
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 1).toISOString(),
  };

  const req3: PrintRequest = {
    id: 'req-003',
    referenceNumber: 'PR-2026-77821',
    studentId: studentUser.id,
    fullName: studentUser.fullName,
    roomNumber: 'Room 105, Tech Annex',
    shopId: 'shop-001',
    shopName: 'SorSU-Bulan Main Print Shop',
    instructionMessage: 'Urgent assignment for 4:00 PM class. 4 pages standard black & white.',
    filePath: '/uploads/Algorithms-Activity-Sheet.pdf',
    fileName: 'Algorithms-Activity-Sheet.pdf',
    fileSize: 524288,
    status: 'Out for Delivery',
    printPrice: 12.0,
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    deliveryJob: {
      id: 'job-003',
      printRequestId: 'req-003',
      runnerId: runnerUser.id,
      runnerName: runnerUser.fullName,
      deliveryStatus: 'Out for Delivery',
      acceptedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      deliveredAt: null,
    },
  };

  const req4 = getSampleReadyJobForOthers();

  return {
    users: [adminUser, studentUser, student2User, staffUser, runnerUser],
    printShops: shops,
    printRequests: [req1, req2, req3, req4],
    deliveryJobs: req3.deliveryJob ? [req3.deliveryJob] : [],
    payments: [],
    notifications: [
      {
        id: 'notif-001',
        userId: studentUser.id,
        printRequestId: 'req-002',
        message: 'Your print request PR-2026-91340 has been printed and is Ready for Delivery!',
        notificationType: 'STATUS_UPDATE',
        isRead: false,
        createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
        referenceNumber: 'PR-2026-91340',
      },
      {
        id: 'notif-002',
        userId: studentUser.id,
        printRequestId: 'req-003',
        message: 'Runner Carlos Reyes accepted delivery for PR-2026-77821 (Amount: ₱12.00). Document is out for delivery to Room 105, Tech Annex.',
        notificationType: 'STATUS_UPDATE',
        isRead: false,
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        referenceNumber: 'PR-2026-77821',
      },
    ],
    emailLogs: [
      {
        id: 'email-001',
        toEmail: studentUser.email,
        subject: '[SorSU: PrintAhead] Request PR-2026-91340 is Ready for Delivery',
        referenceNumber: 'PR-2026-91340',
        newStatus: 'Ready for Delivery',
        body: 'Hello Juan Dela Cruz,\n\nYour print request PR-2026-91340 has been processed by the SorSU-Bulan Print Shop. Total price: ₱45.00.\nA student runner will pick it up and deliver it to Room 201, Academic Hall B shortly.',
        sentAt: new Date(Date.now() - 3600000 * 1).toISOString(),
      },
      {
        id: 'email-002',
        toEmail: studentUser.email,
        subject: '[SorSU: PrintAhead] Request PR-2026-77821 is Out for Delivery',
        referenceNumber: 'PR-2026-77821',
        newStatus: 'Out for Delivery',
        body: 'Hello Juan Dela Cruz,\n\nStudent Runner Carlos Reyes has accepted your print job PR-2026-77821 and is currently delivering it to Room 105, Tech Annex. Please prepare exact cash: ₱12.00.',
        sentAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
    ],
  };
}

class DatabaseManager {
  private store: DatabaseStore;

  constructor() {
    this.store = this.load();
  }

  private load(): DatabaseStore {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as DatabaseStore;
        let dirty = false;

        if (!parsed.printShops) {
          parsed.printShops = getDefaultShops();
          dirty = true;
        }
        if (!parsed.users.some((u) => u.role === 'admin')) {
          parsed.users.unshift(getDefaultAdminUser());
          dirty = true;
        }
        if (!parsed.users.some((u) => u.id === 'user-student-002')) {
          parsed.users.push(getDefaultSecondStudent());
          dirty = true;
        }
        if (!parsed.printRequests.some((r) => r.id === 'req-004')) {
          parsed.printRequests.push(getSampleReadyJobForOthers());
          dirty = true;
        }

        // Fix legacy sample upload paths if present
        const legacyPathMap: Record<string, string> = {
          '/uploads/sample-thesis-proposal.pdf': '/uploads/CS301-Thesis-Chapter1-DelaCruz.pdf',
          '/uploads/sample-network-lab.pdf': '/uploads/Networking2-LabManual.pdf',
          '/uploads/sample-algorithm-homework.pdf': '/uploads/Algorithms-Activity-Sheet.pdf',
        };
        parsed.printRequests.forEach((r) => {
          if (legacyPathMap[r.filePath]) {
            r.filePath = legacyPathMap[r.filePath];
            dirty = true;
          }
          if (!r.shopId) {
            r.shopId = 'shop-001';
            r.shopName = 'SorSU-Bulan Main Print Shop';
            dirty = true;
          }
        });

        if (dirty) {
          this.save(parsed);
        }
        return parsed;
      }
    } catch (e) {
      console.error('[DatabaseManager] Error reading DB file, reinitializing default seed:', e);
    }
    const initial = getInitialData();
    this.save(initial);
    return initial;
  }

  private save(data?: DatabaseStore) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(data || this.store, null, 2), 'utf-8');
    } catch (e) {
      console.error('[DatabaseManager] Error writing DB file:', e);
    }
  }

  // --- Users ---
  getUsers(): User[] {
    return this.store.users;
  }

  getUserById(id: string): User | undefined {
    return this.store.users.find((u) => u.id === id);
  }

  getUserByEmail(email: string): User | undefined {
    return this.store.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  createUser(user: User): User {
    this.store.users.push(user);
    this.save();
    return user;
  }

  updateUserRole(id: string, role: UserRole, shopId?: string | null): User | null {
    const idx = this.store.users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    this.store.users[idx] = {
      ...this.store.users[idx],
      role,
      shopId: shopId !== undefined ? shopId : this.store.users[idx].shopId,
    };
    this.save();
    return this.store.users[idx];
  }

  // --- Printing Shops ---
  getPrintShops(): PrintShop[] {
    return this.store.printShops || [];
  }

  getPrintShopById(id: string): PrintShop | undefined {
    return (this.store.printShops || []).find((s) => s.id === id);
  }

  createPrintShop(shop: PrintShop): PrintShop {
    if (!this.store.printShops) this.store.printShops = [];
    this.store.printShops.push(shop);
    this.save();
    return shop;
  }

  updatePrintShop(id: string, updates: Partial<PrintShop>): PrintShop | null {
    if (!this.store.printShops) return null;
    const idx = this.store.printShops.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    this.store.printShops[idx] = {
      ...this.store.printShops[idx],
      ...updates,
    };
    this.save();
    return this.store.printShops[idx];
  }

  // --- Print Requests ---
  getPrintRequests(): PrintRequest[] {
    return [...this.store.printRequests].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getPrintRequestById(id: string): PrintRequest | undefined {
    return this.store.printRequests.find((r) => r.id === id || r.referenceNumber === id);
  }

  createPrintRequest(req: PrintRequest): PrintRequest {
    this.store.printRequests.unshift(req);
    this.save();
    return req;
  }

  updatePrintRequest(id: string, updates: Partial<PrintRequest>): PrintRequest | null {
    const idx = this.store.printRequests.findIndex((r) => r.id === id || r.referenceNumber === id);
    if (idx === -1) return null;
    this.store.printRequests[idx] = {
      ...this.store.printRequests[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.save();
    return this.store.printRequests[idx];
  }

  // --- Delivery Jobs ---
  getDeliveryJobs(): DeliveryJob[] {
    return this.store.deliveryJobs;
  }

  createDeliveryJob(job: DeliveryJob): DeliveryJob {
    this.store.deliveryJobs.unshift(job);
    this.save();
    return job;
  }

  updateDeliveryJob(jobId: string, updates: Partial<DeliveryJob>): DeliveryJob | null {
    const idx = this.store.deliveryJobs.findIndex((j) => j.id === jobId || j.printRequestId === jobId);
    if (idx === -1) return null;
    this.store.deliveryJobs[idx] = {
      ...this.store.deliveryJobs[idx],
      ...updates,
    };
    this.save();
    return this.store.deliveryJobs[idx];
  }

  // --- Payments ---
  getPayments(): Payment[] {
    return this.store.payments;
  }

  createPayment(payment: Payment): Payment {
    this.store.payments.unshift(payment);
    this.save();
    return payment;
  }

  // --- Notifications ---
  getNotifications(userId?: string): AppNotification[] {
    if (!userId) return this.store.notifications;
    return this.store.notifications
      .filter((n) => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  createNotification(notif: AppNotification): AppNotification {
    this.store.notifications.unshift(notif);
    this.save();
    return notif;
  }

  markNotificationAsRead(id: string, userId: string): boolean {
    const notif = this.store.notifications.find((n) => n.id === id && n.userId === userId);
    if (notif) {
      notif.isRead = true;
      this.save();
      return true;
    }
    return false;
  }

  markAllNotificationsAsRead(userId: string): void {
    this.store.notifications.forEach((n) => {
      if (n.userId === userId) n.isRead = true;
    });
    this.save();
  }

  // --- Email Logs (External Email Notification Service UC5) ---
  getEmailLogs(): EmailLogEntry[] {
    return [...this.store.emailLogs].sort(
      (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
    );
  }

  logEmail(entry: EmailLogEntry): void {
    this.store.emailLogs.unshift(entry);
    this.save();
  }
}

export const db = new DatabaseManager();
