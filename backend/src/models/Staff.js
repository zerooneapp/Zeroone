const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Optional for now
  name: { type: String, required: true },
  // Optional: a staff member with no phone cannot log in to the staff panel.
  // Adding/updating a phone later enables their login.
  phone: { type: String },
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
  isDeleted: { type: Boolean, default: false },
  isFirstLogin: { type: Boolean, default: true },
  isOwner: { type: Boolean, default: false },
  fcmTokens: [String], // For Web
  fcmTokenMobile: [String], // For Android/iOS
  otp: { type: String },
  otpExpires: { type: Date },
  note: { type: String, default: '' }
}, { timestamps: true });

// Hash password and normalize phone before saving
staffSchema.pre('save', async function () {
  // Normalize Phone
  if (this.isModified('phone') && this.phone && !this.phone.startsWith('DEL_')) {
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
  if (!this.password || !enteredPassword) return false;
  const bcrypt = require('bcryptjs');
  return await bcrypt.compare(enteredPassword, this.password);
};

// Unique per vendor only when a phone exists, so multiple phone-less staff are allowed.
staffSchema.index(
  { phone: 1, vendorId: 1 },
  { unique: true, partialFilterExpression: { phone: { $type: 'string' } } }
);
staffSchema.index({ vendorId: 1 });
staffSchema.index({ vendorId: 1, isOwner: 1 }, { unique: true, partialFilterExpression: { isOwner: true } });

module.exports = mongoose.model('Staff', staffSchema);
