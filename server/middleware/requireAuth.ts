/**
 * server/middleware/requireAuth.ts
 * Validates the JWT from the httpOnly cookie on every protected route.
 * Attaches req.userId if valid, returns 401 otherwise.
 */

import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';

const COOKIE_NAME = 'bt_token';
const JWT_SECRET  = process.env.JWT_SECRET || 'change_this_secret_in_production';

interface AuthTokenPayload extends JwtPayload {
  id: string;
}

export default function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.[COOKIE_NAME];

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Not authenticated — please log in',
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
    req.userId = decoded.id; // available to all downstream handlers
    next();
  } catch (err) {
    // Token expired or tampered with
    res.clearCookie(COOKIE_NAME);
    res.status(401).json({
      success: false,
      message: 'Session expired — please log in again',
    });
  }
}
