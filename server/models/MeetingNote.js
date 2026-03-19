import mongoose from 'mongoose';

const meetingNoteSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  timestamp: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model('MeetingNote', meetingNoteSchema);
