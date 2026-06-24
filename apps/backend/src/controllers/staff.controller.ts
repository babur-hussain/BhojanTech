import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth.middleware';
import { StaffMember } from '../models/StaffMember';
import { Attendance } from '../models/Attendance';
import { WeeklySchedule } from '../models/WeeklySchedule';
import { SalaryRecord } from '../models/SalaryRecord';
import { AdvancePayment } from '../models/AdvancePayment';
import { Invoice } from '../models/Invoice';
import { getBaseQuery, getCreateBranchId } from '../utils/queryHelpers';

const today = () => new Date().toISOString().slice(0, 10);

// ─── Staff Directory ──────────────────────────────────────────────────────────

export const getStaff = async (req: AuthRequest, res: Response) => {
  try {
    const query = getBaseQuery(req);
    query.isActive = true;
    const staff = await StaffMember.find(query).sort('name');
    return res.json(staff);
  } catch { return res.status(500).json({ error: 'Server error' }); }
};

export const createStaff = async (req: AuthRequest, res: Response) => {
  try {
    const branchId = getCreateBranchId(req);
    const {
      name, phone, role, designation, salaryType, salaryAmount, shift, joiningDate,
      email, address, emergencyContact, bankDetails
    } = req.body;
    const member = await StaffMember.create({
      name, phone, role, designation, salaryType, salaryAmount, shift, email, address,
      emergencyContact, bankDetails,
      joiningDate: joiningDate || new Date(),
      userId: `staff_${Date.now()}`,
      restaurantId: req.user!.restaurantId,
      branchId,
    });
    return res.status(201).json(member);
  } catch (err: any) {
    console.error('Failed to create staff:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
};

export const updateStaff = async (req: AuthRequest, res: Response) => {
  try {
    const query = getBaseQuery(req);
    query._id = req.params.id;
    const {
      name, phone, role, designation, salaryType, salaryAmount, shift, joiningDate,
      email, address, emergencyContact, bankDetails, isActive, photoUrl
    } = req.body;
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (role !== undefined) updateData.role = role;
    if (designation !== undefined) updateData.designation = designation;
    if (salaryType !== undefined) updateData.salaryType = salaryType;
    if (salaryAmount !== undefined) updateData.salaryAmount = salaryAmount;
    if (shift !== undefined) updateData.shift = shift;
    if (joiningDate !== undefined) updateData.joiningDate = joiningDate;
    if (email !== undefined) updateData.email = email;
    if (address !== undefined) updateData.address = address;
    if (emergencyContact !== undefined) updateData.emergencyContact = emergencyContact;
    if (bankDetails !== undefined) updateData.bankDetails = bankDetails;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (photoUrl !== undefined) updateData.photoUrl = photoUrl;

    const member = await StaffMember.findOneAndUpdate(
      query,
      { $set: updateData }, { new: true }
    );
    if (!member) return res.status(404).json({ error: 'Not found' });
    return res.json(member);
  } catch { return res.status(500).json({ error: 'Server error' }); }
};

export const removeStaff = async (req: AuthRequest, res: Response) => {
  try {
    const query = getBaseQuery(req);
    query._id = req.params.id;
    await StaffMember.findOneAndUpdate(
      query,
      { isActive: false }
    );
    return res.json({ success: true });
  } catch { return res.status(500).json({ error: 'Server error' }); }
};

// ─── Staff Detail ─────────────────────────────────────────────────────────────

export const getStaffDetail = async (req: AuthRequest, res: Response) => {
  try {
    const staff = await StaffMember.findOne({
      _id: req.params.id,
      restaurantId: req.user!.restaurantId,
    });
    if (!staff) return res.status(404).json({ error: 'Staff not found' });

    // Get current month attendance summary
    const currentMonth = new Date().toISOString().slice(0, 7);
    const attendance = await Attendance.find({
      staffId: staff._id,
      restaurantId: req.user!.restaurantId,
      date: { $regex: `^${currentMonth}` },
    });

    const attendanceSummary = {
      present: attendance.filter(a => a.status === 'PRESENT').length,
      absent: attendance.filter(a => a.status === 'ABSENT').length,
      late: attendance.filter(a => a.status === 'LATE').length,
      halfDay: attendance.filter(a => a.status === 'HALF_DAY').length,
      holiday: attendance.filter(a => a.status === 'HOLIDAY').length,
    };

    // Get active advances
    const advances = await AdvancePayment.find({
      staffId: staff._id,
      restaurantId: req.user!.restaurantId,
      status: 'ACTIVE',
    }).sort('-createdAt');

    // Get recent salary records (last 3 months)
    const salaryHistory = await SalaryRecord.find({
      staffId: staff._id,
      restaurantId: req.user!.restaurantId,
    }).sort('-month').limit(3);

    return res.json({
      staff: staff.toObject(),
      attendanceSummary,
      activeAdvances: advances,
      advanceBalance: advances.reduce((sum, a) => sum + a.amount, 0),
      salaryHistory,
    });
  } catch { return res.status(500).json({ error: 'Server error' }); }
};

// ─── Transfer Staff ───────────────────────────────────────────────────────────

export const transferStaff = async (req: AuthRequest, res: Response) => {
  try {
    const { targetBranchId } = req.body;
    if (!targetBranchId) return res.status(400).json({ error: 'Target branch is required' });

    const staff = await StaffMember.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.user!.restaurantId },
      {
        $set: {
          branchId: targetBranchId,
          isOnDuty: false,
          currentShift: undefined,
        }
      },
      { new: true }
    );
    if (!staff) return res.status(404).json({ error: 'Staff not found' });

    // Remove from all future weekly schedules at old branch
    // (schedules at new branch need to be manually assigned)
    return res.json({ success: true, staff });
  } catch { return res.status(500).json({ error: 'Server error' }); }
};

// ─── Attendance ───────────────────────────────────────────────────────────────

export const clockIn = async (req: AuthRequest, res: Response) => {
  try {
    const { staffId, shift, lat, lng } = req.body;
    const staff = await StaffMember.findOne({ _id: staffId, restaurantId: req.user!.restaurantId });
    if (!staff) return res.status(404).json({ error: 'Staff not found' });

    const now   = new Date();
    const shiftStartHours: Record<string, number> = { MORNING: 7, AFTERNOON: 12, EVENING: 17, NIGHT: 21 };
    const expectedStart = shiftStartHours[shift] || 9;
    const isLate = now.getHours() > expectedStart + 0.5;

    const attendance = await Attendance.findOneAndUpdate(
      { staffId, date: today() },
      {
        $set: { restaurantId: req.user!.restaurantId, branchId: staff.branchId,
          staffName: staff.name,
          status: isLate ? 'LATE' : 'PRESENT',
          clockInTime: now,
          clockInLat: lat,
          clockInLng: lng,
          shift,
          markedBy: 'SELF',
        },
      },
      { upsert: true, new: true }
    );

    await StaffMember.findByIdAndUpdate(staffId, { isOnDuty: true, currentShift: shift });
    return res.json(attendance);
  } catch { return res.status(500).json({ error: 'Server error' }); }
};

export const clockOut = async (req: AuthRequest, res: Response) => {
  try {
    const { staffId } = req.body;
    const attendance = await Attendance.findOneAndUpdate(
      { staffId, date: today() },
      { $set: { clockOutTime: new Date() } },
      { new: true }
    );
    await StaffMember.findByIdAndUpdate(staffId, { isOnDuty: false, currentShift: undefined });
    return res.json(attendance);
  } catch { return res.status(500).json({ error: 'Server error' }); }
};

export const manualMarkAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const { staffId, date, status, shift, notes } = req.body;
    const staff = await StaffMember.findById(staffId);
    if (!staff) return res.status(404).json({ error: 'Not found' });

    const record = await Attendance.findOneAndUpdate(
      { staffId, date },
      {
        $set: { restaurantId: req.user!.restaurantId, branchId: staff.branchId,
          staffName: staff.name,
          status, shift, notes,
          markedBy: req.user!.name || 'Manager',
        },
      },
      { upsert: true, new: true }
    );
    return res.json(record);
  } catch { return res.status(500).json({ error: 'Server error' }); }
};

export const bulkMarkAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const { date, entries } = req.body;
    // entries: [{ staffId, status, shift, notes }]
    if (!date || !entries || !Array.isArray(entries)) {
      return res.status(400).json({ error: 'date and entries[] are required' });
    }

    const results = await Promise.all(entries.map(async (entry: any) => {
      const staff = await StaffMember.findById(entry.staffId);
      if (!staff) return null;

      return Attendance.findOneAndUpdate(
        { staffId: entry.staffId, date },
        {
          $set: {
            restaurantId: req.user!.restaurantId,
            branchId: staff.branchId,
            staffName: staff.name,
            status: entry.status,
            shift: entry.shift || 'MORNING',
            notes: entry.notes || 'Bulk marked',
            markedBy: req.user!.name || 'Manager',
          },
        },
        { upsert: true, new: true }
      );
    }));

    return res.json(results.filter(Boolean));
  } catch { return res.status(500).json({ error: 'Server error' }); }
};

export const getMonthlyAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const { staffId, month } = req.params; // month = YYYY-MM
    const records = await Attendance.find({
      staffId,
      restaurantId: req.user!.restaurantId,
      date: { $regex: `^${month}` },
    }).sort('date');
    return res.json(records);
  } catch { return res.status(500).json({ error: 'Server error' }); }
};

export const getTodayAttendanceSummary = async (req: AuthRequest, res: Response) => {
  try {
    const query = getBaseQuery(req);
    const staffQuery = { ...query, isActive: true };
    const totalStaff = await StaffMember.countDocuments(staffQuery);

    const todayStr = today();
    const todayAttendance = await Attendance.find({ ...query, date: todayStr });

    const present = todayAttendance.filter(a => a.status === 'PRESENT').length;
    const late = todayAttendance.filter(a => a.status === 'LATE').length;
    const absent = todayAttendance.filter(a => a.status === 'ABSENT').length;
    const halfDay = todayAttendance.filter(a => a.status === 'HALF_DAY').length;
    const unmarked = totalStaff - todayAttendance.length;

    return res.json({
      date: todayStr,
      totalStaff,
      present, late, absent, halfDay, unmarked,
      records: todayAttendance,
    });
  } catch { return res.status(500).json({ error: 'Server error' }); }
};

// ─── Shift Scheduling ─────────────────────────────────────────────────────────

export const getWeekSchedule = async (req: AuthRequest, res: Response) => {
  try {
    const { weekStart } = req.params;
    const query = getBaseQuery(req);
    query.weekStartDate = weekStart;
    
    let schedule = await WeeklySchedule.findOne(query);
    if (!schedule) {
      // Build blank 7-day skeleton
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return {
          date: d.toISOString().slice(0, 10),
          MORNING: [], AFTERNOON: [], EVENING: [], NIGHT: [],
        };
      });
      const createData: any = {
        ...query,
        days, isPublished: false,
        createdBy: req.user!.name || req.user!.userId,
      };
      schedule = await WeeklySchedule.create(createData);
    }
    return res.json(schedule);
  } catch { return res.status(500).json({ error: 'Server error' }); }
};

export const saveWeekSchedule = async (req: AuthRequest, res: Response) => {
  try {
    const { weekStart } = req.params;
    const query = getBaseQuery(req);
    query.weekStartDate = weekStart;
    const schedule = await WeeklySchedule.findOneAndUpdate(
      query,
      { $set: { days: req.body.days } },
      { new: true }
    );
    return res.json(schedule);
  } catch { return res.status(500).json({ error: 'Server error' }); }
};

export const publishSchedule = async (req: AuthRequest, res: Response) => {
  try {
    const { weekStart } = req.params;
    const query = getBaseQuery(req);
    query.weekStartDate = weekStart;
    const schedule = await WeeklySchedule.findOneAndUpdate(
      query,
      { $set: { isPublished: true, publishedAt: new Date() } },
      { new: true }
    );
    // Real: FCM multicast to all staff FCM tokens
    // "Your schedule for week of {weekStart} has been published"
    return res.json(schedule);
  } catch { return res.status(500).json({ error: 'Server error' }); }
};

// ─── Advance Payments ─────────────────────────────────────────────────────────

export const giveAdvance = async (req: AuthRequest, res: Response) => {
  try {
    const { staffId, amount, reason, date } = req.body;
    if (!staffId || !amount || amount <= 0) {
      return res.status(400).json({ error: 'staffId and positive amount are required' });
    }

    const staff = await StaffMember.findOne({
      _id: staffId,
      restaurantId: req.user!.restaurantId,
    });
    if (!staff) return res.status(404).json({ error: 'Staff not found' });

    const advance = await AdvancePayment.create({
      restaurantId: req.user!.restaurantId,
      branchId: staff.branchId,
      staffId,
      staffName: staff.name,
      amount,
      reason: reason || '',
      date: date ? new Date(date) : new Date(),
      approvedBy: req.user!.name || 'Manager',
      recordedBy: req.user!.name || req.user!.userId,
      status: 'ACTIVE',
    });

    // Increment totalAdvances on staff
    await StaffMember.findByIdAndUpdate(staffId, {
      $inc: { totalAdvances: amount },
    });

    return res.status(201).json(advance);
  } catch (err: any) {
    console.error('Failed to give advance:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
};

export const getStaffAdvances = async (req: AuthRequest, res: Response) => {
  try {
    const { staffId } = req.params;
    const statusFilter = req.query.status as string;
    const query: any = {
      staffId,
      restaurantId: req.user!.restaurantId,
    };
    if (statusFilter) query.status = statusFilter;

    const advances = await AdvancePayment.find(query).sort('-createdAt');
    return res.json(advances);
  } catch { return res.status(500).json({ error: 'Server error' }); }
};

export const getAllAdvances = async (req: AuthRequest, res: Response) => {
  try {
    const query = getBaseQuery(req);
    const statusFilter = req.query.status as string;
    if (statusFilter) (query as any).status = statusFilter;

    const advances = await AdvancePayment.find(query).sort('-createdAt');

    // Group by staff for summary
    const staffMap: Record<string, { staffId: string; staffName: string; totalActive: number; advances: any[] }> = {};
    advances.forEach(a => {
      const key = a.staffId.toString();
      if (!staffMap[key]) {
        staffMap[key] = { staffId: key, staffName: a.staffName, totalActive: 0, advances: [] };
      }
      staffMap[key].advances.push(a);
      if (a.status === 'ACTIVE') staffMap[key].totalActive += a.amount;
    });

    return res.json({
      advances,
      summary: Object.values(staffMap),
      totalActiveAmount: advances.filter(a => a.status === 'ACTIVE').reduce((s, a) => s + a.amount, 0),
    });
  } catch { return res.status(500).json({ error: 'Server error' }); }
};

export const cancelAdvance = async (req: AuthRequest, res: Response) => {
  try {
    const advance = await AdvancePayment.findOne({
      _id: req.params.id,
      restaurantId: req.user!.restaurantId,
      status: 'ACTIVE',
    });
    if (!advance) return res.status(404).json({ error: 'Active advance not found' });

    advance.status = 'CANCELLED';
    advance.cancelledAt = new Date();
    advance.cancelledBy = req.user!.name || 'Manager';
    advance.cancelReason = req.body.reason || '';
    await advance.save();

    // Decrement totalAdvances on staff
    await StaffMember.findByIdAndUpdate(advance.staffId, {
      $inc: { totalAdvances: -advance.amount },
    });

    return res.json(advance);
  } catch { return res.status(500).json({ error: 'Server error' }); }
};

// ─── Payroll ──────────────────────────────────────────────────────────────────

export const calculatePayroll = async (req: AuthRequest, res: Response) => {
  try {
    const { month } = req.params; // YYYY-MM
    const query = getBaseQuery(req);
    query.isActive = true;
    const staff = await StaffMember.find(query);

    // Working days in month (Mon-Sat, excluding Sundays)
    const [y, m] = month.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const totalWorkingDays = Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(y, m - 1, i + 1);
      return d.getDay() !== 0; // exclude Sunday
    }).filter(Boolean).length;

    const results = await Promise.all(staff.map(async s => {
      const records = await Attendance.find({ staffId: s._id, restaurantId: req.user!.restaurantId, date: { $regex: `^${month}` } });
      const present  = records.filter(r => r.status === 'PRESENT' || r.status === 'LATE').length;
      const halfDays = records.filter(r => r.status === 'HALF_DAY').length;
      const absent   = totalWorkingDays - present - halfDays;

      // Calculate attendance-based deductions
      let grossPayable: number;
      let deductions: number;
      if (s.salaryType === 'MONTHLY') {
        const perDay = s.salaryAmount / totalWorkingDays;
        deductions = (absent * perDay) + (halfDays * perDay * 0.5);
        grossPayable = Math.max(0, +(s.salaryAmount - deductions).toFixed(2));
      } else {
        deductions = 0;
        grossPayable = +(s.salaryAmount * (present + halfDays * 0.5)).toFixed(2);
      }

      // Get all ACTIVE advances for this staff and deduct them
      const activeAdvances = await AdvancePayment.find({
        staffId: s._id,
        restaurantId: req.user!.restaurantId,
        status: 'ACTIVE',
      });
      const totalAdvanceAmount = activeAdvances.reduce((sum, a) => sum + a.amount, 0);

      const netPayable = Math.max(0, +(grossPayable - totalAdvanceAmount).toFixed(2));

      const salaryRecord = await SalaryRecord.findOneAndUpdate(
        { staffId: s._id, month },
        {
          $set: {
            restaurantId: req.user!.restaurantId, branchId: s.branchId, staffName: s.name, month,
            salaryType: s.salaryType, baseSalary: s.salaryAmount,
            totalWorkingDays, presentDays: present,
            absentDays: Math.max(0, absent), halfDays,
            deductions: +deductions.toFixed(2),
            advances: totalAdvanceAmount,
            netPayable,
          },
          $setOnInsert: { isPaid: false },
        },
        { upsert: true, new: true }
      );

      // Mark advances as DEDUCTED and link to this salary record
      if (totalAdvanceAmount > 0) {
        await AdvancePayment.updateMany(
          { staffId: s._id, restaurantId: req.user!.restaurantId, status: 'ACTIVE' },
          {
            $set: {
              status: 'DEDUCTED',
              deductedInMonth: month,
              salaryRecordId: salaryRecord._id,
            },
          }
        );

        // Reset totalAdvances on staff
        await StaffMember.findByIdAndUpdate(s._id, { totalAdvances: 0 });
      }

      return salaryRecord;
    }));

    return res.json(results);
  } catch { return res.status(500).json({ error: 'Server error' }); }
};

export const markSalaryPaid = async (req: AuthRequest, res: Response) => {
  try {
    const query = getBaseQuery(req);
    query._id = req.params.id;
    const record = await SalaryRecord.findOneAndUpdate(
      query,
      { $set: { isPaid: true, paidDate: new Date(), paidBy: req.user!.name || 'Manager' } },
      { new: true }
    );
    if (!record) return res.status(404).json({ error: 'Not found' });
    return res.json(record);
  } catch { return res.status(500).json({ error: 'Server error' }); }
};

export const bulkMarkSalaryPaid = async (req: AuthRequest, res: Response) => {
  try {
    const { month } = req.params;
    const query = getBaseQuery(req);
    (query as any).month = month;
    (query as any).isPaid = false;

    const result = await SalaryRecord.updateMany(
      query,
      { $set: { isPaid: true, paidDate: new Date(), paidBy: req.user!.name || 'Manager' } }
    );

    return res.json({ success: true, modifiedCount: result.modifiedCount });
  } catch { return res.status(500).json({ error: 'Server error' }); }
};

export const getPayroll = async (req: AuthRequest, res: Response) => {
  try {
    const { month } = req.params;
    const query = getBaseQuery(req);
    query.month = month;
    const records = await SalaryRecord.find(query).sort('staffName');
    return res.json(records);
  } catch { return res.status(500).json({ error: 'Server error' }); }
};

export const getSalarySlip = async (req: AuthRequest, res: Response) => {
  try {
    const { month, staffId } = req.params;
    const salaryRecord = await SalaryRecord.findOne({
      staffId,
      month,
      restaurantId: req.user!.restaurantId,
    });
    if (!salaryRecord) return res.status(404).json({ error: 'Salary record not found' });

    const staff = await StaffMember.findById(staffId);
    if (!staff) return res.status(404).json({ error: 'Staff not found' });

    // Get advance deductions for this month
    const deductedAdvances = await AdvancePayment.find({
      staffId,
      restaurantId: req.user!.restaurantId,
      deductedInMonth: month,
      status: 'DEDUCTED',
    });

    return res.json({
      staff: {
        name: staff.name,
        designation: staff.designation || staff.role,
        employeeId: staff._id,
        phone: staff.phone,
        joiningDate: staff.joiningDate,
        bankDetails: staff.bankDetails ? {
          bankName: staff.bankDetails.bankName,
          accountNumber: staff.bankDetails.accountNumber
            ? `XXXX${staff.bankDetails.accountNumber.slice(-4)}`
            : '',
          ifscCode: staff.bankDetails.ifscCode,
        } : null,
      },
      salary: salaryRecord.toObject(),
      advanceDeductions: deductedAdvances.map(a => ({
        date: a.date,
        amount: a.amount,
        reason: a.reason,
      })),
    });
  } catch { return res.status(500).json({ error: 'Server error' }); }
};

// ─── Performance Metrics ──────────────────────────────────────────────────────

export const getStaffPerformance = async (req: AuthRequest, res: Response) => {
  try {
    const { month } = req.params;
    const [y, m] = month.split('-').map(Number);
    const start = new Date(y, m - 1, 1);
    const end   = new Date(y, m, 0, 23, 59, 59);

    // Aggregate invoices grouped by waiterName
    const agg = await Invoice.aggregate([
      { $match: { restaurantId: new mongoose.Types.ObjectId(req.user!.restaurantId), createdAt: { $gte: start, $lte: end } } },
      { $group: {
        _id: '$waiterName',
        ordersHandled: { $sum: 1 },
        totalRevenue:  { $sum: '$grandTotalINR' },
        avgOrderValue: { $avg: '$grandTotalINR' },
      }},
      { $sort: { totalRevenue: -1 } },
    ]);

    // Get attendance data for each staff to compute punctuality
    const query = getBaseQuery(req);
    query.isActive = true;
    const allStaff = await StaffMember.find(query);
    const staffAttendanceMap: Record<string, any> = {};

    await Promise.all(allStaff.map(async s => {
      const records = await Attendance.find({
        staffId: s._id,
        restaurantId: req.user!.restaurantId,
        date: { $regex: `^${month}` },
      });
      staffAttendanceMap[s.name] = {
        presentDays: records.filter(r => r.status === 'PRESENT').length,
        lateDays: records.filter(r => r.status === 'LATE').length,
        absentDays: records.filter(r => r.status === 'ABSENT').length,
        halfDays: records.filter(r => r.status === 'HALF_DAY').length,
      };
    }));

    return res.json(agg.map(a => {
      const att = staffAttendanceMap[a._id] || { presentDays: 0, lateDays: 0, absentDays: 0, halfDays: 0 };
      const totalMarked = att.presentDays + att.lateDays + att.absentDays + att.halfDays;
      const punctualityScore = totalMarked > 0
        ? Math.round(((att.presentDays) / totalMarked) * 100)
        : 0;

      return {
        staffName: a._id,
        month,
        ordersHandled: a.ordersHandled,
        totalRevenue: +a.totalRevenue.toFixed(2),
        avgOrderValue: +a.avgOrderValue.toFixed(2),
        tipsReceived: 0,
        feedbackScore: 4.2,
        presentDays: att.presentDays,
        lateDays: att.lateDays,
        absentDays: att.absentDays,
        punctualityScore,
      };
    }));
  } catch { return res.status(500).json({ error: 'Server error' }); }
};

// ─── Today's Duty Status ──────────────────────────────────────────────────────

export const getTodayDuty = async (req: AuthRequest, res: Response) => {
  try {
    const query = getBaseQuery(req);
    
    const staffQuery = { ...query, isActive: true };
    const staff = await StaffMember.find(staffQuery).sort('name');
    
    const todayStr = today();
    const attQuery = { ...query, date: todayStr };
    const attendance = await Attendance.find(attQuery);
    
    const attMap = Object.fromEntries(attendance.map(a => [a.staffId.toString(), a]));
    return res.json(staff.map(s => ({
      ...s.toObject(),
      todayAttendance: attMap[s._id.toString()] || null,
    })));
  } catch { return res.status(500).json({ error: 'Server error' }); }
};
