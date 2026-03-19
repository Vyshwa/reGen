import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const assetsDir = path.resolve(__dirname, '..', '..', 'assets');

const resolveAttachmentPath = (p) => {
  if (!p) return null;
  if (p.startsWith('/assets/')) return path.join(assetsDir, p.replace('/assets/', ''));
  return p;
};

const detectExt = async (filePath) => {
  try {
    const fd = await fs.promises.open(filePath, 'r');
    const buffer = Buffer.alloc(16);
    await fd.read(buffer, 0, 16, 0);
    await fd.close();

    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
    if (buffer.slice(0, 8).toString('hex') === '89504e470d0a1a0a') return 'png';
    if (buffer.slice(0, 4).toString() === 'GIF8') return 'gif';
    if (buffer.slice(0, 4).toString() === 'RIFF' && buffer.slice(8, 12).toString() === 'WEBP') return 'webp';
    if (buffer.slice(0, 4).toString() === '%PDF') return 'pdf';
    return null;
  } catch {
    return null;
  }
};

async function fixMessageAttachmentExtensions() {
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

      let changed = false;
      const normalized = [];

      for (const att of doc.attachments) {
        if (typeof att !== 'string') {
          normalized.push(att);
          continue;
        }

        const ext = path.extname(att);
        if (ext) {
          normalized.push(att);
          continue;
        }

        const physicalPath = resolveAttachmentPath(att);
        if (!physicalPath || !fs.existsSync(physicalPath)) {
          normalized.push(att);
          continue;
        }

        const detected = await detectExt(physicalPath);
        if (!detected) {
          normalized.push(att);
          continue;
        }

        const newPhysicalPath = `${physicalPath}.${detected}`;
        await fs.promises.rename(physicalPath, newPhysicalPath);

        const publicPath = att.startsWith('/assets/')
          ? `${att}.${detected}`
          : newPhysicalPath;

        normalized.push(publicPath);
        changed = true;
      }

      if (changed) {
        await collection.updateOne({ _id: doc._id }, { $set: { attachments: normalized } });
        updated++;
      }
    }

    console.log(`Attachment extension fix done. scanned=${scanned} updated=${updated}`);
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

fixMessageAttachmentExtensions();
