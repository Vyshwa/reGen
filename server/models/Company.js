import mongoose from 'mongoose';

const companySchema = new mongoose.Schema({
  name: { type: String, required: true },
  gst: { type: String },
  phoneNumber: { type: String, required: true },
  email: { type: String },
  category: { type: String },
  about: { type: String },
  address: { type: String }, 
  city: { type: String, required: true },
  state: { type: String },
  zip: { type: String },
  taxDetails: { type: String },
  policies: { type: String },
  ownerId: { type: String, required: true }, // Links to the user who created it (Owner)
  status: { type: String, enum: ['active', 'blocked'], default: 'active' },
}, { timestamps: true });

export default mongoose.model('Company', companySchema);
