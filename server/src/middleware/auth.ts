import { Request, Response, NextFunction } from 'express';
import 'express-session';

declare module 'express-session' {
  interface SessionData {
    user?: {
      id: string;
      email: string;
      name: string;
      google_id?: string;
      venmo_username?: string;
    };
    oauthState?: string;
    oauthStateCreated?: number;
  }
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name?: string;
    venmo_username?: string;
  };
}

export const requireAuth = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  // Check session for user
  if (req.session?.user) {
    req.user = req.session.user;
    return next();
  }

  return res.status(401).json({ error: 'Authentication required.' });
};