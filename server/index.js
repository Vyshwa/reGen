import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import userRoutes from './routes/users.js';
import taskRoutes from './routes/tasks.js';
import attendanceRoutes from './routes/attendance.js';
import companyRoutes from './routes/company.js';
import leavesRoutes from './routes/leaves.js';
import notificationRoutes from './routes/notifications.js';
import messageRoutes from './routes/messages.js';
import meetingNoteRoutes from './routes/meetingNotes.js';
import scrumRoutes from './routes/scrum.js';
import holidayRoutes from './routes/holidays.js';
import { addHoliday, getAllHolidays } from './controllers/holidayController.js';
import { runBirthdayReminderJob } from './controllers/notificationController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5006;
const DEFAULT_PASSWORD = '1234';

app.use(cors());
app.use(express.json({ limit: '1024mb' }));
app.use(express.urlencoded({ extended: true, limit: '1024mb' }));

// Setup uploads directory
const uploadsDir = path.resolve(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Setup attachment directory
const assetsDir = path.resolve(__dirname, '..', 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}
app.use('/assets', express.static(assetsDir));

// Configure multer for avatar uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const userId = req.body.userId || req.params.userId || Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${userId}${ext}`);
  }
});
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  }
});

// Database Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Seed Super Admin
import User from './models/User.js';
async function seedSuperAdmin() {
  try {
    const existing = await User.findOne({ username: 'Vyshwa' }).select('+password');
    if (!existing) {
      const password = await bcrypt.hash('S@@ttv1k@', 10);
      await User.create({
        userId: 'Vyshwa',
        username: 'Vyshwa',
        password,
        mustChangePassword: false,
        name: 'Vyshwa',
        role: 'owner',
        status: 'active',
        joiningDate: new Date().toISOString()
      });
    } else {
      let changed = false;
      if (existing.password && !String(existing.password).startsWith('$2')) {
        existing.password = await bcrypt.hash(String(existing.password), 10);
        changed = true;
      }
      if (existing.mustChangePassword !== false) {
        existing.mustChangePassword = false;
        changed = true;
      }
      if (changed) await existing.save();
    }
  } catch (e) {
    // no-op
  }
}
mongoose.connection.once('open', async () => {
  await seedSuperAdmin();
  try {
    await runBirthdayReminderJob();
  } catch {
    // no-op
  }

  const scheduleDaily = () => {
    const now = new Date();
    const next = new Date(now);
    next.setDate(now.getDate() + 1);
    next.setHours(0, 5, 0, 0);
    const delay = Math.max(0, next.getTime() - now.getTime());
    setTimeout(async () => {
      try {
        await runBirthdayReminderJob();
      } catch {
        // no-op
      }
      scheduleDaily();
    }, delay);
  };

  scheduleDaily();
});

// Routes
app.get('/', (req, res) => {
  res.send('ReGen Backend Running');
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const identifier = String(req.body?.identifier || '').trim();
    const password = String(req.body?.password || '');
    if (!identifier || !password) {
      return res.status(400).json({ message: 'Identifier and password are required' });
    }

    const user = await User.findOne({ $or: [{ userId: identifier }, { username: identifier }] }).select('+password');
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const stored = user.password ? String(user.password) : '';
    let ok = false;
    if (stored.startsWith('$2')) {
      ok = await bcrypt.compare(password, stored);
    } else {
      ok = stored === password;
      if (ok) {
        user.password = await bcrypt.hash(password, 10);
        await user.save();
      }
    }

    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const payload = user.toObject();
    delete payload.password;
    if (payload.mustChangePassword === undefined) payload.mustChangePassword = false;
    res.status(200).json(payload);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.post('/api/auth/change-password', async (req, res) => {
  try {
    const identifier = String(req.body?.identifier || '').trim();
    const currentPassword = String(req.body?.currentPassword || '');
    const newPassword = String(req.body?.newPassword || '');
    if (!identifier || !currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Identifier, currentPassword and newPassword are required' });
    }
    if (newPassword.length < 4) {
      return res.status(400).json({ message: 'Password must be at least 4 characters' });
    }

    const user = await User.findOne({ $or: [{ userId: identifier }, { username: identifier }] }).select('+password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const stored = user.password ? String(user.password) : '';
    let ok = false;
    if (stored.startsWith('$2')) {
      ok = await bcrypt.compare(currentPassword, stored);
    } else {
      ok = stored === currentPassword;
    }
    if (!ok) return res.status(401).json({ message: 'Invalid current password' });

    user.password = await bcrypt.hash(newPassword, 10);
    user.mustChangePassword = newPassword === DEFAULT_PASSWORD;
    user.resetTokenHash = undefined;
    user.resetTokenExpiresAt = undefined;
    await user.save();

    res.status(200).json({ message: 'Password changed successfully' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.post('/api/auth/reset-link', async (req, res) => {
  try {
    const adminIdentifier = String(req.body?.adminIdentifier || '').trim();
    const adminPassword = String(req.body?.adminPassword || '');
    const targetIdentifier = String(req.body?.targetIdentifier || '').trim();
    if (!adminIdentifier || !adminPassword || !targetIdentifier) {
      return res.status(400).json({ message: 'adminIdentifier, adminPassword and targetIdentifier are required' });
    }

    const admin = await User.findOne({ $or: [{ userId: adminIdentifier }, { username: adminIdentifier }] }).select('+password');
    if (!admin) return res.status(401).json({ message: 'Invalid admin credentials' });

    const adminStored = admin.password ? String(admin.password) : '';
    const adminOk = adminStored.startsWith('$2')
      ? await bcrypt.compare(adminPassword, adminStored)
      : (adminStored === adminPassword);
    if (!adminOk) return res.status(401).json({ message: 'Invalid admin credentials' });
    if (!['admin', 'owner'].includes(String(admin.role))) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const target = await User.findOne({ $or: [{ userId: targetIdentifier }, { username: targetIdentifier }] }).select('+resetTokenHash');
    if (!target) return res.status(404).json({ message: 'Target user not found' });

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    target.resetTokenHash = tokenHash;
    target.resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await target.save();

    const base = process.env.FRONTEND_BASE_URL || `https//regen.krishub.in`;
    const link = `${base}/?resetToken=${token}`;
    res.status(200).json({ link, expiresInMinutes: 60 });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const token = String(req.body?.token || '').trim();
    const newPassword = String(req.body?.newPassword || '');
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'token and newPassword are required' });
    }
    if (newPassword.length < 4) {
      return res.status(400).json({ message: 'Password must be at least 4 characters' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetTokenHash: tokenHash,
      resetTokenExpiresAt: { $gt: new Date() }
    }).select('+resetTokenHash +password');
    if (!user) return res.status(400).json({ message: 'Invalid or expired reset token' });

    user.password = await bcrypt.hash(newPassword, 10);
    user.mustChangePassword = newPassword === DEFAULT_PASSWORD;
    user.resetTokenHash = undefined;
    user.resetTokenExpiresAt = undefined;
    await user.save();

    res.status(200).json({ message: 'Password reset successfully', userId: user.userId });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Avatar upload endpoint
app.post('/api/users/:userId/avatar', upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const userId = req.params.userId;
    const avatarPath = `/uploads/${req.file.filename}`;
    
    // Update user's avatar field
    const user = await User.findOneAndUpdate(
      { userId },
      { avatar: avatarPath },
      { new: true }
    );
    
    if (!user) {
      // Delete uploaded file if user not found
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json({ 
      message: 'Avatar uploaded successfully', 
      avatar: avatarPath,
      user: {
        userId: user.userId,
        username: user.username,
        name: user.name,
        avatar: user.avatar
      }
    });
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        console.error('Failed to delete uploaded file:', e);
      }
    }
    res.status(500).json({ message: error.message });
  }
});

app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/leaves', leavesRoutes);
// Health check: verify server and MongoDB connection
app.get('/api/health', (req, res) => {
  try {
    const state = mongoose.connection.readyState; // 1=connected
    res.json({
      status: 'ok',
      mongoConnected: state === 1,
      mongoState: state,
      port: PORT
    });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/meeting-notes', meetingNoteRoutes);
app.use('/api/scrum', scrumRoutes);
app.use('/api/holidays', holidayRoutes);
// Fallback direct bindings (in case router mounting fails)
app.get('/api/holidays', getAllHolidays);
app.post('/api/holidays', addHoliday);

// === SuperAdmin Deploy Endpoints (Vyshwa only) ===
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

const REPO_DIR = '/home/vyshwa/web/reGen';
const LIVE_DIR = '/home/vyshwa/web/regen_live';
const NGINX_DIR = '/web/regen_live';

const isSuperAdmin = async (req) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return false;
  const user = await User.findOne({ $or: [{ userId }, { username: userId }] });
  return user && user.role === 'param';
};

app.post('/api/deploy/git-pull', async (req, res) => {
  if (!(await isSuperAdmin(req))) return res.status(403).json({ message: 'Forbidden' });
  try {
    const { stdout, stderr } = await execAsync('git pull origin main', { cwd: REPO_DIR, timeout: 30000 });
    res.json({ success: true, output: stdout + (stderr || '') });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message, output: e.stderr || e.stdout || '' });
  }
});

app.post('/api/deploy/rebuild', async (req, res) => {
  if (!(await isSuperAdmin(req))) return res.status(403).json({ message: 'Forbidden' });
  try {
    // 1. Build frontend
    const buildResult = await execAsync('npm run build', { cwd: path.join(REPO_DIR, 'frontend'), timeout: 120000 });

    // 2. Sync to regen_live
    await execAsync(`rm -rf ${LIVE_DIR}/assets ${LIVE_DIR}/index.html ${LIVE_DIR}/logo.png`, { cwd: REPO_DIR });
    await execAsync(`cp -r ${REPO_DIR}/frontend/dist/* ${LIVE_DIR}/`, { cwd: REPO_DIR });
    await execAsync(`cp -r ${REPO_DIR}/server/* ${LIVE_DIR}/server/`, { cwd: REPO_DIR });

    // 3. Sync to nginx root
    await execAsync(`sudo rm -rf ${NGINX_DIR}/assets ${NGINX_DIR}/index.html ${NGINX_DIR}/logo.png`, { cwd: REPO_DIR });
    await execAsync(`sudo cp -r ${LIVE_DIR}/assets ${LIVE_DIR}/index.html ${LIVE_DIR}/logo.png ${NGINX_DIR}/`, { cwd: REPO_DIR });

    // 4. Install server deps if needed
    await execAsync('npm install --production', { cwd: path.join(LIVE_DIR, 'server'), timeout: 60000 });

    res.json({ success: true, output: 'Build & deploy complete.\n' + buildResult.stdout });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message, output: e.stderr || e.stdout || '' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
