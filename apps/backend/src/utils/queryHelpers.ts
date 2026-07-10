import { AuthRequest } from '../middleware/auth.middleware';

export const getBaseQuery = (req: AuthRequest) => {
  const query: any = { restaurantId: req.user!.restaurantId };
  
  const requestedBranchId = req.query.branchId as string;
  const isSpecificBranchRequested = requestedBranchId && requestedBranchId !== 'all' && requestedBranchId !== 'null';

  if (req.user!.role === 'SUPER_OWNER' || req.user!.role === 'OWNER') {
    if (isSpecificBranchRequested) {
      query.branchId = requestedBranchId;
    }
  } else if (req.user!.role === 'BRANCH_MANAGER') {
    if (isSpecificBranchRequested && req.user!.accessibleBranches?.map(b => b.toString()).includes(requestedBranchId)) {
      query.branchId = requestedBranchId;
    } else if (req.user!.accessibleBranches?.length) {
      query.branchId = { $in: req.user!.accessibleBranches };
    } else if (req.user!.branchId) {
      query.branchId = req.user!.branchId;
    }
  } else {
    // For normal staff, strictly use their assigned branch
    if (req.user!.branchId) {
      query.branchId = req.user!.branchId;
    }
  }

  return query;
};

export const getCreateBranchId = (req: AuthRequest) => {
  return req.user!.branchId || req.body.branchId || req.query.branchId;
};
