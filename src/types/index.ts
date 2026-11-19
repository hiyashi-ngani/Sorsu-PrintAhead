export type UserRole = 'admin' | 'student' | 'print_shop_staff' | 'student_runner';

export type RequestStatus =
  | 'Pending Review'
  | 'Reviewed / Awaiting Payment'
  | 'Printing'
  | 'Ready for Delivery'
  | 'Out for Delivery'
  | 'Completed'
  | 'Cancelled';

export type DeliveryStatus = 'Assigned' | 'Out for Delivery' | 'Delivered';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  shopId?: string | null;
  createdAt: string;
}

export interface PrintShop {
  id: string;
  name: string;
  location: string;
  operatingHours: string;
  contactEmail: string;
  isActive: boolean;
  createdAt: string;
}

export interface PrintRequest {
  id: string;
  referenceNumber: string;
  studentId: string;
  fullName: string;
  roomNumber: string;
  shopId?: string | null;
  shopName?: string | null;
  instructionMessage?: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  status: RequestStatus;
  printPrice?: number | null;
  createdAt: string;
  updatedAt: string;
  deliveryJob?: DeliveryJob | null;
  payment?: Payment | null;
}

export interface DeliveryJob {
  id: string;
  printRequestId: string;
  runnerId: string;
  runnerName: string;
  deliveryStatus: DeliveryStatus;
  acceptedAt: string;
  deliveredAt?: string | null;
}

export interface Payment {
  id: string;
  printRequestId: string;
  runnerId: string;
  runnerName: string;
  amount: number;
  paymentMethod: 'Cash on Delivery';
  paymentStatus: 'Confirmed';
  confirmedAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  printRequestId?: string;
  message: string;
  notificationType: string;
  isRead: boolean;
  createdAt: string;
  referenceNumber?: string;
}

export interface EmailLogEntry {
  id: string;
  toEmail: string;
  subject: string;
  referenceNumber: string;
  newStatus: RequestStatus;
  body: string;
  sentAt: string;
  provider?: 'Brevo' | 'Brevo (Simulation)' | 'Brevo (Permission Required)';
  messageId?: string;
  htmlContent?: string;
  errorDetails?: string;
}
