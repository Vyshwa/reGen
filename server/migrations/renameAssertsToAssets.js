import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function renameAssertsToAssets() {
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
      const fixed = doc.attachments.map((att) => {
        if (typeof att === 'string' && att.includes('/asserts/')) {
          changed = true;
          return att.replace(/\/asserts\//g, '/assets/');
        }
        return att;
      });

      if (changed) {
        await collection.updateOne({ _id: doc._id }, { $set: { attachments: fixed } });
        updated++;
        console.log(`  Updated message ${doc._id}`);
      }
    }

    console.log(`Done. Scanned ${scanned}, updated ${updated}.`);
    await mongoose.disconnect();
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

renameAssertsToAssets();
