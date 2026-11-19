import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import dotenv from 'dotenv';
import { AuthService } from './server/services/authService.ts';
import { PrintController } from './server/controllers/printController.ts';
import { DeliveryController } from './server/controllers/deliveryController.ts';
import { NotificationController } from './server/controllers/notificationController.ts';
import { AdminController } from './server/controllers/adminController.ts';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Middleware for parsing JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS for AI Studio iframe & preview proxy
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// Setup file storage directory
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Create sample documents in uploads so demo downloads work immediately
const sampleFiles = [
  'CS301-Thesis-Chapter1-DelaCruz.pdf',
  'Networking2-LabManual.pdf',
  'Algorithms-Activity-Sheet.pdf',
];
sampleFiles.forEach((file) => {
  const filePath = path.join(UPLOADS_DIR, file);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(
      filePath,
      `SorSU - Bulan Campus Printing Document\nFilename: ${file}\nSample printable educational content for SorSU: PrintAhead demonstration.\nPrinted for Sorsogon State University Students.\n`
    );
  }
});

// Configure Multer for document attachments (UC2)
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `doc-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
  fileFilter: (_req, file, cb) => {
    const allowedExts = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt', '.png', '.jpg', '.jpeg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid document format. Allowed: PDF, DOC, DOCX, PPTX, TXT, PNG, JPG'));
    }
  },
});

// Serve uploaded documents statically
app.use('/uploads', express.static(UPLOADS_DIR));

// ==========================================
// API REST ENDPOINTS
// ==========================================

// --- UC1: Authentication & User Profile ---
app.post('/api/auth/login', (req, res) => {
  const { email, fullName, role, password } = req.body;
  const result = AuthService.authenticateWithSorSUEmail(email, fullName, role, password);
  if (!result.success) {
    res.status(result.status || 400).json({ error: result.error });
    return;
  }
  res.json(result);
});

app.post('/api/auth/google', async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const bearerToken = authHeader.replace(/^Bearer\s+/i, '').trim() || req.body?.accessToken || '';
  const result = await AuthService.authenticateWithGoogleToken(bearerToken);
  if (!result.success) {
    res.status(result.status || 403).json({ error: result.error });
    return;
  }
  res.json(result);
});

app.get('/api/auth/me', (req, res) => {
  const user = AuthService.verifyToken(req.headers.authorization);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }
  res.json({ user });
});

// --- UC2, UC3, UC4, UC6, UC7, UC8: Print Requests ---
app.post('/api/requests', upload.single('document'), PrintController.submitRequest);
app.get('/api/requests/student', PrintController.getStudentRequests);
app.get('/api/requests/all', PrintController.getAllRequests);
app.get('/api/requests/:id', PrintController.getRequestById);
app.post('/api/requests/:id/cancel', PrintController.cancelRequest);
app.post('/api/requests/:id/price', PrintController.setPrice);
app.post('/api/requests/:id/status', PrintController.updatePrintStatus);

// --- UC9, UC10, UC11: Delivery Jobs & Cash Payments ---
app.get('/api/delivery/available', DeliveryController.getAvailableJobs);
app.get('/api/delivery/runner', DeliveryController.getRunnerJobs);
app.post('/api/delivery/:id/accept', DeliveryController.acceptJob);
app.post('/api/delivery/:id/deliver', DeliveryController.markDelivered);
app.post('/api/delivery/:id/confirm-payment', DeliveryController.confirmPayment);

// --- UC5: Notifications & Email Logs ---
app.get('/api/notifications', NotificationController.getNotifications);
app.post('/api/notifications/:id/read', NotificationController.markRead);
app.post('/api/notifications/read-all', NotificationController.markAllRead);
app.get('/api/notifications/emails', NotificationController.getEmailLogs);
app.get('/api/notifications/brevo-status', NotificationController.getBrevoConfig);

// --- Printing Shops & Admin Management ---
app.get('/api/shops', AdminController.getShops);
app.get('/api/admin/overview', AdminController.getOverview);
app.get('/api/admin/users', AdminController.getUsers);
app.post('/api/admin/users/:id/role', AdminController.updateUserRole);
app.post('/api/admin/shops', AdminController.createShop);
app.put('/api/admin/shops/:id', AdminController.updateShop);

// ==========================================
// Vite Dev Server / Static Hosting Integration
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SorSU: PrintAhead] Server is running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[SorSU: PrintAhead] Failed to start server:', err);
});
