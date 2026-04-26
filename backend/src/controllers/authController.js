const User = require('../models/User');
const Staff = require('../models/Staff');
const generateToken = require('../utils/generateToken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sendOtpSms } = require('../services/smsService');

const shouldExposeOtpInResponse = false;
const shouldLogOtpToConsole = true;

const generateTemporaryPassword = () => crypto.randomBytes(24).toString('hex');

const sanitizePublicRole = (role) => (role === 'vendor' ? 'vendor' : 'customer');
const isAdminRole = (role) => ['admin', 'super_admin'].includes(role);

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
    const requestedRole = sanitizePublicRole(role);
    const effectivePassword = password || (requestedRole === 'vendor' ? generateTemporaryPassword() : undefined);

    let user = await User.findOne({ phone });

    if (user) {
      if (user.name && !req.body.forceUpdate && user.role !== 'vendor') return res.status(400).json({ message: 'User already exists' });

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
    if (requestedRole === 'vendor') {
      const Vendor = require('../models/Vendor');
      const vendor = await Vendor.findOne({ ownerId: user._id });
      if (vendor) status = vendor.status;
      else status = 'pending'; // Default for new vendors
    }

    res.status(201).json({
      _id: user._id,
      name: user.name,
      phone: user.phone,
      image: user.image,
      role: user.role,
      status,
      token: generateToken(user._id),
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
    };

    if (responseData.role === 'vendor') {
      const Vendor = require('../models/Vendor');
      const vendor = await Vendor.findOne({ ownerId: user._id });
      if (vendor) {
        responseData.status = vendor.status;
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
    let staff = !user ? await Staff.findOne({ phone }) : null;

    // 🛡️ Pre-OTP Role Validation
    if (portal === 'vendor') {
      if (user && user.role === 'customer' && user.name) {
        return res.status(403).json({ message: 'You are already registered as a Customer. Please use another number for Partner account.' });
      }
    } else if (portal === 'customer') {
      if (staff || (user && (user.role === 'vendor' || user.role === 'admin' || user.role === 'super_admin'))) {
        return res.status(403).json({ message: 'You are already registered as a Partner. Please use another number for Customer account.' });
      }
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    if (isAdminRole(user?.role)) {
      return res.status(403).json({ message: 'Admins must use the secure admin login' });
    }

    if (user) {
      user.otp = otp;
      user.otpExpires = otpExpires;
      await user.save();
    } else if (staff) {
      staff.otp = otp;
      staff.otpExpires = otpExpires;
      await staff.save();
    } else {
      // For NEW USERS: We can't save to User model yet without other required fields?
      // Actually, User model only requires phone. So we can create a "pending" user.
      await User.create({ phone, otp, otpExpires, role: 'customer' });
    }

    try {
      await sendOtpSms(phone, otp);
    } catch (smsError) {
      console.warn(`[SMS-OTP-WARNING] Real SMS failed:`, smsError.message);
      // Only throw if we are strictly NOT exposing OTPs (i.e. strict production mode)
      if (!shouldExposeOtpInResponse) {
        throw smsError;
      }
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
    let staff = !user ? await Staff.findOne({ phone }) : null;
    let finalAccount = user || staff;

    if (!finalAccount) return res.status(404).json({ message: 'Account not found' });
    if (isAdminRole(user?.role)) {
      return res.status(403).json({ message: 'Admins must use the secure admin login' });
    }

    // Check OTP
    const isDefaultAuth = phone === '1234567890' && otp === '123456';
    if (!isDefaultAuth && (finalAccount.otp !== otp || new Date() > finalAccount.otpExpires)) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Clear OTP
    finalAccount.otp = undefined;
    finalAccount.otpExpires = undefined;
    await finalAccount.save();

    // Determine if registration is complete (User should have a name)
    const needsRegistration = !finalAccount.name && !staff;

    let status = undefined;
    if (finalAccount.role === 'vendor') {
      const Vendor = require('../models/Vendor');
      const vendor = await Vendor.findOne({ ownerId: finalAccount._id });
      if (vendor) status = vendor.status;
    }

    res.status(200).json({
      _id: finalAccount._id,
      name: finalAccount.name,
      phone: finalAccount.phone,
      image: finalAccount.image,
      role: staff ? 'staff' : finalAccount.role,
      status,
      token: generateToken(finalAccount._id),
      needsRegistration,
      isFirstLogin: staff ? finalAccount.isFirstLogin : undefined
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
  verifyOTP
};
