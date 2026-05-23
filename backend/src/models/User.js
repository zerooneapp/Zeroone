const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  name: { type: String },
  email: { type: String },
  image: { type: String },
  password: { type: String },
  role: { type: String, enum: ['super_admin', 'admin', 'vendor', 'staff', 'customer'], default: 'customer' },
  isBlocked: { type: Boolean, default: false },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }
  },
  address: { type: String },
  fcmTokens: [String], // For Web
  fcmTokenMobile: [String], // For Android/iOS
  gender: { type: String, enum: ['male', 'female', 'other'] },
  dob: { type: Date },
  referralCode: { type: String },
  favoriteVendors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }],
  is2FAEnabled: { type: Boolean, default: false },
  isBiometricEnabled: { type: Boolean, default: false },
  notificationSettings: {
    push: { type: Boolean, default: true },
    orders: { type: Boolean, default: true },
    promotional: { type: Boolean, default: false },
    sound: { type: Boolean, default: true },
    vibration: { type: Boolean, default: true }
  },
  preferences: {
    language: { type: String, default: 'English (In)' },
    currency: { type: String, default: 'INR (₹)' },
    region: { type: String, default: 'India' }
  },
  otp: { type: String },
  otpExpires: { type: Date }
}, { timestamps: true });

// Hash password and normalize phone before saving
userSchema.pre('save', async function () {
  // Normalize Phone
  if (this.isModified('phone')) {
    let val = this.phone.replace(/\D/g, '');
    if ((val.startsWith('91') || val.startsWith('0')) && val.length > 10) {
      val = val.slice(-10);
    }
    this.phone = val.slice(0, 10);
  }

  // Hash Password
  if (this.isModified('password')) {
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
});

// Compare password
userSchema.methods.comparePassword = async function (enteredPassword) {
  const bcrypt = require('bcryptjs');
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('User', userSchema);
