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
    const isBlacklisted = await redis.get(`bl_${token}`);
    if (isBlacklisted) {
      return res.status(401).json({ error: 'Unauthorized: Token is invalidated' });
    }

    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

export const requireBranchAccess = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  // Super owners have global access
  if (req.user.role === 'SUPER_OWNER') return next();

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
