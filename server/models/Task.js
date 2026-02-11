import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String },
  assignedTo: { type: String }, // User ID (Principal)
  status: { type: String, enum: ['todo', 'in_progress', 'review', 'done'], default: 'todo' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  assignorName: { type: String },
  durationValue: { type: Number },
  durationUnit: { type: String, enum: ['hours', 'days'] },
  dueDate: { type: String },
  startDate: { type: String },
  endDate: { type: String },
}, { timestamps: true });

export default mongoose.model('Task', taskSchema);
