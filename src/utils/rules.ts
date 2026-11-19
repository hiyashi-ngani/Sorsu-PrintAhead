/**
 * Business rules and validation logic for Sorsu: PrintAhead
 * Decoupled for fast unit testing and deterministic verification.
 */

export type UserRole = 'admin' | 'student' | 'print_shop_staff' | 'student_runner';

export type RequestStatus =
  | 'Pending Review'
  | 'Reviewed / Awaiting Payment'
  | 'Printing'
  | 'Ready for Delivery'
  | 'Out for Delivery'
  | 'Completed'
  | 'Cancelled';

export interface CanCancelResult {
  canCancel: boolean;
  reason?: string;
}

/**
 * Validates that an email belongs to SorSU institutional domain
 */
export function validateSorSUEmail(email: string, allowedDomain = 'sorsu.edu.ph'): boolean {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim().toLowerCase();
  const pattern = new RegExp(`^[a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]+\\.)?${allowedDomain.replace('.', '\\.')}$`);
  return pattern.test(trimmed);
}

export interface DemoAccountCredential {
  id: string;
  label: string;
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  shopId?: string | null;
}

export const DEMO_ACCOUNT_CREDENTIALS: DemoAccountCredential[] = [
  {
    id: 'user-student-001',
    label: 'Student 1',
    fullName: 'Juan Dela Cruz',
    email: 'juan.delacruz@sorsu.edu.ph',
    password: 'Student1@2026',
    role: 'student',
  },
  {
    id: 'user-student-002',
    label: 'Student 2',
    fullName: 'Maria Clara',
    email: 'maria.clara@sorsu.edu.ph',
    password: 'Student2@2026',
    role: 'student',
  },
  {
    id: 'user-staff-001',
    label: 'Printing Shop',
    fullName: 'Engr. Maria Santos (Print Shop)',
    email: 'staff.printshop@sorsu.edu.ph',
    password: 'PrintShop@2026',
    role: 'print_shop_staff',
    shopId: 'shop-001',
  },
  {
    id: 'user-admin-001',
    label: 'Admin',
    fullName: 'Campus System Administrator',
    email: 'admin@sorsu.edu.ph',
    password: 'Admin@2026',
    role: 'admin',
  },
];

export function verifyDemoCredentialPassword(email: string, password?: string): { valid: boolean; account?: DemoAccountCredential; error?: string } {
  const cleanEmail = (email || '').trim().toLowerCase();
  const match = DEMO_ACCOUNT_CREDENTIALS.find((acc) => acc.email.toLowerCase() === cleanEmail);
  if (!match) {
    return { valid: true };
  }
  if (!password || password !== match.password) {
    return {
      valid: false,
      account: match,
      error: 'Incorrect password for this SorSU account.',
    };
  }
  return { valid: true, account: match };
}

export function isAuthorizedSorSUGoogleAccount(email?: string | null): boolean {
  if (!email) return false;
  return validateSorSUEmail(email, 'sorsu.edu.ph');
}

export type SelfSignupRole = 'student' | 'print_shop_staff';

export const SIGNUP_ROLES: { value: SelfSignupRole; label: string }[] = [
  { value: 'student', label: 'Student' },
  { value: 'print_shop_staff', label: 'Printing Shop' },
];

export function sanitizeSelfRegistrationRole(requestedRole?: UserRole): SelfSignupRole {
  return requestedRole === 'print_shop_staff' ? 'print_shop_staff' : 'student';
}

/**
 * Generates a unique SorSU print request reference number
 * Example: PR-2026-89421
 */
export function generateReferenceNumber(randomDigits?: string): string {
  const digits = randomDigits || Math.floor(10000 + Math.random() * 90000).toString();
  return `PR-2026-${digits}`;
}

/**
 * Checks whether a reference number matches the official format
 */
export function isValidReferenceNumber(ref: string): boolean {
  return /^PR-\d{4}-\d{5}$/.test(ref);
}

/**
 * Evaluates whether a student can cancel a request.
 * Rule (UC4): A student can withdraw their printing requests only BEFORE printing starts.
 * Only the owner can cancel.
 */
export function canStudentCancelRequest(
  request: { studentId: string; status: RequestStatus },
  currentUserId: string
): CanCancelResult {
  if (request.studentId !== currentUserId) {
    return { canCancel: false, reason: 'Only the request owner can cancel this request.' };
  }

  if (request.status === 'Cancelled') {
    return { canCancel: false, reason: 'Request is already cancelled.' };
  }

  if (request.status === 'Completed') {
    return { canCancel: false, reason: 'Completed requests cannot be cancelled.' };
  }

  const nonCancellableStatuses: RequestStatus[] = [
    'Printing',
    'Ready for Delivery',
    'Out for Delivery',
    'Completed',
  ];

  if (nonCancellableStatuses.includes(request.status)) {
    return {
      canCancel: false,
      reason: 'Printing has already started or completed. Request can no longer be cancelled.',
    };
  }

  return { canCancel: true };
}

/**
 * Validates print price set by staff (UC7)
 */
export function validatePrintPrice(price: number | string): { valid: boolean; error?: string; parsedAmount?: number } {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(num)) {
    return { valid: false, error: 'Price must be a valid numeric amount' };
  }
  if (num <= 0) {
    return { valid: false, error: 'Price must be greater than 0' };
  }
  if (num > 5000) {
    return { valid: false, error: 'Price exceeds maximum allowed print limit (₱5,000)' };
  }
  return { valid: true, parsedAmount: Math.round(num * 100) / 100 };
}

/**
 * Evaluates if a student/runner can accept a delivery job (UC9)
 * Prevents claiming already-assigned jobs and blocks self-delivery.
 */
export function canRunnerAcceptJob(
  request: { status: RequestStatus; runnerId?: string | null; studentId?: string },
  currentUserId?: string
): boolean {
  if (request.status !== 'Ready for Delivery' || Boolean(request.runnerId)) {
    return false;
  }
  if (currentUserId && request.studentId && request.studentId === currentUserId) {
    return false;
  }
  return true;
}

/**
 * Role-based capability checks across the 3 dashboard experiences:
 * 1. Admin ('admin')
 * 2. Combined Student + Runner ('student' | 'student_runner')
 * 3. Printing Shop ('print_shop_staff')
 */
export function canSubmitPrintRequest(role: UserRole): boolean {
  return role === 'student' || role === 'student_runner';
}

export function canAcceptDeliveryJob(role: UserRole): boolean {
  return role === 'student' || role === 'student_runner';
}

export function canManagePrintingShop(role: UserRole): boolean {
  return role === 'print_shop_staff';
}

export function canAccessAdmin(role: UserRole): boolean {
  return role === 'admin';
}

/**
 * Determines whether a job can be marked Completed (UC11)
 * Rule: Update the request to Completed only after delivery AND cash payment have both been confirmed.
 */
export function canCompleteRequest(delivered: boolean, paymentConfirmed: boolean): boolean {
  return Boolean(delivered && paymentConfirmed);
}

export interface PrintPreferences {
  copies: number;
  paperSize: 'Short (8.5" x 11")' | 'A4 (8.27" x 11.69")' | 'Long / Legal (8.5" x 13")';
  colorMode: 'Black & White' | 'Full Color' | 'Color Cover + B&W Pages';
  sides: 'Single-Sided' | 'Double-Sided';
  finishing: 'None' | 'Stapled (Top-Left)' | 'Folder / Fastener' | 'Ring Bind';
}

export const DEFAULT_PRINT_PREFERENCES: PrintPreferences = {
  copies: 1,
  paperSize: 'Short (8.5" x 11")',
  colorMode: 'Black & White',
  sides: 'Single-Sided',
  finishing: 'None',
};

/**
 * Formats printing preferences and optional custom notes into a unified instruction string
 */
export function buildPrintInstructionMessage(
  preferences: PrintPreferences,
  customNotes?: string
): string {
  const parts = [
    `${preferences.copies} ${preferences.copies === 1 ? 'copy' : 'copies'}`,
    preferences.paperSize,
    preferences.colorMode,
    preferences.sides,
    preferences.finishing !== 'None' ? preferences.finishing : null,
  ].filter(Boolean);

  const specSummary = `[Specs: ${parts.join(' | ')}]`;
  const trimmedNotes = (customNotes || '').trim();
  return trimmedNotes ? `${specSummary} ${trimmedNotes}` : specSummary;
}

/**
 * Validates student print request submission fields before upload
 */
export function validatePrintRequestInput(input: {
  fullName: string;
  roomNumber: string;
  copies: number;
  hasFile: boolean;
  fileSizeBytes?: number;
}): { valid: boolean; error?: string } {
  if (!input.fullName || !input.fullName.trim()) {
    return { valid: false, error: 'Full Name is required.' };
  }
  if (!input.roomNumber || !input.roomNumber.trim()) {
    return { valid: false, error: 'Room Number or campus location is required.' };
  }
  if (!Number.isInteger(input.copies) || input.copies < 1 || input.copies > 100) {
    return { valid: false, error: 'Number of copies must be between 1 and 100.' };
  }
  if (!input.hasFile) {
    return { valid: false, error: 'Please attach a document file to print.' };
  }
  if (input.fileSizeBytes !== undefined && input.fileSizeBytes > 25 * 1024 * 1024) {
    return { valid: false, error: 'File exceeds 25MB limit.' };
  }
  return { valid: true };
}
