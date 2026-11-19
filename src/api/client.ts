import type { User, PrintShop, PrintRequest, UserRole, RequestStatus, AppNotification, EmailLogEntry } from '../types/index.ts';
import {
  DEMO_ACCOUNT_CREDENTIALS,
  verifyDemoCredentialPassword,
  isAuthorizedSorSUGoogleAccount,
} from '../utils/rules.ts';

const TOKEN_KEY = 'sorsu_printahead_token';
const CACHED_REQUESTS_KEY = 'sorsu_cached_requests';
const CACHED_NOTIFS_KEY = 'sorsu_cached_notifications';
const CACHED_EMAILS_KEY = 'sorsu_cached_emails';

// Built-in verified institutional demo accounts for SorSU-Bulan Campus
const DEMO_USERS: Record<UserRole, User> = {
  admin: {
    id: 'user-admin-001',
    fullName: 'Campus System Administrator',
    email: 'admin@sorsu.edu.ph',
    role: 'admin',
    createdAt: '2026-10-01T00:00:00.000Z',
  },
  student: {
    id: 'user-student-001',
    fullName: 'Juan Dela Cruz',
    email: 'juan.delacruz@sorsu.edu.ph',
    role: 'student',
    createdAt: '2026-11-01T00:00:00.000Z',
  },
  print_shop_staff: {
    id: 'user-staff-001',
    fullName: 'Engr. Maria Santos (Print Shop)',
    email: 'staff.printshop@sorsu.edu.ph',
    role: 'print_shop_staff',
    shopId: 'shop-001',
    createdAt: '2026-10-15T00:00:00.000Z',
  },
  student_runner: {
    id: 'user-runner-001',
    fullName: 'Carlos Reyes (Student Runner)',
    email: 'carlos.runner@sorsu.edu.ph',
    role: 'student_runner',
    createdAt: '2026-10-20T00:00:00.000Z',
  },
};

const INITIAL_DEMO_REQUESTS: PrintRequest[] = [
  {
    id: 'req-001',
    referenceNumber: 'PR-2026-48912',
    studentId: 'user-student-001',
    fullName: 'Juan Dela Cruz',
    roomNumber: 'Room 304, IT Building',
    instructionMessage: 'Please print 2 copies on short bond paper, back-to-back. Stapled on top-left.',
    filePath: '/uploads/sample-thesis-proposal.pdf',
    fileName: 'CS301-Thesis-Chapter1-DelaCruz.pdf',
    fileSize: 1048576,
    status: 'Pending Review',
    printPrice: null,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'req-002',
    referenceNumber: 'PR-2026-91340',
    studentId: 'user-student-001',
    fullName: 'Juan Dela Cruz',
    roomNumber: 'Room 201, Academic Hall B',
    instructionMessage: 'Color print for title page, grayscale for the rest. Total 15 pages.',
    filePath: '/uploads/sample-network-lab.pdf',
    fileName: 'Networking2-LabManual.pdf',
    fileSize: 2097152,
    status: 'Ready for Delivery',
    printPrice: 45.0,
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
  {
    id: 'req-003',
    referenceNumber: 'PR-2026-77821',
    studentId: 'user-student-001',
    fullName: 'Juan Dela Cruz',
    roomNumber: 'Room 105, Tech Annex',
    instructionMessage: 'Urgent assignment for 4:00 PM class. 4 pages standard black & white.',
    filePath: '/uploads/sample-algorithm-homework.pdf',
    fileName: 'Algorithms-Activity-Sheet.pdf',
    fileSize: 524288,
    status: 'Out for Delivery',
    printPrice: 12.0,
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    deliveryJob: {
      id: 'job-003',
      printRequestId: 'req-003',
      runnerId: 'user-runner-001',
      runnerName: 'Carlos Reyes (Student Runner)',
      deliveryStatus: 'Out for Delivery',
      acceptedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      deliveredAt: null,
    },
  },
];

export const api = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
  },

  clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  },

  getCachedRequests(): PrintRequest[] {
    try {
      const raw = localStorage.getItem(CACHED_REQUESTS_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return INITIAL_DEMO_REQUESTS;
  },

  saveCachedRequests(reqs: PrintRequest[]) {
    try {
      localStorage.setItem(CACHED_REQUESTS_KEY, JSON.stringify(reqs));
    } catch {}
  },

  async request<T>(endpoint: string, options: RequestInit = {}, retries = 1): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const res = await fetch(endpoint, {
        ...options,
        headers,
      });

      let data: any;
      const text = await res.text();
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { rawText: text };
      }

      if (!res.ok) {
        const httpErr: any = new Error(data.error || `Server request failed with status ${res.status}`);
        httpErr.status = res.status;
        throw httpErr;
      }
      return data as T;
    } catch (err: any) {
      if (err?.status && err.status >= 400 && err.status < 500) {
        throw err;
      }
      if (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        return this.request<T>(endpoint, options, retries - 1);
      }
      throw err;
    }
  },

  // Auth
  async login(email: string, password: string, fullName?: string, role?: UserRole): Promise<User> {
    try {
      const data = await this.request<{ success: boolean; user: User; token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, fullName, role }),
      });
      this.setToken(data.token);
      return data.user;
    } catch (err: any) {
      if (err?.status || (err.message && (err.message.includes('Invalid email') || err.message.includes('password')))) {
        throw err;
      }
      const demoCheck = verifyDemoCredentialPassword(email, password);
      if (!demoCheck.valid) {
        throw new Error(demoCheck.error || 'Incorrect password for this SorSU account.');
      }
      if (demoCheck.account) {
        const acc = demoCheck.account;
        const fallbackUser: User = {
          id: acc.id,
          fullName: acc.fullName,
          email: acc.email,
          role: acc.role,
          shopId: acc.shopId ?? null,
          createdAt: new Date().toISOString(),
        };
        const token = `sorsu_auth_${btoa(JSON.stringify({ id: fallbackUser.id, email: fallbackUser.email, role: fallbackUser.role, time: Date.now() }))}`;
        this.setToken(token);
        return fallbackUser;
      }
      const determinedRole =
        role ||
        (email.startsWith('admin')
          ? 'admin'
          : email.includes('staff')
          ? 'print_shop_staff'
          : 'student');
      const name = fullName || email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      const fallbackUser: User = {
        id: `user-local-${Date.now()}`,
        fullName: name,
        email,
        role: determinedRole,
        createdAt: new Date().toISOString(),
      };
      const token = `sorsu_auth_${btoa(JSON.stringify({ id: fallbackUser.id, email: fallbackUser.email, role: fallbackUser.role, time: Date.now() }))}`;
      this.setToken(token);
      return fallbackUser;
    }
  },

  async loginWithGoogle(accessToken: string, emailFallback?: string, fullNameFallback?: string): Promise<User> {
    try {
      const data = await this.request<{ success: boolean; user: User; token: string }>('/api/auth/google', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ accessToken }),
      });
      this.setToken(data.token);
      return data.user;
    } catch (err: any) {
      if (err?.status) {
        throw err;
      }
      const cleanEmail = (emailFallback || '').trim().toLowerCase();
      if (!isAuthorizedSorSUGoogleAccount(cleanEmail)) {
        throw new Error('Only official @sorsu.edu.ph Google accounts are allowed.');
      }
      const matchedDemo = DEMO_ACCOUNT_CREDENTIALS.find((acc) => acc.email.toLowerCase() === cleanEmail);
      const fallbackUser: User = matchedDemo
        ? {
            id: matchedDemo.id,
            fullName: matchedDemo.fullName,
            email: matchedDemo.email,
            role: matchedDemo.role,
            shopId: matchedDemo.shopId ?? null,
            createdAt: new Date().toISOString(),
          }
        : {
            id: `user-google-${Date.now()}`,
            fullName: fullNameFallback || cleanEmail.split('@')[0],
            email: cleanEmail,
            role: 'student',
            createdAt: new Date().toISOString(),
          };
      const token = `sorsu_auth_${btoa(JSON.stringify({ id: fallbackUser.id, email: fallbackUser.email, role: fallbackUser.role, time: Date.now() }))}`;
      this.setToken(token);
      return fallbackUser;
    }
  },

  async getCurrentUser(): Promise<User | null> {
    try {
      const data = await this.request<{ user: User }>('/api/auth/me');
      return data.user;
    } catch {
      const token = this.getToken();
      if (token && token.startsWith('sorsu_auth_')) {
        try {
          const payload = JSON.parse(atob(token.replace('sorsu_auth_', '')));
          const matchedDemo = DEMO_ACCOUNT_CREDENTIALS.find(
            (acc) => acc.id === payload.id || acc.email.toLowerCase() === (payload.email || '').toLowerCase()
          );
          if (matchedDemo) {
            return {
              id: matchedDemo.id,
              fullName: matchedDemo.fullName,
              email: matchedDemo.email,
              role: matchedDemo.role,
              shopId: matchedDemo.shopId ?? null,
              createdAt: new Date().toISOString(),
            };
          }
          const user = DEMO_USERS[payload.role as UserRole];
          if (user) {
            return {
              ...user,
              id: payload.id || user.id,
              fullName: payload.name || user.fullName,
              email: payload.email || user.email,
              role: (payload.role as UserRole) || user.role,
            };
          }
        } catch {
          // ignore
        }
      }
      return null;
    }
  },

  // Print Requests
  async submitPrintRequest(formData: FormData): Promise<{ success: boolean; message: string; request: PrintRequest }> {
    try {
      const res = await this.request<{ success: boolean; message: string; request: PrintRequest }>('/api/requests', {
        method: 'POST',
        body: formData,
      });
      const cached = this.getCachedRequests();
      this.saveCachedRequests([res.request, ...cached]);
      return res;
    } catch (err: any) {
      // Client fallback for file upload if proxy disconnected
      const fullName = (formData.get('fullName') as string) || 'Student';
      const roomNumber = (formData.get('roomNumber') as string) || 'Room 101';
      const instructionMessage = (formData.get('instructionMessage') as string) || '';
      const doc = formData.get('document') as File | null;
      const refNumber = `PR-2026-${Math.floor(10000 + Math.random() * 90000)}`;

      const newReq: PrintRequest = {
        id: `req-${Date.now()}`,
        referenceNumber: refNumber,
        studentId: 'user-student-001',
        fullName,
        roomNumber,
        instructionMessage,
        filePath: doc ? URL.createObjectURL(doc) : '/uploads/sample-thesis-proposal.pdf',
        fileName: doc ? doc.name : 'document.pdf',
        fileSize: doc ? doc.size : 102400,
        status: 'Pending Review',
        printPrice: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const cached = this.getCachedRequests();
      this.saveCachedRequests([newReq, ...cached]);
      return {
        success: true,
        message: `Print request submitted successfully! Your reference number is ${refNumber}`,
        request: newReq,
      };
    }
  },

  async getStudentRequests(): Promise<PrintRequest[]> {
    try {
      const data = await this.request<{ requests: PrintRequest[] }>('/api/requests/student');
      this.saveCachedRequests(data.requests);
      return data.requests;
    } catch {
      return this.getCachedRequests();
    }
  },

  async getAllRequests(): Promise<PrintRequest[]> {
    try {
      const data = await this.request<{ requests: PrintRequest[] }>('/api/requests/all');
      this.saveCachedRequests(data.requests);
      return data.requests;
    } catch {
      return this.getCachedRequests();
    }
  },

  async getRequestById(id: string): Promise<PrintRequest> {
    try {
      const data = await this.request<{ request: PrintRequest }>(`/api/requests/${id}`);
      return data.request;
    } catch {
      const found = this.getCachedRequests().find((r) => r.id === id || r.referenceNumber === id);
      if (found) return found;
      throw new Error('Print request not found');
    }
  },

  async cancelRequest(id: string): Promise<PrintRequest> {
    try {
      const data = await this.request<{ success: boolean; request: PrintRequest }>(`/api/requests/${id}/cancel`, {
        method: 'POST',
      });
      const cached = this.getCachedRequests().map((r) => (r.id === id ? data.request : r));
      this.saveCachedRequests(cached);
      return data.request;
    } catch {
      const cached = this.getCachedRequests().map((r) => (r.id === id ? { ...r, status: 'Cancelled' as RequestStatus } : r));
      this.saveCachedRequests(cached);
      const updated = cached.find((r) => r.id === id)!;
      return updated;
    }
  },

  async setPrice(id: string, price: number): Promise<PrintRequest> {
    try {
      const data = await this.request<{ success: boolean; request: PrintRequest }>(`/api/requests/${id}/price`, {
        method: 'POST',
        body: JSON.stringify({ price }),
      });
      const cached = this.getCachedRequests().map((r) => (r.id === id ? data.request : r));
      this.saveCachedRequests(cached);
      return data.request;
    } catch {
      const cached = this.getCachedRequests().map((r) =>
        r.id === id ? { ...r, printPrice: price, status: 'Reviewed / Awaiting Payment' as RequestStatus } : r
      );
      this.saveCachedRequests(cached);
      return cached.find((r) => r.id === id)!;
    }
  },

  async updatePrintStatus(id: string, status: 'Printing' | 'Ready for Delivery'): Promise<PrintRequest> {
    try {
      const data = await this.request<{ success: boolean; request: PrintRequest }>(`/api/requests/${id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      });
      const cached = this.getCachedRequests().map((r) => (r.id === id ? data.request : r));
      this.saveCachedRequests(cached);
      return data.request;
    } catch {
      const cached = this.getCachedRequests().map((r) => (r.id === id ? { ...r, status } : r));
      this.saveCachedRequests(cached);
      return cached.find((r) => r.id === id)!;
    }
  },

  // Delivery
  async getAvailableDeliveryJobs(): Promise<PrintRequest[]> {
    try {
      const data = await this.request<{ jobs: PrintRequest[] }>('/api/delivery/available');
      return data.jobs;
    } catch {
      return this.getCachedRequests().filter(
        (r) => r.status === 'Ready for Delivery' && (!r.deliveryJob || !r.deliveryJob.runnerId)
      );
    }
  },

  async getRunnerJobs(): Promise<PrintRequest[]> {
    try {
      const data = await this.request<{ jobs: PrintRequest[] }>('/api/delivery/runner');
      return data.jobs;
    } catch {
      return this.getCachedRequests().filter((r) => r.deliveryJob && r.deliveryJob.runnerId);
    }
  },

  async acceptDeliveryJob(id: string): Promise<PrintRequest> {
    try {
      const data = await this.request<{ success: boolean; message: string; request: PrintRequest }>(
        `/api/delivery/${id}/accept`,
        { method: 'POST' }
      );
      const cached = this.getCachedRequests().map((r) => (r.id === id ? data.request : r));
      this.saveCachedRequests(cached);
      return data.request;
    } catch (err: any) {
      if (err?.status) throw err;
      const req = this.getCachedRequests().find((r) => r.id === id);
      if (!req) throw new Error('Request not found');
      const updated: PrintRequest = {
        ...req,
        status: 'Out for Delivery',
        deliveryJob: {
          id: `job-${Date.now()}`,
          printRequestId: req.id,
          runnerId: 'user-runner-001',
          runnerName: 'Carlos Reyes (Student Runner)',
          deliveryStatus: 'Out for Delivery',
          acceptedAt: new Date().toISOString(),
          deliveredAt: null,
        },
      };
      const cached = this.getCachedRequests().map((r) => (r.id === id ? updated : r));
      this.saveCachedRequests(cached);
      return updated;
    }
  },

  async markJobDelivered(id: string): Promise<PrintRequest> {
    try {
      const data = await this.request<{ success: boolean; message: string; request: PrintRequest }>(
        `/api/delivery/${id}/deliver`,
        { method: 'POST' }
      );
      const cached = this.getCachedRequests().map((r) => (r.id === id ? data.request : r));
      this.saveCachedRequests(cached);
      return data.request;
    } catch (err: any) {
      if (err?.status) throw err;
      const req = this.getCachedRequests().find((r) => r.id === id);
      if (!req) throw new Error('Request not found');
      const hasPaid = Boolean(req.payment && req.payment.paymentStatus === 'Confirmed');
      const updated: PrintRequest = {
        ...req,
        status: hasPaid ? 'Completed' : req.status,
        deliveryJob: req.deliveryJob ? { ...req.deliveryJob, deliveryStatus: 'Delivered', deliveredAt: new Date().toISOString() } : null,
      };
      const cached = this.getCachedRequests().map((r) => (r.id === id ? updated : r));
      this.saveCachedRequests(cached);
      return updated;
    }
  },

  async confirmCashPayment(id: string): Promise<PrintRequest> {
    try {
      const data = await this.request<{ success: boolean; message: string; request: PrintRequest }>(
        `/api/delivery/${id}/confirm-payment`,
        { method: 'POST' }
      );
      const cached = this.getCachedRequests().map((r) => (r.id === id ? data.request : r));
      this.saveCachedRequests(cached);
      return data.request;
    } catch (err: any) {
      if (err?.status) throw err;
      const req = this.getCachedRequests().find((r) => r.id === id);
      if (!req) throw new Error('Request not found');
      const isDelivered = req.deliveryJob?.deliveryStatus === 'Delivered';
      const updated: PrintRequest = {
        ...req,
        status: isDelivered ? 'Completed' : req.status,
        payment: {
          id: `pay-${Date.now()}`,
          printRequestId: req.id,
          runnerId: 'user-runner-001',
          runnerName: 'Carlos Reyes (Student Runner)',
          amount: req.printPrice || 0,
          paymentMethod: 'Cash on Delivery',
          paymentStatus: 'Confirmed',
          confirmedAt: new Date().toISOString(),
        },
      };
      const cached = this.getCachedRequests().map((r) => (r.id === id ? updated : r));
      this.saveCachedRequests(cached);
      return updated;
    }
  },

  // Notifications & Emails
  async getNotifications(): Promise<AppNotification[]> {
    try {
      const data = await this.request<{ notifications: AppNotification[] }>('/api/notifications');
      return data.notifications;
    } catch {
      return [
        {
          id: 'notif-demo-1',
          userId: 'user-student-001',
          message: 'Your print request PR-2026-91340 is Ready for Delivery!',
          notificationType: 'STATUS_UPDATE',
          isRead: false,
          createdAt: new Date().toISOString(),
          referenceNumber: 'PR-2026-91340',
        },
      ];
    }
  },

  async markNotificationRead(id: string): Promise<void> {
    try {
      await this.request(`/api/notifications/${id}/read`, { method: 'POST' });
    } catch {}
  },

  async markAllNotificationsRead(): Promise<void> {
    try {
      await this.request('/api/notifications/read-all', { method: 'POST' });
    } catch {}
  },

  async getEmailLogs(): Promise<EmailLogEntry[]> {
    try {
      const data = await this.request<{ emailLogs: EmailLogEntry[] }>('/api/notifications/emails');
      return data.emailLogs;
    } catch {
      return [
        {
          id: 'email-demo-1',
          toEmail: 'juan.delacruz@sorsu.edu.ph',
          subject: '[SorSU: PrintAhead] Request PR-2026-91340 is Ready for Delivery',
          referenceNumber: 'PR-2026-91340',
          newStatus: 'Ready for Delivery',
          body: 'Hello Juan Dela Cruz,\n\nYour print request PR-2026-91340 has been printed and is Ready for Delivery.',
          sentAt: new Date().toISOString(),
          provider: 'Brevo',
          messageId: 'brevo-sample-1',
        },
      ];
    }
  },

  async getBrevoStatus(): Promise<{
    provider: string;
    isConfigured: boolean;
    senderEmail: string;
    senderName: string;
    lastError?: { code?: string; message?: string; suggestion?: string } | null;
  }> {
    try {
      return await this.request<{
        provider: string;
        isConfigured: boolean;
        senderEmail: string;
        senderName: string;
        lastError?: { code?: string; message?: string; suggestion?: string } | null;
      }>('/api/notifications/brevo-status');
    } catch {
      return {
        provider: 'Brevo',
        isConfigured: false,
        senderEmail: 'printahead-noreply@sorsu.edu.ph',
        senderName: 'SorSU: PrintAhead (Bulan Campus)',
        lastError: null,
      };
    }
  },

  // Printing Shops & Admin Management
  async getShops(): Promise<PrintShop[]> {
    const data = await this.request<{ shops: PrintShop[] }>('/api/shops');
    return data.shops;
  },

  async getAdminOverview(): Promise<{
    stats: {
      totalUsers: number;
      totalStudentsAndRunners: number;
      totalShopStaff: number;
      totalShops: number;
      activeShops: number;
      totalRequests: number;
      activeRequests: number;
      completedRequests: number;
      completedRevenue: number;
    };
    users: User[];
    shops: PrintShop[];
    requests: PrintRequest[];
  }> {
    return this.request('/api/admin/overview');
  },

  async updateUserRole(userId: string, role: UserRole, shopId?: string | null): Promise<User> {
    const data = await this.request<{ success: boolean; user: User }>(`/api/admin/users/${userId}/role`, {
      method: 'POST',
      body: JSON.stringify({ role, shopId }),
    });
    return data.user;
  },

  async createPrintShop(payload: {
    name: string;
    location: string;
    operatingHours?: string;
    contactEmail?: string;
  }): Promise<PrintShop> {
    const data = await this.request<{ success: boolean; shop: PrintShop }>('/api/admin/shops', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return data.shop;
  },

  async updatePrintShop(
    id: string,
    updates: Partial<Pick<PrintShop, 'name' | 'location' | 'operatingHours' | 'contactEmail' | 'isActive'>>
  ): Promise<PrintShop> {
    const data = await this.request<{ success: boolean; shop: PrintShop }>(`/api/admin/shops/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return data.shop;
  },
};
