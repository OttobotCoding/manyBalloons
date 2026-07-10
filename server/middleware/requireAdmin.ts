/**
 * server/middleware/requireAdmin.ts
 * Must be used AFTER requireAuth — checks that the authenticated user
 * has the 'admin' role before allowing access to admin routes.
 */

import { Request, Response, NextFunction } from 'express';
import User from '../models/User';

export default async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Access denied — admin privileges required',
      });
      return;
    }
    req.user = user; // attach full user object for downstream use
    next();
  } catch (err) {
    next(err);
  }
}
