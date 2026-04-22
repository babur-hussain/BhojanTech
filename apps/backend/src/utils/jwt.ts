import jwt from 'jsonwebtoken';
import { UserRole } from '@restaurant/types';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev';
const JWT_EXPIRES_IN = '1h';
const REFRESH_EXPIRES_IN = '7d';

export interface JwtPayload {
  userId: string;
  name?: string;
  role: UserRole;
  restaurantId?: string;
  branchId?: string; // Set for staff/waiters
  accessibleBranches?: string[]; // Set for branch managers
}

export const generateTokens = (payload: JwtPayload) => {
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const refreshToken = jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_EXPIRES_IN });

  return { accessToken, refreshToken };
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
};
