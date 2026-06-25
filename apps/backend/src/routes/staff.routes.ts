import express, { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import { createStaffSchema, giveAdvanceSchema } from '../validations/schemas';
import { UserRole } from '@restaurant/types';
import * as staff from '../controllers/staff.controller';

const router: Router = express.Router();
router.use(requireAuth);

// Directory
router.get('/', staff.getStaff);
router.post('/', requireRole([UserRole.OWNER, UserRole.BRANCH_MANAGER]), validate(createStaffSchema), staff.createStaff);
router.put('/:id', requireRole([UserRole.OWNER, UserRole.BRANCH_MANAGER]), staff.updateStaff);
router.delete('/:id', requireRole([UserRole.OWNER]), staff.removeStaff);

// Staff Detail & Ledger & Transfer
router.get('/detail/:id', staff.getStaffDetail);
router.get('/ledger/:id', requireRole([UserRole.OWNER, UserRole.BRANCH_MANAGER]), staff.getStaffLedger);
router.post('/:id/transfer', requireRole([UserRole.OWNER, UserRole.BRANCH_MANAGER]), staff.transferStaff);

// Attendance
router.post('/attendance/clock-in', staff.clockIn);
router.post('/attendance/clock-out', staff.clockOut);
router.post('/attendance/manual', requireRole([UserRole.OWNER, UserRole.BRANCH_MANAGER]), staff.manualMarkAttendance);
router.post('/attendance/bulk', requireRole([UserRole.OWNER, UserRole.BRANCH_MANAGER]), staff.bulkMarkAttendance);
router.get('/attendance/today', staff.getTodayAttendanceSummary);
router.get('/attendance/:staffId/:month', staff.getMonthlyAttendance);
router.get('/duty/today', staff.getTodayDuty);

// Scheduling
router.get('/schedule/:weekStart', staff.getWeekSchedule);
router.put('/schedule/:weekStart', requireRole([UserRole.OWNER, UserRole.BRANCH_MANAGER]), staff.saveWeekSchedule);
router.post('/schedule/:weekStart/publish', requireRole([UserRole.OWNER, UserRole.BRANCH_MANAGER]), staff.publishSchedule);

// Advance Payments
router.post('/advance', requireRole([UserRole.OWNER, UserRole.BRANCH_MANAGER]), validate(giveAdvanceSchema), staff.giveAdvance);
router.get('/advances/all', requireRole([UserRole.OWNER, UserRole.BRANCH_MANAGER]), staff.getAllAdvances);
router.get('/advance/:staffId', requireRole([UserRole.OWNER, UserRole.BRANCH_MANAGER]), staff.getStaffAdvances);
router.patch('/advance/:id/cancel', requireRole([UserRole.OWNER, UserRole.BRANCH_MANAGER]), staff.cancelAdvance);

// Payroll
router.get('/payroll/:month', requireRole([UserRole.OWNER, UserRole.BRANCH_MANAGER]), staff.getPayroll);
router.post('/payroll/:month/calculate', requireRole([UserRole.OWNER, UserRole.BRANCH_MANAGER]), staff.calculatePayroll);
router.patch('/payroll/:id/paid', requireRole([UserRole.OWNER, UserRole.BRANCH_MANAGER]), staff.markSalaryPaid);
router.post('/payroll/:month/bulk-pay', requireRole([UserRole.OWNER, UserRole.BRANCH_MANAGER]), staff.bulkMarkSalaryPaid);
router.get('/payroll/:month/:staffId/slip', requireRole([UserRole.OWNER, UserRole.BRANCH_MANAGER]), staff.getSalarySlip);

// Performance
router.get('/performance/:month', requireRole([UserRole.OWNER, UserRole.BRANCH_MANAGER]), staff.getStaffPerformance);

export default router;
