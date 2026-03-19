import mongoose from 'mongoose';
import User from './models/User.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    const users = await User.find({});
    console.log('Users found:', users.length);
    users.forEach(u => {
      console.log(`- ${u.username} (${u.role}) ID: ${u.userId}`);
    });
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

checkUsers();
