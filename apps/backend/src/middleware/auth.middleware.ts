import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt';
import { redis } from '../config/redis';

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];

    // Check if token is blacklisted in Redis
    // FAIL-OPEN: if Redis is unreachable, proceed with JWT verification.
    // The JWT is still cryptographically valid — better to allow a recently-revoked
    // token for a few minutes than to lock out ALL users when Redis hiccups.
    try {
      const isBlacklisted = await redis.get(`bl_${token}`);
      if (isBlacklisted) {
        return res.status(401).json({ error: 'Unauthorized: Token is invalidated' });
      }
    } catch (redisErr) {
      console.warn('[requireAuth] Redis blacklist check failed (proceeding with JWT verification):', (redisErr as Error)?.message);
    }

    const decoded = verifyToken(token);
    req.user = decoded;

    // Allow frontend branch selector to override branchId via header
    const headerBranchId = req.headers['x-branch-id'] as string | undefined;
    if (headerBranchId && headerBranchId !== 'all') {
      const role = decoded.role;
      // OWNER / SUPER_OWNER can access any branch; BRANCH_MANAGER only their accessible ones
      if (role === 'OWNER' || role === 'SUPER_OWNER') {
        req.user.branchId = headerBranchId;
      } else if (role === 'BRANCH_MANAGER' && decoded.accessibleBranches?.includes(headerBranchId)) {
        req.user.branchId = headerBranchId;
      }
      // Staff/waiters stay scoped to their JWT branchId — header is ignored
    } else if (headerBranchId === 'all') {
      const role = decoded.role;
      if (role === 'OWNER' || role === 'SUPER_OWNER') {
        // Create a new object instead of mutating the decoded JWT payload
        req.user = { ...req.user!, branchId: undefined };
      }
    }

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

export const requireBranchAccess = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  // Super owners and owners have global access
  if (req.user.role === 'SUPER_OWNER' || req.user.role === 'OWNER') return next();

  // Route might specify branchId in params or body or query
  const targetBranchId = req.params.branchId || req.body.branchId || req.query.branchId;

  if (targetBranchId) {
    if (req.user.role === 'BRANCH_MANAGER' && req.user.accessibleBranches?.includes(targetBranchId)) {
      return next();
    }
    if (req.user.branchId === targetBranchId) {
      return next();
    }
    return res.status(403).json({ error: 'Forbidden: Access to branch denied' });
  }

  // If no branchId is specified in the request but user is scoped, we might inject it
  next();
};
