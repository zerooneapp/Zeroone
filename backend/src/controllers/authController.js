const User = require('../models/User');
const Staff = require('../models/Staff');
const generateToken = require('../utils/generateToken');
const bcrypt = require('bcryptjs');

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

    res.status(200).json({
      _id: finalUser._id,
      name: finalUser.name,
      phone: finalUser.phone,
      image: finalUser.image, // 📸 Return image
      role: role,
      token: generateToken(finalUser._id),
      isFirstLogin: role === 'staff' ? finalUser.isFirstLogin : undefined
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
    
    let user = await User.findOne({ phone });
    
    if (user) {
      if (user.name && !req.body.forceUpdate) return res.status(400).json({ message: 'User already exists' });
      
      user.name = name;
      if (password) user.password = password;
      if (email) user.email = email;
      if (gender) user.gender = gender;
      if (dob) user.dob = dob;
      if (referralCode) user.referralCode = referralCode;
      if (image) user.image = image;
      user.role = role || 'customer';
      await user.save();
    } else {
      user = await User.create({
        phone,
        name,
        password,
        email,
        gender,
        dob,
        referralCode,
        image,
        role: role || 'customer'
      });
    }

    res.status(201).json({
      _id: user._id,
      name: user.name,
      phone: user.phone,
      image: user.image, // 📸 Return image
      role: user.role,
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

    res.status(200).json({
      _id: user._id,
      name: user.name,
      phone: user.phone,
      image: user.image, // 📸 Return image
      role: user.role || (req.staff ? 'staff' : (req.user ? req.user.role : 'customer')),
      user
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Send OTP to phone
// @route   POST /api/auth/send-otp
// @access  Public
const sendOTP = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ message: 'Phone number is required' });

    // Generate 5-digit OTP
    const otp = Math.floor(10000 + Math.random() * 90000).toString();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Check User or Staff
    let user = await User.findOne({ phone });
    let staff = !user ? await Staff.findOne({ phone }) : null;

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

    // MOCK SMS LOGGING
    console.log(`\n-----------------------------------`);
    console.log(`[AUTH] OTP for ${phone}: ${otp}`);
    console.log(`-----------------------------------\n`);

    res.status(200).json({ message: 'OTP sent successfully', otp });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Verify OTP and Login/Register
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).json({ message: 'Phone and OTP are required' });

    // Find User or Staff
    let user = await User.findOne({ phone });
    let staff = !user ? await Staff.findOne({ phone }) : null;
    let finalAccount = user || staff;

    if (!finalAccount) return res.status(404).json({ message: 'Account not found' });

    // Check OTP
    if (finalAccount.otp !== otp || new Date() > finalAccount.otpExpires) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Clear OTP
    finalAccount.otp = undefined;
    finalAccount.otpExpires = undefined;
    await finalAccount.save();

    // Determine if registration is complete (User should have a name)
    const needsRegistration = !finalAccount.name && !staff;

    res.status(200).json({
      _id: finalAccount._id,
      name: finalAccount.name,
      phone: finalAccount.phone,
      image: finalAccount.image, // 📸 Return image
      role: staff ? 'staff' : finalAccount.role,
      token: generateToken(finalAccount._id),
      needsRegistration,
      isFirstLogin: staff ? finalAccount.isFirstLogin : undefined
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  login,
  register,
  me,
  sendOTP,
  verifyOTP
};
