import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true }, // Principal ID
  username: { type: String, required: true },
  password: { type: String, select: false }, 
  mustChangePassword: { type: Boolean, default: true },
  resetTokenHash: { type: String, select: false },
  resetTokenExpiresAt: { type: Date },
  name: { type: String },
  age: { type: Number },
  dateOfBirth: { type: String },
  gender: { type: String },
  aadhaar: { type: String },
  role: { type: String, enum: ['admin', 'owner', 'param', 'staff', 'intern', 'freelancer'], required: true },
  email: { type: String },
  phone: { type: String },
  department: { type: String },
  designation: { type: String },
  salary: { type: String }, // Storing as string to handle BigInt if needed, or number
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  joiningDate: { type: String },
  referralSource: { type: String },
  avatar: { type: String }, // Stores file path like '/uploads/avatar-userId.ext'
  address: { type: String }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
