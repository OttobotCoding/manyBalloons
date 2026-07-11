/**
 * server/middleware/requireApproved.ts
 * Must be used AFTER requireAuth — blocks users whose account status is not
 * 'approved' (i.e. self-registered accounts still 'pending' review, or
 * accounts an admin has 'rejected') from reaching protected resources.
 */

import { Request, Response, NextFunction } from 'express';
import User from '../models/User';

export default async function requireApproved(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Reuse req.user if an earlier middleware in the chain already loaded it
    // (none currently do before this point, but this keeps the same
    // "attach it once, reuse downstream" convention requireAdmin uses).
    const user = req.user ?? await User.findById(req.userId);

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated — please log in',
      });
      return;
    }

    if (user.status === 'pending') {
      res.status(403).json({
        success: false,
        message: 'Your account is awaiting admin approval',
      });
      return;
    }

    if (user.status === 'rejected') {
      res.status(403).json({
        success: false,
        message: 'Your account request was rejected. Contact an administrator for details.',
      });
      return;
    }

    req.user = user; // attach for downstream use, consistent with requireAdmin
    next();
  } catch (err) {
    next(err);
  }
}
