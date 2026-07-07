/**
 * server/middleware/validation.js
 * Express middleware that validates incoming friend payloads before hitting the DB.
 */

const validateFriend = (req, res, next) => {
  const errors = [];
  const { name, birthday, email, phone } = req.body;

  // Name — required
  if (!name || !name.trim()) {
    errors.push('Name is required');
  } else if (name.trim().length > 100) {
    errors.push('Name cannot exceed 100 characters');
  }

  // Birthday — required and not in the future
  if (!birthday) {
    errors.push('Birthday is required');
  } else {
    const dob = new Date(birthday);
    if (isNaN(dob.getTime())) {
      errors.push('Birthday is not a valid date');
    } else if (dob > new Date()) {
      errors.push('Birthday cannot be in the future');
    }
  }

  // Email — optional but must be valid when provided
  if (email && email.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      errors.push('Please enter a valid email address');
    }
  }

  // Phone — optional, max length
  if (phone && phone.trim().length > 20) {
    errors.push('Phone number cannot exceed 20 characters');
  }

  if (errors.length > 0) {
    return res.status(422).json({ success: false, message: 'Validation failed', errors });
  }

  next();
};

module.exports = { validateFriend };