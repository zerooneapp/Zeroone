// Middleware to ensure only authenticated staff can access these routes
const isStaff = (req, res, next) => {
  if (!req.staff) {
    return res.status(403).json({ message: 'Access denied. Staff only route.' });
  }
  next();
};

module.exports = { isStaff };
