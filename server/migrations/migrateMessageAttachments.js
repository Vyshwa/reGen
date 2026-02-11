import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const assetsDir = path.resolve(__dirname, '..', '..', 'assets');

const ensureAssetsDir = async () => {
  await fs.promises.mkdir(assetsDir, { recursive: true });
};

const parseDataUri = (value) => {
  if (!value) return null;
  const match = String(value).match(/^data:([^;]+);base64,(.+)$/);
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
  if (m === 'application/pdf') return 'pdf';
  if (m === 'text/plain') return 'txt';
  return 'bin';
};

const sanitizeFileBase = (name) => {
  const base = String(name || '').replace(/[^a-zA-Z0-9._-]/g, '_');
  const trimmed = base.replace(/^_+|_+$/g, '').slice(0, 64);
  return trimmed || 'file';
};

const saveAttachmentDataUri = async (dataUri, name, seed, index) => {
  const parsed = parseDataUri(dataUri);
  if (!parsed) return null;
  await ensureAssetsDir();
  const base = sanitizeFileBase(name);
  const extFromName = path.extname(base);
  const ext = extFromName || `.${extFromMime(parsed.mime)}`;
  const filename = `msg-${sanitizeFileBase(seed || 'message')}-${Date.now()}-${index}-${Math.round(Math.random() * 1e6)}${ext}`;
  const filePath = path.join(assetsDir, filename);
  await fs.promises.writeFile(filePath, Buffer.from(parsed.data, 'base64'));
  return filePath;
};

const normalizeAttachment = async (att, seed, index) => {
  if (!att) return null;
  if (typeof att === 'string') {
    const normalized = att.startsWith('/assets/data:') ? att.replace(/^\/assets\//, '') : att;
    if (normalized.startsWith('data:')) return saveAttachmentDataUri(normalized, undefined, seed, index);
    if (normalized.startsWith('/assets/')) return path.join(assetsDir, normalized.replace('/assets/', ''));
    return normalized;
  }
  if (typeof att === 'object') {
    const data = att.data || att.url || att.dataUrl;
    if (typeof data === 'string' && data.startsWith('data:')) {
      return saveAttachmentDataUri(data, att.name, seed, index);
    }
    if (typeof att.path === 'string') {
      if (att.path.startsWith('/assets/')) return path.join(assetsDir, att.path.replace('/assets/', ''));
      return att.path;
    }
    if (typeof att.url === 'string') {
      if (att.url.startsWith('/assets/')) return path.join(assetsDir, att.url.replace('/assets/', ''));
      return att.url;
    }
  }
  return null;
};

async function migrateMessageAttachments() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const collection = mongoose.connection.collection('messages');
    const cursor = collection.find({ attachments: { $exists: true, $ne: [] } });

    let scanned = 0;
    let updated = 0;

    for await (const doc of cursor) {
      scanned++;
      if (!Array.isArray(doc.attachments)) continue;
      const seed = doc.messageId || doc.id || doc.senderId || doc._id?.toString();
      let changed = false;
      const normalized = [];
      for (let i = 0; i < doc.attachments.length; i += 1) {
        const att = doc.attachments[i];
        const saved = await normalizeAttachment(att, seed, i);
        if (saved && saved !== att) changed = true;
        if (saved) normalized.push(saved);
      }
      if (changed) {
        await collection.updateOne({ _id: doc._id }, { $set: { attachments: normalized } });
        updated++;
      }
    }

    console.log(`Message attachment migration done. scanned=${scanned} updated=${updated}`);
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateMessageAttachments();
