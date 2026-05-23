const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Optional for now
  name: { type: String, required: true },
  phone: { type: String, required: true },
  password: { type: String },
  role: { type: String, default: 'staff' },
  designation: { type: String, default: 'Staff' },
  image: { type: String },
  services: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
    validate: {
      validator: (v) => v && v.length > 0,
      message: 'Staff must have at least one assigned service'
    }
  },
  isActive: { type: Boolean, default: true },
  isFirstLogin: { type: Boolean, default: true },
  isOwner: { type: Boolean, default: false },
  fcmTokens: [String], // For Web
  fcmTokenMobile: [String], // For Android/iOS
  otp: { type: String },
  otpExpires: { type: Date }
}, { timestamps: true });

// Hash password and normalize phone before saving
staffSchema.pre('save', async function () {
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
staffSchema.methods.comparePassword = async function (enteredPassword) {
  const bcrypt = require('bcryptjs');
  return await bcrypt.compare(enteredPassword, this.password);
};

staffSchema.index({ phone: 1 }, { unique: true });
staffSchema.index({ vendorId: 1 });
staffSchema.index({ vendorId: 1, isOwner: 1 }, { unique: true, partialFilterExpression: { isOwner: true } });

module.exports = mongoose.model('Staff', staffSchema);
