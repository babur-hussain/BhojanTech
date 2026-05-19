import express, { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import { createStaffSchema } from '../validations/schemas';
import { UserRole } from '@restaurant/types';
import * as staff from '../controllers/staff.controller';

const router: Router = express.Router();
router.use(requireAuth);

// Directory
router.get('/', staff.getStaff);
router.post('/', requireRole([UserRole.OWNER, UserRole.BRANCH_MANAGER]), validate(createStaffSchema), staff.createStaff);
router.put('/:id', requireRole([UserRole.OWNER, UserRole.BRANCH_MANAGER]), staff.updateStaff);
router.delete('/:id', requireRole([UserRole.OWNER]), staff.removeStaff);

// Attendance
router.post('/attendance/clock-in', staff.clockIn);
router.post('/attendance/clock-out', staff.clockOut);
router.post('/attendance/manual', requireRole([UserRole.OWNER, UserRole.BRANCH_MANAGER]), staff.manualMarkAttendance);
router.get('/attendance/:staffId/:month', staff.getMonthlyAttendance);
router.get('/duty/today', staff.getTodayDuty);

// Scheduling
router.get('/schedule/:weekStart', staff.getWeekSchedule);
router.put('/schedule/:weekStart', requireRole([UserRole.OWNER, UserRole.BRANCH_MANAGER]), staff.saveWeekSchedule);
router.post('/schedule/:weekStart/publish', requireRole([UserRole.OWNER, UserRole.BRANCH_MANAGER]), staff.publishSchedule);

// Payroll
router.get('/payroll/:month', requireRole([UserRole.OWNER, UserRole.BRANCH_MANAGER]), staff.getPayroll);
router.post('/payroll/:month/calculate', requireRole([UserRole.OWNER, UserRole.BRANCH_MANAGER]), staff.calculatePayroll);
router.patch('/payroll/:id/paid', requireRole([UserRole.OWNER, UserRole.BRANCH_MANAGER]), staff.markSalaryPaid);

// Performance
router.get('/performance/:month', requireRole([UserRole.OWNER, UserRole.BRANCH_MANAGER]), staff.getStaffPerformance);

export default router;
