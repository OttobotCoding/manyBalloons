/**
 * server/types/express.d.ts
 * Augments Express's Request type with the custom properties attached by
 * requireAuth (userId) and requireAdmin (user).
 */

import { IUser } from '../models/User';

declare global {
  namespace Express {
    interface Request {
      /** Set by requireAuth after verifying the JWT cookie. */
      userId?: string;
      /** Set by requireAdmin after loading the full user document. */
      user?: IUser;
    }
  }
}

export {};
