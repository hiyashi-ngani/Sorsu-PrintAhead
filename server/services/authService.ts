import crypto from 'node:crypto';
import { db } from '../db/database.ts';
import {
  validateSorSUEmail,
  verifyDemoCredentialPassword,
  isAuthorizedSorSUGoogleAccount,
  sanitizeSelfRegistrationRole,
} from '../../src/utils/rules.ts';
import type { User, UserRole } from '../../src/types/index.ts';

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
  status?: number;
}

const customUserPasswords = new Map<string, string>();

function hashPassword(pw: string): string {
  return crypto.createHash('sha256').update(pw).digest('hex');
}

function determineRoleFromEmail(cleanEmail: string, requestedRole?: UserRole): UserRole {
  if (cleanEmail.startsWith('admin') || cleanEmail.includes('.admin@')) {
    return 'admin';
  }
  if (cleanEmail.includes('staff') || cleanEmail.includes('printshop')) {
    return 'print_shop_staff';
  }
  if (cleanEmail.includes('runner') || cleanEmail.includes('delivery')) {
    return 'student_runner';
  }
  return requestedRole || 'student';
}

function issueSessionToken(user: User): string {
  return `sorsu_auth_${Buffer.from(
    JSON.stringify({ id: user.id, email: user.email, role: user.role, time: Date.now() })
  ).toString('base64')}`;
}

export class AuthService {
  /**
   * Authenticates user via SorSU institutional email + password
   */
  static authenticateWithSorSUEmail(
    email: string,
    fullName?: string,
    requestedRole?: UserRole,
    password?: string
  ): AuthResponse {
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanEmail) {
      return { success: false, status: 400, error: 'Email address is required.' };
    }

    if (!validateSorSUEmail(cleanEmail)) {
      return {
        success: false,
        status: 400,
        error: 'Invalid email. Please use your official @sorsu.edu.ph email address.',
      };
    }

    // Verify demo credentials strictly when signing into seeded demo accounts
    const demoCheck = verifyDemoCredentialPassword(cleanEmail, password);
    if (!demoCheck.valid) {
      return {
        success: false,
        status: 401,
        error: demoCheck.error || 'Incorrect password.',
      };
    }

    if (!password || !password.trim()) {
      return { success: false, status: 400, error: 'Password is required.' };
    }

    let user = db.getUserByEmail(cleanEmail);

    if (user) {
      const savedHash = customUserPasswords.get(cleanEmail);
      if (savedHash && savedHash !== hashPassword(password)) {
        return {
          success: false,
          status: 401,
          error: 'Incorrect password for this SorSU account.',
        };
      }
    } else {
      if (password.trim().length < 6) {
        return {
          success: false,
          status: 400,
          error: 'Password must be at least 6 characters.',
        };
      }

      const safeRequestedRole = sanitizeSelfRegistrationRole(requestedRole);
      const role = determineRoleFromEmail(cleanEmail, safeRequestedRole);
      const generatedName =
        fullName ||
        cleanEmail
          .split('@')[0]
          .replace(/[._-]/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());

      user = db.createUser({
        id: `user-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        fullName: generatedName,
        email: cleanEmail,
        role,
        shopId: role === 'print_shop_staff' ? 'shop-001' : null,
        createdAt: new Date().toISOString(),
      });
      customUserPasswords.set(cleanEmail, hashPassword(password));
    }

    return {
      success: true,
      user,
      token: issueSessionToken(user),
    };
  }

  /**
   * Authenticates a Google Sign-In user via OAuth access token and enforces @sorsu.edu.ph domain
   */
  static async authenticateWithGoogleToken(accessToken: string): Promise<AuthResponse> {
    if (!accessToken) {
      return { success: false, status: 401, error: 'Missing Google access token.' };
    }

    let profile: { email?: string; name?: string; email_verified?: boolean };
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        return { success: false, status: 401, error: 'Failed to verify Google account.' };
      }
      profile = (await res.json()) as { email?: string; name?: string; email_verified?: boolean };
    } catch {
      return { success: false, status: 502, error: 'Unable to reach Google identity service.' };
    }

    const cleanEmail = (profile.email || '').trim().toLowerCase();
    if (!isAuthorizedSorSUGoogleAccount(cleanEmail)) {
      return {
        success: false,
        status: 403,
        error: `Access denied. Only official @sorsu.edu.ph Google accounts are permitted (got ${cleanEmail || 'unknown'}).`,
      };
    }

    let user = db.getUserByEmail(cleanEmail);
    if (!user) {
      const role = determineRoleFromEmail(cleanEmail, 'student');
      const generatedName =
        (profile.name || '').trim() ||
        cleanEmail
          .split('@')[0]
          .replace(/[._-]/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());

      user = db.createUser({
        id: `user-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        fullName: generatedName,
        email: cleanEmail,
        role,
        shopId: role === 'print_shop_staff' ? 'shop-001' : null,
        createdAt: new Date().toISOString(),
      });
    }

    return {
      success: true,
      user,
      token: issueSessionToken(user),
    };
  }

  /**
   * Validates auth token and returns user
   */
  static verifyToken(tokenHeader?: string): User | null {
    if (!tokenHeader) return null;
    const token = tokenHeader.replace(/^Bearer\s+/i, '');
    if (!token.startsWith('sorsu_auth_')) return null;

    try {
      const payloadBase64 = token.replace('sorsu_auth_', '');
      const decoded = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf-8'));
      if (decoded && decoded.id) {
        return db.getUserById(decoded.id) || null;
      }
    } catch {
      return null;
    }
    return null;
  }
}
