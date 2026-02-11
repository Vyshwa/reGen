import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  messageId: { type: String, required: true, unique: true },
  id: { type: String }, 
  senderId: { type: String, required: true },
  senderName: { type: String },
  content: { type: String, default: '' },
  timestamp: { type: String, required: true },
  attachments: [{ type: String }] // physical file paths only
}, { timestamps: true });

export default mongoose.model('Message', messageSchema);
