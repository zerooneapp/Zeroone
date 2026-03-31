const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // 1. Check User
      const user = await User.findById(decoded.id).select('-password');
      if (user) {
        if (user.isBlocked) return res.status(403).json({ message: 'User account is blocked' });
        req.user = user;
        return next();
      }

      // 2. Check Staff
      const Staff = require('../models/Staff');
      const staff = await Staff.findById(decoded.id).select('-password');
      if (staff) {
        if (!staff.isActive) return res.status(403).json({ message: 'Staff account is inactive' });
        req.staff = staff;
        return next();
      }

      return res.status(401).json({ message: 'Not authorized, entity not found' });
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    const userRole = req.user ? req.user.role : (req.staff ? 'staff' : null);
    
    if (!userRole || !roles.includes(userRole)) {
      return res.status(403).json({ message: `Role ${userRole || 'unknown'} is not authorized to access this route` });
    }
    next();
  };
};

module.exports = { protect, authorize };
