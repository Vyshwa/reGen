import mongoose from 'mongoose';
import User from './models/User.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

async function updateSuperAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    const user = await User.findOneAndUpdate({ username: 'Vyshwa' }, { role: 'param' }, { new: true });
    if (user) {
      console.log(`Updated user ${user.username} to role ${user.role}`);
    } else {
      console.log('User Vyshwa not found');
    }
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

updateSuperAdmin();
