/**
 * server/middleware/errorHandler.ts
 * Centralised error handling middleware for Express.
 * Place this in a separate file: server/middleware/errorHandler.ts
 */

import { Request, Response, NextFunction } from 'express';

// Covers the shapes of error thrown by Mongoose (ValidationError, CastError)
// and Multer (LIMIT_FILE_SIZE etc.) as well as plain Error instances.
interface AppError extends Error {
  code?: string;
  kind?: string;
  errors?: Record<string, { message: string }>;
}

export const notFound = (req: Request, res: Response, _next: NextFunction): void => {
  res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
};

export const errorHandler = (err: AppError, _req: Request, res: Response, _next: NextFunction): void => {
  console.error('🔴 Error:', err);

  // Mongoose validation errors
  if (err.name === 'ValidationError' && err.errors) {
    const messages = Object.values(err.errors).map((e) => e.message);
    res.status(422).json({ success: false, message: 'Validation error', errors: messages });
    return;
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    res.status(400).json({ success: false, message: 'Invalid ID format' });
    return;
  }

  // Multer errors (file upload)
  if (err.code === 'LIMIT_FILE_SIZE') {
    res.status(400).json({ success: false, message: 'File size must not exceed 4 MB' });
    return;
  }

  // Generic multer or known error with message
  if (err.message) {
    res.status(400).json({ success: false, message: err.message });
    return;
  }

  // Fallback 500
  res.status(500).json({ success: false, message: 'Internal server error' });
};
