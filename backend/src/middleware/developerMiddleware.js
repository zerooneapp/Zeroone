const jwt = require('jsonwebtoken');

// Any failure here looks exactly like a route that does not exist, so the panel's
// presence is never revealed. We never send 401/403 from developer endpoints.
const send404 = (req, res) => {
  res.status(404).json({ message: `Not Found - ${req.originalUrl}`, stack: null });
};

const DEV_SECRET = () => process.env.DEVELOPER_JWT_SECRET;

const signDeveloperToken = (phone) =>
  jwt.sign({ dev: true, phone }, DEV_SECRET(), { expiresIn: '12h' });

const developerProtect = (req, res, next) => {
  try {
    if (!DEV_SECRET() || !process.env.DEVELOPER_PHONE) return send404(req, res);

    const header = req.headers['x-dev-token'] ||
      (req.headers.authorization?.startsWith('Bearer') ? req.headers.authorization.split(' ')[1] : null);
    if (!header) return send404(req, res);

    const decoded = jwt.verify(header, DEV_SECRET());
    if (!decoded?.dev || decoded.phone !== process.env.DEVELOPER_PHONE) return send404(req, res);

    req.developer = { phone: decoded.phone };
    next();
  } catch (err) {
    return send404(req, res);
  }
};

module.exports = { developerProtect, signDeveloperToken, send404 };
