import { AuthRequest } from '../middleware/auth.middleware';

export const getBaseQuery = (req: AuthRequest) => {
  const query: any = { restaurantId: req.user!.restaurantId };
  if (req.user!.branchId) {
    query.branchId = req.user!.branchId;
  }
  return query;
};

export const getCreateBranchId = (req: AuthRequest) => {
  return req.user!.branchId || req.body.branchId || req.query.branchId;
};
