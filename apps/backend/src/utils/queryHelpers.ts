import { AuthRequest } from '../middleware/auth.middleware';

export const getBaseQuery = (req: AuthRequest) => {
  const query: any = { restaurantId: req.user!.restaurantId };
  if (req.user!.branchId) {
    query.branchId = req.user!.branchId;
  } else if (req.user!.role === 'BRANCH_MANAGER' && req.user!.accessibleBranches?.length) {
    // If no specific branch is selected, restrict to accessible branches
    query.branchId = { $in: req.user!.accessibleBranches };
  } else if (req.user!.role !== 'SUPER_OWNER' && req.user!.role !== 'OWNER' && req.user!.branchId) {
     // Safety catch for other staff (though req.user.branchId should already catch this)
     query.branchId = req.user!.branchId;
  }
  return query;
};

export const getCreateBranchId = (req: AuthRequest) => {
  return req.user!.branchId || req.body.branchId || req.query.branchId;
};
