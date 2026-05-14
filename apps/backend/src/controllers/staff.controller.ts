import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth.middleware';
import { StaffMember } from '../models/StaffMember';
import { Attendance } from '../models/Attendance';
import { WeeklySchedule } from '../models/WeeklySchedule';
import { SalaryRecord } from '../models/SalaryRecord';
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
    const member = await StaffMember.create({ ...req.body, restaurantId: req.user!.restaurantId, branchId });
    // Real: send Firebase invite via firebase-admin.auth().createUser({ phoneNumber: req.body.phone })
    // then sendInviteSMS(req.body.phone, inviteLink)
    return res.status(201).json(member);
  } catch { return res.status(500).json({ error: 'Server error' }); }
};

export const updateStaff = async (req: AuthRequest, res: Response) => {
  try {
    const query = getBaseQuery(req);
    query._id = req.params.id;
    const member = await StaffMember.findOneAndUpdate(
      query,
      req.body, { new: true }
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

      let netPayable: number;
      if (s.salaryType === 'MONTHLY') {
        const perDay = s.salaryAmount / totalWorkingDays;
        const deductions = (absent * perDay) + (halfDays * perDay * 0.5);
        netPayable = Math.max(0, +(s.salaryAmount - deductions).toFixed(2));
      } else {
        netPayable = +(s.salaryAmount * (present + halfDays * 0.5)).toFixed(2);
      }

      return SalaryRecord.findOneAndUpdate(
        { staffId: s._id, month },
        {
          $set: {
            restaurantId: req.user!.restaurantId, branchId: s.branchId, staffName: s.name, month,
            salaryType: s.salaryType, baseSalary: s.salaryAmount,
            totalWorkingDays, presentDays: present,
            absentDays: Math.max(0, absent), halfDays,
            deductions: 0, advances: 0,
            netPayable,
          },
          $setOnInsert: { isPaid: false },
        },
        { upsert: true, new: true }
      );
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

export const getPayroll = async (req: AuthRequest, res: Response) => {
  try {
    const { month } = req.params;
    const query = getBaseQuery(req);
    query.month = month;
    const records = await SalaryRecord.find(query).sort('staffName');
    return res.json(records);
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

    return res.json(agg.map(a => ({
      staffName:     a._id,
      month,
      ordersHandled: a.ordersHandled,
      totalRevenue:  +a.totalRevenue.toFixed(2),
      avgOrderValue: +a.avgOrderValue.toFixed(2),
      tipsReceived:  0,
      feedbackScore: 4.2, // placeholder until tip/feedback module
    })));
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
