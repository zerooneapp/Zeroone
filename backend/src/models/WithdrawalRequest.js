const mongoose = require('mongoose');

const withdrawalRequestSchema = new mongoose.Schema({
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  amount: { type: Number, required: true },
  method: { type: String, enum: ['bank_transfer', 'upi'], required: true },
  bankDetails: {
    accountHolderName: String,
    accountNumber: String,
    ifscCode: String,
    bankName: String
  },
  upiDetails: {
    upiId: String,
    qrCode: String // URL to QR code image if uploaded
  },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  },
  rejectionReason: { type: String },
  processedAt: { type: Date },
  adminNotes: { type: String },
  referenceId: { type: String, unique: true }
}, { timestamps: true });

module.exports = mongoose.model('WithdrawalRequest', withdrawalRequestSchema);
