// One-time developer-panel credential generator.
//
// Usage:  node src/scripts/setupDeveloper.js <phone> <password>
//
// Prints the lines to paste into backend/.env plus the otpauth:// URI to add to
// Google Authenticator / Authy. Nothing is written automatically.
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { generateSecret, otpauthURL } = require('../utils/totp');

const [, , phone, password] = process.argv;

if (!phone || !password) {
  console.error('\nUsage: node src/scripts/setupDeveloper.js <phone> <password>\n');
  process.exit(1);
}

(async () => {
  const passwordHash = await bcrypt.hash(String(password), 12);
  const totpSecret = generateSecret();
  const jwtSecret = crypto.randomBytes(48).toString('hex');
  const routeKey = 'sys-' + crypto.randomBytes(5).toString('hex');

  console.log('\n===== Add these lines to backend/.env =====\n');
  console.log(`DEVELOPER_PHONE=${phone}`);
  console.log(`DEVELOPER_PASSWORD_HASH=${passwordHash}`);
  console.log(`DEVELOPER_TOTP_SECRET=${totpSecret}`);
  console.log(`DEVELOPER_JWT_SECRET=${jwtSecret}`);
  console.log(`DEVELOPER_ROUTE_KEY=${routeKey}`);
  console.log('\n===== Scan this in Google Authenticator / Authy =====\n');
  console.log(otpauthURL(totpSecret, phone));
  console.log('\n(Or add the account manually with this secret:)');
  console.log(totpSecret);
  console.log('\nFrontend route to open the hidden panel:  /' + routeKey);
  console.log('Keep the password safe — only its hash is stored.\n');
  process.exit(0);
})();
