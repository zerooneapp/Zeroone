const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  name: { type: String },
  email: { type: String },
  image: { type: String },
  password: { type: String },
  role: { type: String, enum: ['admin', 'vendor', 'staff', 'customer'], default: 'customer' },
  isBlocked: { type: Boolean, default: false },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }
  },
  address: { type: String },
  fcmTokens: [{
    token: { type: String },
    deviceType: { type: String, enum: ['android', 'ios', 'web'] },
    lastUsedAt: { type: Date, default: Date.now }
  }],
  gender: { type: String, enum: ['male', 'female', 'other'] },
  dob: { type: Date },
  referralCode: { type: String },
  favoriteVendors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }],
  otp: { type: String },
  otpExpires: { type: Date }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  const bcrypt = require('bcryptjs');
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password
userSchema.methods.comparePassword = async function(enteredPassword) {
  const bcrypt = require('bcryptjs');
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('User', userSchema);
