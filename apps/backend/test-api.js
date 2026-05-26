const jwt = require('jsonwebtoken');
require('dotenv').config();

const token = jwt.sign({
  userId: "fake_id",
  role: "OWNER",
  restaurantId: "fake_rest_id",
  branchId: undefined
}, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1h' });

console.log("Token:", token);
