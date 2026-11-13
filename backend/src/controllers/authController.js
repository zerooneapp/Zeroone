const User = require('../models/User');
const Staff = require('../models/Staff');
const generateToken = require('../utils/generateToken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sendOtpSms } = require('../services/smsService');

const { checkAndRecordOtpSend, MAX_VERIFY_ATTEMPTS } = require('../utils/otpThrottle');

// Fixed-OTP (123456) test accounts. Keep this list minimal.
const TEST_OTP_NUMBERS = ['1234567890', '8817921168', '9669002380', '7879363299'];

const shouldExposeOtpInResponse = false;
const shouldLogOtpToConsole = true;

const generateTemporaryPassword = () => crypto.randomBytes(24).toString('hex');

const sanitizePublicRole = (role) => (role === 'vendor' ? 'vendor' : 'customer');
const isAdminRole = (role) => ['admin', 'super_admin'].includes(role);

// Self-heal: a vendor owner has an owner Staff record (isOwner: true) but their
// User document is missing. Without a User the login falls back to the Staff
// record and the owner lands on the staff dashboard. Recreate the User using the
// vendor's ownerId so existing links (Vendor.ownerId, Staff.userId) stay valid.
const restoreOwnerUser = async (staff) => {
  try {
    if (!staff || !staff.isOwner || !staff.vendorId) return null;
    const Vendor = require('../models/Vendor');
    const vendor = await Vendor.findById(staff.vendorId).select('ownerId');
    if (!vendor || !vendor.ownerId) return null;

    // Never overwrite an existing account (by id or phone).
    const existing = await User.findOne({ $or: [{ _id: vendor.ownerId }, { phone: staff.phone }] });
    if (existing) return null;

    const restored = await User.create({
      _id: vendor.ownerId,
      phone: staff.phone,
      name: staff.name,
      image: staff.image,
      role: 'vendor'
    });
    console.warn(`[AUTH-SELF-HEAL] Restored missing owner User ${restored._id} for vendor ${staff.vendorId}`);
    return restored;
  } catch (error) {
    console.error('[AUTH-SELF-HEAL-ERROR]', error.message);
    return null;
  }
};

// @desc    Login user / vendor / staff / admin
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { phone, email, password } = req.body;

    if ((!phone && !email) || !password) {
      return res.status(400).json({ message: 'Credentials and password are required' });
    }

    // 1. Check User Model (Admin, Vendor, Customer)
    let user = await User.findOne({
      $or: [{ phone: phone || '' }, { email: email || '' }]
    });

    let role = user ? user.role : null;
    let finalUser = user;

    if (user) {
      if (isAdminRole(user.role)) {
        return res.status(403).json({ message: 'Admins must use the secure admin login' });
      }
      const isMatch = await user.comparePassword(password);
      if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });
      if (user.isBlocked) return res.status(403).json({ message: 'Account is blocked' });
      if (user.isDeleted) return res.status(403).json({ message: 'Account has been deleted' });
    } else {
      // 2. Check Staff Model
      const staff = await Staff.findOne({ phone });
      if (!staff) return res.status(401).json({ message: 'Invalid credentials' });

      const isMatch = await staff.comparePassword(password);
      if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });
      if (!staff.isActive) return res.status(403).json({ message: 'Staff account is inactive' });

      role = 'staff';
      finalUser = staff;
    }

    let status = undefined;
    if (role === 'vendor') {
      const Vendor = require('../models/Vendor');
      const vendor = await Vendor.findOne({ ownerId: finalUser._id });
      if (vendor) status = vendor.status;
    }

    res.status(200).json({
      _id: finalUser._id,
      name: finalUser.name,
      phone: finalUser.phone,
      image: finalUser.image,
      role: role,
      status: status,
      token: generateToken(finalUser._id),
      isFirstLogin: role === 'staff' ? finalUser.isFirstLogin : undefined
    });
  } catch (error) {
    console.error('[AUTH-OTP-ERROR]', error.message);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Dedicated Admin Login
// @route   POST /api/auth/admin-login
// @access  Public
const adminLogin = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ message: 'Phone number and password are required' });
    }

    const admin = await User.findOne({ phone, role: { $in: ['admin', 'super_admin'] } });
    if (!admin) return res.status(401).json({ message: 'Invalid admin credentials' });

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid admin credentials' });
    if (admin.isBlocked) return res.status(403).json({ message: 'Admin account is blocked' });
    if (admin.isDeleted) return res.status(403).json({ message: 'Admin account has been deleted' });

    res.status(200).json({
      _id: admin._id,
      name: admin.name,
      phone: admin.phone,
      image: admin.image,
      role: admin.role,
      token: generateToken(admin._id)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Register Customer
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { phone, name, password, role, email, gender, dob, referralCode, image } = req.body;

    if (name && /[^a-zA-Z\s]/.test(name)) {
      return res.status(400).json({ message: 'Name should only contain alphabets and spaces' });
    }

    const requestedRole = sanitizePublicRole(role);
    const effectivePassword = password || (requestedRole === 'vendor' ? generateTemporaryPassword() : undefined);

    let user = await User.findOne({ phone });

    if (user) {
      if (user.name && !req.body.forceUpdate && user.role !== 'vendor') return res.status(400).json({ message: 'User already exists' });

      // Update all provided fields
      if (name && !user.name) user.name = name;
      if (email) user.email = email;
      if (gender) user.gender = gender;
      if (dob) user.dob = dob;
      if (effectivePassword) user.password = effectivePassword;
      if (referralCode) user.referralCode = referralCode;
      if (image) user.image = image;
      user.role = requestedRole;
      
      // Normalize phone if updated
      let normPhone = phone.replace(/\D/g, '');
      if ((normPhone.startsWith('91') || normPhone.startsWith('0')) && normPhone.length > 10) {
        normPhone = normPhone.slice(-10);
      }
      user.phone = normPhone.slice(0, 10);
      
      await user.save();
    } else {
      user = await User.create({
        phone,
        name,
        password: effectivePassword,
        email,
        gender,
        dob,
        referralCode,
        image,
        role: requestedRole
      });
    }

    let status = undefined;
    let shops = [];
    let lastActiveVendorId = undefined;
    if (requestedRole === 'vendor') {
      const Vendor = require('../models/Vendor');
      shops = await Vendor.find({ ownerId: user._id, isDeleted: false });
      if (shops.length > 0) {
        if (user.lastActiveVendorId) {
          lastActiveVendorId = user.lastActiveVendorId;
        } else {
          lastActiveVendorId = shops[0]._id;
          user.lastActiveVendorId = lastActiveVendorId;
          await user.save();
        }
        const activeShop = shops.find(s => s._id.toString() === lastActiveVendorId.toString()) || shops[0];
        status = activeShop.status;
      } else {
        status = 'pending';
      }
    }

    res.status(201).json({
      _id: user._id,
      name: user.name,
      phone: user.phone,
      image: user.image,
      role: user.role,
      status,
      token: generateToken(user._id),
      shops,
      lastActiveVendorId
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Current User (Session Recovery)
// @route   GET /api/auth/me
// @access  Private
const me = async (req, res) => {
  try {
    // req.user or req.staff populated by auth middleware
    const user = req.user || req.staff;
    if (!user) return res.status(404).json({ message: 'Session expired' });

    let responseData = {
      _id: user._id,
      name: user.name,
      phone: user.phone,
      image: user.image,
      role: user.role || (req.staff ? 'staff' : (req.user ? req.user.role : 'customer')),
      email: user.email,
      dob: user.dob,
      gender: user.gender,
      address: user.address,
      location: user.location,
      favoriteVendors: user.favoriteVendors,
      is2FAEnabled: user.is2FAEnabled,
      isBiometricEnabled: user.isBiometricEnabled,
      notificationSettings: user.notificationSettings,
      preferences: user.preferences,
    };

    if (responseData.role === 'vendor') {
      const Vendor = require('../models/Vendor');
      const shops = await Vendor.find({ ownerId: user._id, isDeleted: false });
      responseData.shops = shops;
      responseData.lastActiveVendorId = user.lastActiveVendorId;
      if (shops.length > 0) {
        if (!user.lastActiveVendorId) {
          user.lastActiveVendorId = shops[0]._id;
          await user.save();
          responseData.lastActiveVendorId = shops[0]._id;
        }
        const activeShop = shops.find(s => s._id.toString() === responseData.lastActiveVendorId.toString()) || shops[0];
        responseData.status = activeShop.status;
      }
    }

    res.status(200).json(responseData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Send OTP to phone
// @route   POST /api/auth/send-otp
// @access  Public
const sendOTP = async (req, res) => {
  try {
    let { phone, portal } = req.body;
    if (!phone) return res.status(400).json({ message: 'Phone number is required' });

    // Normalize phone
    phone = phone.replace(/\D/g, '');
    if ((phone.startsWith('91') || phone.startsWith('0')) && phone.length > 10) {
      phone = phone.slice(-10);
    }
    phone = phone.slice(0, 10);

    // Check User or Staff
    let user = await User.findOne({ phone });
    let staff = await Staff.findOne({ phone });

    if (!user && staff?.isOwner) user = await restoreOwnerUser(staff) || user;

    if (user?.isDeleted) {
      return res.status(403).json({ message: 'This account has been deleted' });
    }

    // 🛡️ Pre-OTP Role Validation
    if (portal === 'vendor') {
      if (user && user.role === 'customer' && user.name && (!staff || staff.isOwner)) {
        return res.status(403).json({ message: 'You are already registered as a Customer. Please use another number for Partner account.' });
      }
    } else if (portal === 'customer') {
      if ((staff && !staff.isOwner) || (user && (user.role === 'vendor' || user.role === 'admin' || user.role === 'super_admin'))) {
        return res.status(403).json({ message: 'You are already registered as a Partner. Please use another number for Customer account.' });
      }
    }

    // 🛡️ TESTING BYPASS: Fix OTP to 123456 for test numbers
    const isTestNumber = TEST_OTP_NUMBERS.includes(phone);
    const otp = isTestNumber ? '123456' : Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins for test buffer

    if (isAdminRole(user?.role)) {
      return res.status(403).json({ message: 'Admins must use the secure admin login' });
    }

    // Throttle OTP sends per number (SMS spam / brute-force protection).
    // Test numbers use a fixed OTP and send no SMS, so they are exempt.
    if (!isTestNumber) {
      const throttle = checkAndRecordOtpSend(phone);
      if (!throttle.allowed) {
        res.set('Retry-After', String(throttle.retryAfterSec));
        return res.status(429).json({
          message: throttle.reason === 'cooldown'
            ? `Please wait ${throttle.retryAfterSec} seconds before requesting another OTP.`
            : 'Too many OTP requests. Please try again later.',
          retryAfterSec: throttle.retryAfterSec
        });
      }
    }

    const isRegularStaff = staff && !staff.isOwner;

    // A fresh OTP always starts with a fresh attempt counter.
    if (isRegularStaff) {
      staff.otp = otp;
      staff.otpExpires = otpExpires;
      staff.otpAttempts = 0;
      await staff.save();
    } else if (user) {
      user.otp = otp;
      user.otpExpires = otpExpires;
      user.otpAttempts = 0;
      await user.save();
    } else if (staff) {
      staff.otp = otp;
      staff.otpExpires = otpExpires;
      staff.otpAttempts = 0;
      await staff.save();
    } else {
      await User.create({ phone, otp, otpExpires, otpAttempts: 0, role: 'customer' });
    }

    // Skip real SMS for test number
    if (!isTestNumber) {
      try {
        await sendOtpSms(phone, otp);
      } catch (smsError) {
        console.warn(`[SMS-OTP-WARNING] Real SMS failed:`, smsError.message);
        if (!shouldExposeOtpInResponse) throw smsError;
      }
    } else {
      console.log(`[AUTH] 🚀 BYPASS: Test OTP for ${phone} set to ${otp}`);
    }

    if (shouldLogOtpToConsole) {
      console.log(`\n-----------------------------------`);
      console.log(`[AUTH] OTP for ${phone}: ${otp}`);
      console.log(`-----------------------------------\n`);
    }

    const responsePayload = { message: 'OTP sent successfully' };
    if (shouldExposeOtpInResponse) {
      responsePayload.otp = otp;
    }

    res.status(200).json(responsePayload);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Verify OTP and Login/Register
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOTP = async (req, res) => {
  try {
    let { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).json({ message: 'Phone and OTP are required' });

    // Normalize phone
    phone = phone.replace(/\D/g, '');
    if ((phone.startsWith('91') || phone.startsWith('0')) && phone.length > 10) {
      phone = phone.slice(-10);
    }
    phone = phone.slice(0, 10);

    // Find User or Staff
    let user = await User.findOne({ phone });
    let staff = await Staff.findOne({ phone });

    if (!user && staff?.isOwner) user = await restoreOwnerUser(staff) || user;

    // If they exist in Staff and are not the owner, treat them as Staff
    const isRegularStaff = staff && !staff.isOwner;
    let finalAccount = isRegularStaff ? staff : (user || staff);

    if (!finalAccount) return res.status(404).json({ message: 'Account not found' });
    if (finalAccount.isDeleted) return res.status(403).json({ message: 'This account has been deleted' });
    if (user && isAdminRole(user.role)) {
      return res.status(403).json({ message: 'Admins must use the secure admin login' });
    }

    // Check OTP
    const isDefaultAuth = TEST_OTP_NUMBERS.includes(phone) && otp === '123456';
    if (!isDefaultAuth) {
      // Too many wrong guesses: the OTP is burned, a new one must be requested.
      if ((finalAccount.otpAttempts || 0) >= MAX_VERIFY_ATTEMPTS) {
        finalAccount.otp = undefined;
        finalAccount.otpExpires = undefined;
        await finalAccount.save();
        return res.status(429).json({ message: 'Too many incorrect attempts. Please request a new OTP.' });
      }

      if (!finalAccount.otp || String(finalAccount.otp) !== String(otp) || new Date() > finalAccount.otpExpires) {
        // Atomic increment so parallel guesses cannot dodge the counter.
        const updated = await finalAccount.constructor.findByIdAndUpdate(
          finalAccount._id,
          { $inc: { otpAttempts: 1 } },
          { new: true }
        ).select('otpAttempts');
        if ((updated?.otpAttempts || 0) >= MAX_VERIFY_ATTEMPTS) {
          await finalAccount.constructor.updateOne(
            { _id: finalAccount._id },
            { $unset: { otp: '', otpExpires: '' } }
          );
          return res.status(429).json({ message: 'Too many incorrect attempts. Please request a new OTP.' });
        }
        return res.status(400).json({ message: 'Invalid or expired OTP' });
      }
    }

    // Clear OTP
    finalAccount.otp = undefined;
    finalAccount.otpExpires = undefined;
    finalAccount.otpAttempts = 0;
    await finalAccount.save();

    // Determine if registration is complete (User should have a name)
    const needsRegistration = isRegularStaff ? false : (!finalAccount.name && (!staff || staff.isOwner));

    let status = undefined;
    let shops = [];
    let lastActiveVendorId = undefined;
    const resolvedRole = isRegularStaff ? 'staff' : (user ? user.role : (staff ? 'staff' : 'customer'));
    if (resolvedRole === 'vendor') {
      const Vendor = require('../models/Vendor');
      shops = await Vendor.find({ ownerId: finalAccount._id, isDeleted: false });
      if (shops.length > 0) {
        if (finalAccount.lastActiveVendorId) {
          lastActiveVendorId = finalAccount.lastActiveVendorId;
        } else {
          lastActiveVendorId = shops[0]._id;
          finalAccount.lastActiveVendorId = lastActiveVendorId;
          await finalAccount.save();
        }
        const activeShop = shops.find(s => s._id.toString() === lastActiveVendorId.toString()) || shops[0];
        status = activeShop.status;
      }
    }

    res.status(200).json({
      _id: finalAccount._id,
      name: finalAccount.name,
      phone: finalAccount.phone,
      image: finalAccount.image,
      role: resolvedRole,
      status,
      token: generateToken(finalAccount._id),
      needsRegistration,
      isFirstLogin: isRegularStaff ? finalAccount.isFirstLogin : (staff ? finalAccount.isFirstLogin : undefined),
      shops,
      lastActiveVendorId
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const switchShop = async (req, res) => {
  try {
    const { vendorId } = req.body;
    if (!vendorId) return res.status(400).json({ message: 'vendorId is required' });

    const Vendor = require('../models/Vendor');
    const shop = await Vendor.findOne({ _id: vendorId, ownerId: req.user._id, isDeleted: false });
    if (!shop) {
      return res.status(404).json({ message: 'Shop not found or not owned by you' });
    }

    req.user.lastActiveVendorId = vendorId;
    await req.user.save();

    res.status(200).json({
      message: 'Shop context switched successfully',
      lastActiveVendorId: vendorId
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  adminLogin,
  login,
  register,
  me,
  sendOTP,
  verifyOTP,
  switchShop
};
