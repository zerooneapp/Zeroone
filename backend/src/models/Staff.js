const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Optional for now
  name: { type: String, required: true },
  phone: { type: String, required: true },
  password: { type: String },
  role: { type: String, default: 'staff' },
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
  otp: { type: String },
  otpExpires: { type: Date }
}, { timestamps: true });

// Hash password before saving
staffSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  const bcrypt = require('bcryptjs');
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password
staffSchema.methods.comparePassword = async function(enteredPassword) {
  const bcrypt = require('bcryptjs');
  return await bcrypt.compare(enteredPassword, this.password);
};

staffSchema.index({ vendorId: 1 });

module.exports = mongoose.model('Staff', staffSchema);
