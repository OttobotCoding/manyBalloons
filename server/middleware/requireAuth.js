/**
 * server/middleware/requireAuth.js
 * Validates the JWT from the httpOnly cookie on every protected route.
 * Attaches req.userId if valid, returns 401 otherwise.
 */

const jwt = require('jsonwebtoken');

const COOKIE_NAME = 'bt_token';
const JWT_SECRET  = process.env.JWT_SECRET || 'change_this_secret_in_production';

module.exports = function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated — please log in',
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id; // available to all downstream handlers
    next();
  } catch (err) {
    // Token expired or tampered with
    res.clearCookie(COOKIE_NAME);
    return res.status(401).json({
      success: false,
      message: 'Session expired — please log in again',
    });
  }
};