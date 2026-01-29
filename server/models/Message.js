import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  messageId: { type: String, required: true, unique: true },
  id: { type: String }, 
  senderId: { type: String, required: true },
  senderName: { type: String },
  content: { type: String, default: '' },
  timestamp: { type: String, required: true },
  attachments: [
    {
      name: { type: String },
      type: { type: String },
      size: { type: Number },
      data: { type: String } // data URL (base64) for quick demo; consider external storage for production
    }
  ]
}, { timestamps: true });

export default mongoose.model('Message', messageSchema);
