import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  date: { type: String, required: true },
  status: { type: String, enum: ['present', 'absent', 'late', 'half_day'], default: 'present' },
  checkIn: { type: String },
  checkOut: { type: String },
  location: { type: String },
  workMode: { type: String, enum: ['office', 'remote'], default: 'office' },
  notes: { type: String }
}, { timestamps: true });

export default mongoose.model('Attendance', attendanceSchema);
