const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  shopName: { type: String, required: true },
  ownerName: { type: String, required: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } // [lng, lat]
  },
  address: { type: String },
  panCard: { type: String },
  gstCertificate: { type: String },
  shopRegistration: { type: String },
  aadhaarFront: { type: String },
  aadhaarBack: { type: String },
  shopImage: { type: String },
  galleryImages: [{ type: String }], // Array of URLs
  shopVideo: { type: String }, // Video URL
  featuredImage: { type: String }, // User-selected image for Discovery Page
  vendorPhoto: { type: String },
  serviceMode: { type: String, enum: ['shop', 'home'], default: 'shop' },
  workingHours: {
    start: { type: String, default: '09:00 AM' },
    end: { type: String, default: '09:00 PM' }
  },
  isProfileComplete: { type: Boolean, default: false },
  rejectionReason: { type: String },
  rating: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
  walletBalance: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'approved', 'active', 'inactive', 'blocked', 'rejected'], default: 'pending' },
  isActive: { type: Boolean, default: true },
  planType: { type: String, enum: ['daily', 'monthly', 'trial'], default: 'trial' },
  serviceLevel: { type: String, enum: ['standard', 'premium', 'luxury'], default: 'standard' },
  expiryDate: { type: Date },
  profileViews: { type: Number, default: 0 },
  serviceClicks: { type: Number, default: 0 },
  lastDeductionDate: { type: Date },
  freeTrial: {
    isActive: { type: Boolean, default: true },
    expiryDate: { type: Date }
  },
  offers: [{
    title: { type: String },
    discountPercentage: { type: Number },
    validTill: { type: Date }
  }],
  holidays: [{ type: Date }],
  isShopOpen: { type: Boolean, default: true },
  isClosedToday: { type: Boolean, default: false },
  closedDates: [{ type: Date }]
}, { timestamps: true });

vendorSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Vendor', vendorSchema);
