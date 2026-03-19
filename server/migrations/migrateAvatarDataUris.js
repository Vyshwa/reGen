import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '..', '..', 'frontend', 'uploads');

const ensureUploadsDir = async () => {
  await fs.promises.mkdir(uploadsDir, { recursive: true });
};

const parseDataUriImage = (value) => {
  if (!value) return null;
  const match = String(value).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;
  return { mime: match[1], data: match[2] };
};

const extFromMime = (mime) => {
  const m = String(mime || '').toLowerCase();
  if (m === 'image/jpeg' || m === 'image/jpg') return 'jpg';
  if (m === 'image/png') return 'png';
  if (m === 'image/gif') return 'gif';
  if (m === 'image/webp') return 'webp';
  if (m === 'image/svg+xml') return 'svg';
  return 'bin';
};

const saveAvatarDataUri = async (dataUri, seed) => {
  const parsed = parseDataUriImage(dataUri);
  if (!parsed) return null;
  await ensureUploadsDir();
  const ext = extFromMime(parsed.mime);
  const safeSeed = String(seed || 'user').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32) || 'user';
  const filename = `avatar-${safeSeed}-${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
  const filePath = path.join(uploadsDir, filename);
  await fs.promises.writeFile(filePath, Buffer.from(parsed.data, 'base64'));
  return `/uploads/${filename}`;
};

const normalizeAvatarValue = (avatar) => {
  if (!avatar) return null;
  const s = String(avatar).trim();
  if (!s) return null;
  if (s.startsWith('/uploads/data:')) return s.replace(/^\/uploads\//, '');
  return s.startsWith('data:') ? s : null;
};

async function migrateAvatarDataUris() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const candidates = User.find({
      avatar: { $regex: /^(\/uploads\/data:|data:)/ }
    }).cursor();

    let scanned = 0;
    let updated = 0;
    let skipped = 0;

    for await (const user of candidates) {
      scanned++;
      const dataUri = normalizeAvatarValue(user.avatar);
      if (!dataUri) {
        skipped++;
        continue;
      }

      const savedPath = await saveAvatarDataUri(dataUri, user.userId || user.username || user.name || user._id);
      if (!savedPath) {
        skipped++;
        continue;
      }

      user.avatar = savedPath;
      await user.save();
      updated++;
    }

    console.log(`Avatar migration done. scanned=${scanned} updated=${updated} skipped=${skipped}`);
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateAvatarDataUris();
