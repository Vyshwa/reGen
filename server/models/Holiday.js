import mongoose from 'mongoose';

const holidaySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', index: true },
  name: { type: String, required: true },
  date: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model('Holiday', holidaySchema);
