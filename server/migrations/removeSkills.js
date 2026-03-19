import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

// Migration script to remove skills field from all users
async function removeSkillsFromUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // First, let's see what we have
    const usersWithSkills = await User.find({ skills: { $exists: true } }).limit(2);
    console.log('Sample users with skills:', JSON.stringify(usersWithSkills, null, 2));

    // Remove skills field from all user documents using direct update
    const result = await User.collection.updateMany(
      {},
      { $unset: { skills: 1 } }
    );

    console.log(`Migration completed: ${result.modifiedCount} users updated`);
    
    // Verify the change
    const remaining = await User.countDocuments({ skills: { $exists: true } });
    console.log(`Users with skills field remaining: ${remaining}`);
    
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

removeSkillsFromUsers();
