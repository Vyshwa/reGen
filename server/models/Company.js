import mongoose from 'mongoose';

const companySchema = new mongoose.Schema({
  name: { type: String },
  address: { type: String },
  contact: { type: String },
  gst: { type: String },
  taxDetails: { type: String },
  policies: { type: String }
}, { timestamps: true });

export default mongoose.model('Company', companySchema);
