import mongoose from 'mongoose';

const scrumNoteSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', index: true },
  userId: { type: String, required: true },
  taskDetails: { type: String, required: true },
  status: { type: String, enum: ['in_progress', 'paused', 'completed', 'blocked'], default: 'in_progress' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  blockerNotes: { type: String },
  elapsedMs: { type: Number },
  pausedAt: { type: String },
  timer: { type: Number, default: 0 },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model('ScrumNote', scrumNoteSchema);
