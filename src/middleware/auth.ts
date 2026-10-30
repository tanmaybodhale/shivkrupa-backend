import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthPayload {
  uid: string;
  role: 'customer' | 'shopkeeper';
}

export interface AuthedRequest extends Request {
  auth?: AuthPayload;
}

const secret = (): string => {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET is not set');
  return s;
};

// Customers stay logged in for 30 days, the shopkeeper for 1 day
export const signSession = (u: AuthPayload): string =>
  jwt.sign({ uid: u.uid, role: u.role }, secret(), {
    expiresIn: u.role === 'shopkeeper' ? 60 * 60 * 24 : 60 * 60 * 24 * 30,
  });

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  try {
    (req as AuthedRequest).auth = jwt.verify(token, secret()) as unknown as AuthPayload;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Please login again' });
  }
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  requireAuth(req, res, () => {
    if ((req as AuthedRequest).auth?.role !== 'shopkeeper') {
      res.status(403).json({ success: false, message: 'Admin only' });
      return;
    }
    next();
  });
};
