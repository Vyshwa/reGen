/**
 * Migration: Backfill companyId on all data models.
 *
 * For each record that has a userId (attendance, leave, task, scrum, notification, message),
 * look up the user, get their companyId, and stamp it on the record.
 *
 * For meetingNotes and holidays (no userId), we'll assign them to a default company
 * if there's only one company, otherwise leave them null (SuperAdmin-visible only).
 *
 * Run: node migrations/backfillCompanyId.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import User from '../models/User.js';
import Company from '../models/Company.js';
import Task from '../models/Task.js';
import Attendance from '../models/Attendance.js';
import Leave from '../models/Leave.js';
import MeetingNote from '../models/MeetingNote.js';
import Message from '../models/Message.js';
import Notification from '../models/Notification.js';
import ScrumNote from '../models/ScrumNote.js';
import Holiday from '../models/Holiday.js';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Step 1: Build a lookup map userId -> companyId
  const users = await User.find().lean();
  const userCompanyMap = new Map();
  for (const u of users) {
    if (u.companyId) {
      userCompanyMap.set(u.userId, u.companyId);
    }
  }

  // Step 2: Fix any owners missing companyId
  const companies = await Company.find().lean();
  for (const c of companies) {
    if (c.ownerId && !userCompanyMap.has(c.ownerId)) {
      await User.updateOne({ userId: c.ownerId }, { companyId: c._id });
      userCompanyMap.set(c.ownerId, c._id);
      console.log(`  Fixed owner ${c.ownerId} -> company ${c.name}`);
    }
  }

  // Determine a default company if there's exactly one
  const defaultCompanyId = companies.length === 1 ? companies[0]._id : null;

  // Helper to backfill a collection that has userId
  const backfillByUserId = async (Model, name, userIdField = 'userId') => {
    const records = await Model.find({ companyId: { $exists: false } }).lean();
    const noCompany = await Model.find({ companyId: null }).lean();
    const all = [...records, ...noCompany];
    let updated = 0;
    for (const r of all) {
      const uid = r[userIdField];
      const cid = uid ? userCompanyMap.get(uid) : defaultCompanyId;
      if (cid) {
        await Model.updateOne({ _id: r._id }, { companyId: cid });
        updated++;
      }
    }
    console.log(`${name}: ${updated}/${all.length} records backfilled`);
  };

  // Helper for models without userId — use default company
  const backfillDefault = async (Model, name) => {
    if (!defaultCompanyId) {
      const count = await Model.countDocuments({ $or: [{ companyId: { $exists: false } }, { companyId: null }] });
      console.log(`${name}: ${count} records have no companyId (multiple companies exist, skipping — SuperAdmin will see them)`);
      return;
    }
    const result = await Model.updateMany(
      { $or: [{ companyId: { $exists: false } }, { companyId: null }] },
      { companyId: defaultCompanyId }
    );
    console.log(`${name}: ${result.modifiedCount} records assigned to default company`);
  };

  // Task: has assignedTo (userId) field
  const tasks = await Task.find({ $or: [{ companyId: { $exists: false } }, { companyId: null }] }).lean();
  let taskUpdated = 0;
  for (const t of tasks) {
    const cid = t.assignedTo ? userCompanyMap.get(t.assignedTo) : defaultCompanyId;
    if (cid) {
      await Task.updateOne({ _id: t._id }, { companyId: cid });
      taskUpdated++;
    }
  }
  console.log(`Task: ${taskUpdated}/${tasks.length} records backfilled`);

  await backfillByUserId(Attendance, 'Attendance');
  await backfillByUserId(Leave, 'Leave');
  await backfillByUserId(ScrumNote, 'ScrumNote');
  await backfillByUserId(Notification, 'Notification');

  // Message: senderId field
  await backfillByUserId(Message, 'Message', 'senderId');

  // MeetingNote & Holiday: no userId, use default company
  await backfillDefault(MeetingNote, 'MeetingNote');
  await backfillDefault(Holiday, 'Holiday');

  console.log('\nBackfill complete!');
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
