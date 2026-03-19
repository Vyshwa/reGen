import Notification from '../models/Notification.js';
import User from '../models/User.js';

const parseMonthDay = (dob) => {
  if (!dob) return null;
  const s = String(dob).trim();
  const m = s.match(/^(\d{4})\D(\d{2})\D(\d{2})/);
  if (m) return { month: Number(m[2]), day: Number(m[3]) };
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return { month: d.getMonth() + 1, day: d.getDate() };
};

const isStaffUser = (u) => {
  if (!u?.role) return false;
  if (typeof u.role === 'string') return u.role === 'staff';
  return !!u.role?.staff;
};

const getUserDisplayName = (u) => {
  return (u?.name || u?.username || u?.userId || '').toString().trim();
};

const startOfTodayLocal = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const diffDays = (fromDate, toDate) => {
  const ms = toDate.getTime() - fromDate.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
};

const computeNextBirthday = (dob, fromDate) => {
  const md = parseMonthDay(dob);
  if (!md) return null;
  const year = fromDate.getFullYear();
  const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
  const normalizeDay = (y, month, day) => {
    if (month === 2 && day === 29 && !isLeap(y)) return 28;
    return day;
  };
  const dayThisYear = normalizeDay(year, md.month, md.day);
  let candidate = new Date(year, md.month - 1, dayThisYear);
  candidate.setHours(0, 0, 0, 0);
  if (candidate < fromDate) {
    const nextYear = year + 1;
    const dayNextYear = normalizeDay(nextYear, md.month, md.day);
    candidate = new Date(nextYear, md.month - 1, dayNextYear);
    candidate.setHours(0, 0, 0, 0);
  }
  return candidate;
};

const buildReminderNotifications = (staffUser, birthdayDate, daysBefore, recipients) => {
  const pad2 = (n) => String(n).padStart(2, '0');
  const birthdayIso = `${birthdayDate.getFullYear()}-${pad2(birthdayDate.getMonth() + 1)}-${pad2(birthdayDate.getDate())}`;
  const staffName = getUserDisplayName(staffUser);
  const createdAt = new Date().toISOString();
  const title = 'Birthday Reminder';
  const message = `Reminder: ${staffName}'s birthday is on ${birthdayIso}.`;
  return recipients.map((r) => {
    const recipientId = (r?.userId || '').toString();
    const staffId = (staffUser?.userId || '').toString();
    return {
      id: `bday-${staffId}-${birthdayIso}-d${daysBefore}-${recipientId}`,
      userId: recipientId,
      title,
      message,
      createdAt,
      read: false
    };
  });
};

export const runBirthdayReminderJob = async () => {
  const today = startOfTodayLocal();
  const allUsers = await User.find();
  const recipients = allUsers.filter((u) => String(u.status || 'active') !== 'inactive');
  const staff = recipients.filter((u) => isStaffUser(u) && u.dateOfBirth);

  const targetDays = new Set([7, 1]);
  const toInsert = [];
  for (const s of staff) {
    const nextBday = computeNextBirthday(s.dateOfBirth, today);
    if (!nextBday) continue;
    const daysUntil = diffDays(today, nextBday);
    if (!targetDays.has(daysUntil)) continue;
    toInsert.push(...buildReminderNotifications(s, nextBday, daysUntil, recipients));
  }

  if (toInsert.length === 0) {
    return { created: 0, attempted: 0 };
  }

  const ops = toInsert.map((doc) => ({
    updateOne: {
      filter: { id: doc.id },
      update: { $setOnInsert: doc },
      upsert: true
    }
  }));
  const result = await Notification.bulkWrite(ops, { ordered: false });
  const created = result?.upsertedCount || 0;
  return { created, attempted: toInsert.length };
};

export const createNotification = async (req, res) => {
  try {
    const notification = new Notification(req.body);
    await notification.save();
    res.status(201).json(notification);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getUserNotifications = async (req, res) => {
  try {
    const list = await Notification.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    res.status(200).json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const n = await Notification.findOneAndDelete({ id: req.params.id });
    if (!n) return res.status(404).json({ message: 'Notification not found' });
    res.status(200).json({ message: 'Notification deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const runBirthdayReminders = async (_req, res) => {
  try {
    const result = await runBirthdayReminderJob();
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
