/**
 * server/middleware/requireAdmin.js
 * Must be used AFTER requireAuth — checks that the authenticated user
 * has the 'admin' role before allowing access to admin routes.
 */

const User = require('../models/User');

module.exports = async function requireAdmin(req, res, next) {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied — admin privileges required',
      });
    }
    req.user = user; // attach full user object for downstream use
    next();
  } catch (err) {
    next(err);
  }
};