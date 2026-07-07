/**
 * server/middleware/errorHandler.js
 * Centralised error handling middleware for Express.
 * Place this in a separate file: server/middleware/errorHandler.js
 */

const notFound = (req, res, _next) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
};

const errorHandler = (err, _req, res, _next) => {
  console.error('🔴 Error:', err);

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(422).json({ success: false, message: 'Validation error', errors: messages });
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    return res.status(400).json({ success: false, message: 'Invalid ID format' });
  }

  // Multer errors (file upload)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'File size must not exceed 4 MB' });
  }

  // Generic multer or known error with message
  if (err.message) {
    return res.status(400).json({ success: false, message: err.message });
  }

  // Fallback 500
  res.status(500).json({ success: false, message: 'Internal server error' });
};

module.exports = { notFound, errorHandler };