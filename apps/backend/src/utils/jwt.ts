import jwt from 'jsonwebtoken';
import { UserRole } from '@restaurant/types';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is not set. Server cannot start without it.');
}
// Use a separate secret for refresh tokens — derive from JWT_SECRET if REFRESH_SECRET not set
const REFRESH_SECRET = process.env.REFRESH_SECRET || `${JWT_SECRET}:refresh`;

const JWT_EXPIRES_IN = '1h';
const REFRESH_EXPIRES_IN = '7d';
const TOKEN_ISSUER = 'bhojantech-api';
const TOKEN_AUDIENCE = 'bhojantech-web';

export interface JwtPayload {
  userId: string;
  name?: string;
  role: UserRole;
  restaurantId?: string;
  branchId?: string; // Set for staff/waiters
  accessibleBranches?: string[]; // Set for branch managers
  permissions?: string[];
}

export const generateTokens = (payload: JwtPayload) => {
  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: TOKEN_ISSUER,
    audience: TOKEN_AUDIENCE,
  });
  const refreshToken = jwt.sign({ userId: payload.userId, type: 'refresh' }, REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRES_IN,
    issuer: TOKEN_ISSUER,
    audience: TOKEN_AUDIENCE,
  });

  return { accessToken, refreshToken };
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, JWT_SECRET, {
    issuer: TOKEN_ISSUER,
    audience: TOKEN_AUDIENCE,
  }) as JwtPayload;
};

export const verifyRefreshToken = (token: string): { userId: string; type: string } => {
  return jwt.verify(token, REFRESH_SECRET, {
    issuer: TOKEN_ISSUER,
    audience: TOKEN_AUDIENCE,
  }) as { userId: string; type: string };
};
