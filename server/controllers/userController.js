import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const DEFAULT_PASSWORD = '1234';

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
  const filename = `avatar-${safeSeed}-${Date.now()}.${ext}`;
  const filePath = path.join(uploadsDir, filename);
  await fs.promises.writeFile(filePath, Buffer.from(parsed.data, 'base64'));
  return `/uploads/${filename}`;
};

const normalizeAvatarInput = async (raw, seed) => {
  if (!raw) return raw;
  const s = String(raw).trim();
  if (!s) return s;
  const normalized = s.startsWith('/uploads/data:') ? s.replace(/^\/uploads\//, '') : s;
  if (normalized.startsWith('data:')) {
    const saved = await saveAvatarDataUri(normalized, seed);
    return saved || s;
  }
  if (normalized.startsWith('http://') || normalized.startsWith('https://') || normalized.startsWith('/uploads/')) {
    return normalized;
  }
  return `/uploads/${normalized.replace(/^\/+/, '')}`;
};

const normalizeIsoDate = (value) => {
  if (!value) return value;
  const s = String(value).trim();
  if (!s) return s;
  const isoMatch = s.match(/^(\d{4})\D(\d{2})\D(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  const dmyMatch = s.match(/^(\d{2})\D(\d{2})\D(\d{4})$/);
  if (dmyMatch) return `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return s;
};

const computeAgeFromDob = (dobIso) => {
  if (!dobIso) return undefined;
  const dob = new Date(`${dobIso}T00:00:00`);
  if (Number.isNaN(dob.getTime())) return undefined;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
};

const sanitizeUser = (userDoc) => {
  if (!userDoc) return userDoc;
  const obj = typeof userDoc.toObject === 'function' ? userDoc.toObject() : { ...userDoc };
  delete obj.password;
  return obj;
};

export const createUser = async (req, res) => {
  try {
    const body = { ...req.body };
    if (body.contact && !body.phone) {
      body.phone = body.contact;
      delete body.contact;
    }
    const pwdRaw = body.password !== undefined ? String(body.password || '').trim() : '';
    const pwd = pwdRaw || DEFAULT_PASSWORD;
    body.password = await bcrypt.hash(pwd, 10);
    body.mustChangePassword = pwd === DEFAULT_PASSWORD;
    if (body.joiningDate) body.joiningDate = normalizeIsoDate(body.joiningDate);
    if (body.dateOfBirth) body.dateOfBirth = normalizeIsoDate(body.dateOfBirth);
    if (body.dateOfBirth) {
      const age = computeAgeFromDob(body.dateOfBirth);
      if (age !== undefined) body.age = age;
    }
    if (body.firstName || body.lastName) {
      const fn = (body.firstName || '').trim();
      const ln = (body.lastName || '').trim();
      body.name = [fn, ln].filter(Boolean).join(' ').trim();
      delete body.firstName;
      delete body.lastName;
    }
    // Remove skills if present (no longer supported)
    delete body.skills;
    if (body.avatar !== undefined) {
      body.avatar = await normalizeAvatarInput(body.avatar, body.userId || body.username || body.name || 'user');
    }
    const user = new User(body);
    await user.save();
    res.status(201).json(sanitizeUser(user));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users.map(sanitizeUser));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getUser = async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.id });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(200).json(sanitizeUser(user));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    // Expecting id in body or params. Support body.userId or params.id
    const id = req.body.userId || req.params.id;
    const body = { ...req.body };
    if (body.contact && !body.phone) {
      body.phone = body.contact;
      delete body.contact;
    }
    if (body.password !== undefined) {
      const pwd = String(body.password || '').trim();
      if (!pwd) {
        delete body.password;
      } else {
        body.password = await bcrypt.hash(pwd, 10);
        body.mustChangePassword = pwd === DEFAULT_PASSWORD;
      }
    }
    if (body.joiningDate) body.joiningDate = normalizeIsoDate(body.joiningDate);
    if (body.dateOfBirth) body.dateOfBirth = normalizeIsoDate(body.dateOfBirth);
    if (body.dateOfBirth) {
      const age = computeAgeFromDob(body.dateOfBirth);
      if (age !== undefined) body.age = age;
    }
    if (body.firstName || body.lastName) {
      const fn = (body.firstName || '').trim();
      const ln = (body.lastName || '').trim();
      body.name = [fn, ln].filter(Boolean).join(' ').trim();
      delete body.firstName;
      delete body.lastName;
    }
    // Remove skills if present (no longer supported)
    delete body.skills;
    if (body.avatar !== undefined) {
      body.avatar = await normalizeAvatarInput(body.avatar, id || body.userId || body.username || body.name || 'user');
    }
    const user = await User.findOneAndUpdate({ userId: id }, body, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(200).json(sanitizeUser(user));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const user = await User.findOneAndDelete({ userId: req.params.id });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
