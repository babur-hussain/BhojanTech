import express, { Router } from 'express';
import { requireAuth, requirePermission } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createStaffSchema, giveAdvanceSchema } from '../validations/schemas';
import { Permission } from '@restaurant/types';
import * as staff from '../controllers/staff.controller';

const router: Router = express.Router();
router.use(requireAuth);

// Directory
router.get('/', requirePermission(Permission.STAFF_VIEW), staff.getStaff);
router.post('/', requirePermission(Permission.STAFF_MANAGE), validate(createStaffSchema), staff.createStaff);
router.put('/:id', requirePermission(Permission.STAFF_MANAGE), staff.updateStaff);
router.delete('/:id', requirePermission(Permission.STAFF_MANAGE), staff.removeStaff);

// Permissions
router.get('/:id/permissions', requirePermission(Permission.STAFF_MANAGE), staff.getStaffPermissions);
router.put('/:id/permissions', requirePermission(Permission.STAFF_MANAGE), staff.updateStaffPermissions);

// Staff Detail & Ledger & Transfer
router.get('/detail/:id', requirePermission(Permission.STAFF_VIEW), staff.getStaffDetail);
router.get('/ledger/:id', requirePermission(Permission.PAYROLL_MANAGE), staff.getStaffLedger);
router.post('/:id/transfer', requirePermission(Permission.STAFF_MANAGE), staff.transferStaff);

// Attendance
router.post('/attendance/clock-in', staff.clockIn);
router.post('/attendance/clock-out', staff.clockOut);
router.post('/attendance/manual', requirePermission(Permission.STAFF_MANAGE), staff.manualMarkAttendance);
router.post('/attendance/bulk', requirePermission(Permission.STAFF_MANAGE), staff.bulkMarkAttendance);
router.get('/attendance/today', requirePermission(Permission.STAFF_VIEW), staff.getTodayAttendanceSummary);
router.get('/attendance/:staffId/:month', requirePermission(Permission.STAFF_VIEW), staff.getMonthlyAttendance);
router.get('/duty/today', requirePermission(Permission.STAFF_VIEW), staff.getTodayDuty);

// Scheduling
router.get('/schedule/:weekStart', requirePermission(Permission.STAFF_VIEW), staff.getWeekSchedule);
router.put('/schedule/:weekStart', requirePermission(Permission.STAFF_MANAGE), staff.saveWeekSchedule);
router.post('/schedule/:weekStart/publish', requirePermission(Permission.STAFF_MANAGE), staff.publishSchedule);

// Advance Payments
router.post('/advance', requirePermission(Permission.PAYROLL_MANAGE), validate(giveAdvanceSchema), staff.giveAdvance);
router.get('/advances/all', requirePermission(Permission.PAYROLL_MANAGE), staff.getAllAdvances);
router.get('/advance/:staffId', requirePermission(Permission.PAYROLL_MANAGE), staff.getStaffAdvances);
router.patch('/advance/:id/cancel', requirePermission(Permission.PAYROLL_MANAGE), staff.cancelAdvance);

// Payroll
router.get('/payroll/:month', requirePermission(Permission.PAYROLL_MANAGE), staff.getPayroll);
router.post('/payroll/:month/calculate', requirePermission(Permission.PAYROLL_MANAGE), staff.calculatePayroll);
router.patch('/payroll/:id/paid', requirePermission(Permission.PAYROLL_MANAGE), staff.markSalaryPaid);
router.post('/payroll/:month/bulk-pay', requirePermission(Permission.PAYROLL_MANAGE), staff.bulkMarkSalaryPaid);
router.get('/payroll/:month/:staffId/slip', requirePermission(Permission.PAYROLL_MANAGE), staff.getSalarySlip);

// Performance
router.get('/performance/:month', requirePermission(Permission.STAFF_VIEW), staff.getStaffPerformance);

export default router;
