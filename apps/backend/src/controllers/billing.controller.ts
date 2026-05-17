import { Response } from 'express';
import mongoose from 'mongoose';
import Razorpay from 'razorpay';
import { AuthRequest } from '../middleware/auth.middleware';
import { Order } from '../models/Order';
import { Table } from '../models/Table';
import { Invoice } from '../models/Invoice';
import { InvoiceSequence } from '../models/InvoiceSequence';
import { Branch } from '../models/Branch';
import { Restaurant } from '../models/Restaurant';
import { MenuItem } from '../models/MenuItem';
import { buildLineItems, computeGSTBreakup, generateInvoiceNumber } from '../utils/gst';
import { amountInWords } from '../utils/numberToWords';
import { io } from '../index';
import { Customer } from '../models/Customer';
import {
  upsertCustomer,
  earnPoints,
  redeemPoints,
  getOrInitSettings,
  resolveTier,
  applyTierDiscount,
} from '../services/loyaltyService';
import { Feedback } from '../models/Feedback';
import { RetailItem } from '../models/RetailItem';

export const getInvoice = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findOne({ _id: id, restaurantId: req.user!.restaurantId });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    return res.json(invoice);
  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
};
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_key',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret',
});

// ─── Preview Bill (before payment) ─────────────────────────────────────────

export const previewBill = async (req: AuthRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findOne({ _id: orderId, restaurantId: req.user!.restaurantId });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Enrich items with gstSlab
    const menuItemIds = order.items.map(i => i.menuItemId);
    const menuItems = await MenuItem.find({ _id: { $in: menuItemIds } });

    const enrichedItems = order.items.map(i => {
      const mi = menuItems.find(m => m._id.toString() === i.menuItemId.toString());
      return {
        ...(i as any).toObject(),
        gstSlab: mi?.gstSlab ?? 5,
        hindiName: mi?.hindiName,
      };
    });

    const lineItems = buildLineItems(enrichedItems as any);
    const subtotal = +lineItems.reduce((s, l) => s + l.lineTotal, 0).toFixed(2);
    const gstBreakup = computeGSTBreakup(lineItems);
    const totalGST = +gstBreakup.reduce((s, g) => s + g.cgst + g.sgst, 0).toFixed(2);
    const raw = subtotal; // GST-inclusive
    const rounded = Math.round(raw);
    const roundOff = +(rounded - raw).toFixed(2);

    return res.json({
      order,
      lineItems,
      subtotalINR: subtotal,
      gstBreakup,
      totalGSTINR: totalGST,
      grandTotalINR: rounded,
      roundOff,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
};

// ─── Create Razorpay Order ──────────────────────────────────────────────────

export const createRazorpayOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { amountINR } = req.body;
    const rpOrder = await razorpay.orders.create({
      amount: Math.round(amountINR * 100), // paise
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
    });
    return res.json({ razorpayOrderId: rpOrder.id, amount: rpOrder.amount });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create Razorpay order' });
  }
};

// ─── Customer lookup for billing screen ──────────────────────────────────────

export const billingCustomerLookup = async (req: AuthRequest, res: Response) => {
  try {
    const { phone } = req.params;
    const restaurantId = req.user!.restaurantId as string;
    const settings = await getOrInitSettings(restaurantId);

    const customer = await Customer.findOne({ restaurantId, phone });
    if (!customer) return res.status(404).json({ found: false });

    // Resolve tier config for discount preview
    const tierConfig = resolveTier(customer.totalSpend, settings.tiers);
    const lastOrder = await Order.findOne({ restaurantId, customerPhone: phone, status: 'PAID' })
      .sort({ createdAt: -1 })
      .select('items createdAt');

    return res.json({
      found: true,
      customer: {
        _id: customer._id,
        name: customer.name,
        phone: customer.phone,
        tier: customer.tier,
        segment: customer.segment,
        loyaltyPoints: customer.loyaltyPoints,
        totalVisits: customer.totalVisits,
        totalSpend: customer.totalSpend,
        notes: customer.notes,
      },
      tierDiscountPercent: tierConfig?.discountPercent || 0,
      tierPerks: tierConfig?.perks || [],
      pointsPerRupeeRedemption: settings.pointsPerRupeeRedemption,
      minimumRedemptionPoints: settings.minimumRedemptionPoints,
      lastOrdered: lastOrder?.items.map((i) => i.name).join(', ') || '',
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
};

// ─── Generate Bill (No payment yet, just lock order) ─────────────────────────
export const generateBill = async (req: AuthRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const restaurantId = req.user!.restaurantId;

    const order = await Order.findOne({ _id: orderId, restaurantId });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status !== 'OPEN') return res.status(400).json({ error: 'Order is not open' });

    order.status = 'BILLED';
    await order.save();

    // Notify Waiter/Customer via Socket.io
    io.to(`restaurant_${restaurantId}_branch_${req.user!.branchId}`).emit('order_update', { type: 'BILL_GENERATED', order });
    io.to(`restaurant_${restaurantId}_branch_${req.user!.branchId}`).emit('bill_requested', { tableNumber: order.tableNumber, orderId: order._id });
    
    io.to(`order_${order._id}`).emit('order_update', { type: 'BILL_GENERATED', order });

    return res.json({ message: 'Bill generated successfully', order });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
};

// ─── Process Payment & Generate Invoice ─────────────────────────────────────

export const processPayment = async (req: AuthRequest, res: Response) => {
  try {
    const {
      orderId,
      orderType = 'DINE_IN',
      discount,
      payments,           // PaymentSplit[]
      paymentMode,
      amountPaidINR,
      customerPhone,
      customerName,
      redeemPoints: pointsToRedeem,
      razorpayOrderId,
      razorpayPaymentId,
      retailItems = [],    // [{ _id, quantity }]
    } = req.body;

    const restaurantId = req.user!.restaurantId;

    const [order, restaurant] = await Promise.all([
      Order.findOne({ _id: orderId, restaurantId }),
      Restaurant.findOne({ _id: restaurantId }),
    ]);

    if (!order) return res.status(404).json({ error: 'Order not found' });
    // Allow CANCELLED but nothing else outside the normal flow
    if (order.status === 'CANCELLED') return res.status(400).json({ error: 'Order is cancelled' });

    // If already PAID, return the most-recent invoice immediately (idempotent re-print)
    if (order.status === 'PAID') {
      const existingInvoice = await Invoice.findOne({ orderId: order._id }).sort({ createdAt: -1 });
      if (existingInvoice) {
        return res.status(200).json({ invoice: existingInvoice });
      }
      // Edge case: PAID but no invoice found — fall through to create one
    }

    // Enrich items
    const menuItemIds = order.items.map(i => i.menuItemId);
    const menuItems = await MenuItem.find({ _id: { $in: menuItemIds } });

    const enrichedItems = order.items.map(i => {
      const mi = menuItems.find(m => m._id.toString() === i.menuItemId.toString());
      return { ...(i as any).toObject(), gstSlab: mi?.gstSlab ?? 5, hindiName: mi?.hindiName };
    });

    const lineItems = buildLineItems(enrichedItems as any);

    // ─ Retail items ──────────────────────────────────────────────────────────
    let retailLineItems: any[] = [];
    if (retailItems && retailItems.length > 0) {
      const retailIds = retailItems.map((r: any) => r._id);
      const retailDocs = await RetailItem.find({ _id: { $in: retailIds }, restaurantId });
      retailLineItems = retailItems.map((r: any) => {
        const doc = retailDocs.find((d: any) => d._id.toString() === r._id);
        if (!doc) return null;
        const lineTotal = +(doc.priceINR * r.quantity).toFixed(2);
        return {
          name: doc.name,
          variantName: undefined,
          quantity: r.quantity,
          unitPrice: doc.priceINR,
          gstSlab: doc.gstSlab,
          lineTotal,
          hsnCode: '',
        };
      }).filter(Boolean);

      // Deduct stock for each retail item sold
      for (const r of retailItems) {
        await RetailItem.findOneAndUpdate(
          { _id: r._id, restaurantId },
          { $inc: { stock: -r.quantity } }
        );
      }
    }

    const allLineItems = [...lineItems, ...retailLineItems];
    const subtotal = +lineItems.reduce((s, l) => s + l.lineTotal, 0).toFixed(2);

    // ─ Loyalty settings & customer ─────────────────────────────────────────
    const loyaltySettings = await getOrInitSettings(restaurantId as string);
    let loyaltyCustomer: any = null;
    let tierDiscountINR = 0;
    let loyaltyRedemptionDiscount = 0;

    if (customerPhone) {
      loyaltyCustomer = await Customer.findOne({ restaurantId, phone: customerPhone });
      if (loyaltyCustomer) {
        const tierConfig = resolveTier(loyaltyCustomer.totalSpend, loyaltySettings.tiers);
        tierDiscountINR = applyTierDiscount(subtotal, tierConfig);

        // Redeem points if requested
        if (pointsToRedeem && pointsToRedeem >= loyaltySettings.minimumRedemptionPoints) {
          loyaltyRedemptionDiscount = +(pointsToRedeem / loyaltySettings.pointsPerRupeeRedemption).toFixed(2);
        }
      }
    }

    // Discount (manual staff discount)
    let flatDiscount = tierDiscountINR + loyaltyRedemptionDiscount;
    if (discount) {
      flatDiscount += discount.type === 'FLAT'
        ? discount.value
        : +(subtotal * discount.value / 100).toFixed(2);
    }

    const allSubtotal = +allLineItems.reduce((s: number, l: any) => s + l.lineTotal, 0).toFixed(2);

    const gstBreakup = computeGSTBreakup(allLineItems as any, flatDiscount);
    const totalGST = +gstBreakup.reduce((s, g) => s + g.cgst + g.sgst, 0).toFixed(2);
    const raw = allSubtotal - flatDiscount;
    const rounded = Math.round(raw);
    const roundOff = +(rounded - raw).toFixed(2);
    const grandTotal = rounded;

    // Invoice number (atomic sequence)
    const branchId = req.user!.branchId;
    const seq = await (InvoiceSequence as any).getNextSequence(
      new mongoose.Types.ObjectId(restaurantId as string),
      branchId ? new mongoose.Types.ObjectId(branchId as string) : undefined
    );
    // Look up branch prefix for invoice numbering
    let branchPrefix: string | undefined;
    if (branchId) {
      const branch = await Branch.findById(branchId).select('invoicePrefix').lean();
      branchPrefix = branch?.invoicePrefix;
    }
    const invoiceNumber = generateInvoiceNumber(seq, branchPrefix);

    const { english: totalInWords, hindi: totalInWordHindi } = amountInWords(grandTotal);

    const invoice = await Invoice.create({
      invoiceNumber,
      restaurantId,
      branchId: branchId || undefined,
      orderId: order._id,
      tableNumber: order.tableNumber || 'DIRECT',
      waiterName: order.waiterName || req.user!.name || 'Staff',
      orderType,
      lineItems: allLineItems,
      subtotalINR: allSubtotal,
      gstBreakup,
      totalGSTINR: totalGST,
      discount: discount
        ? { type: discount.type, value: discount.value, flatAmount: flatDiscount, approvedBy: discount.approvedBy }
        : undefined,
      roundOff,
      grandTotalINR: grandTotal,
      payments: payments ?? [{ mode: paymentMode, amountINR: grandTotal }],
      paymentMode,
      amountPaidINR: amountPaidINR ?? grandTotal,
      changeINR: Math.max(0, (amountPaidINR ?? grandTotal) - grandTotal),
      totalInWords,
      totalInWordHindi,
      razorpayOrderId,
      razorpayPaymentId,
      customerPhone,
      dailySequence: seq,
    });

    // Update order & table status
    order.status = 'PAID';
    if (customerPhone) {
      order.customerPhone = customerPhone;
      if (customerName) order.customerName = customerName;
    }
    await order.save();

    await Table.findOneAndUpdate(
      { currentOrderId: order._id, restaurantId },
      { status: 'AVAILABLE', currentOrderId: null, seatedAt: null }
    );

    // ─ Loyalty: upsert customer, earn points ────────────────────────────────
    let loyaltyInfo: any = null;
    if (customerPhone && grandTotal > 0) {
      try {
        const { customer, isFirstVisit, isBirthdayMonth, settings } = await upsertCustomer(
          restaurantId as string,
          customerPhone,
          customerName || order.customerName || 'Guest',
          grandTotal,
          (order._id as any).toString(),
          order.items.map((i) => ({ name: i.name, menuItemId: i.menuItemId.toString(), quantity: i.quantity }))
        );

        // Deduct redeemed points if any
        if (pointsToRedeem && loyaltyRedemptionDiscount > 0) {
          await redeemPoints(
            customer._id.toString(),
            restaurantId as string,
            pointsToRedeem,
            (order._id as any).toString(),
            loyaltySettings
          );
        }

        const { pointsEarned, newBalance } = await earnPoints(
          customer,
          grandTotal,
          (order._id as any).toString(),
          loyaltySettings,
          isFirstVisit,
          isBirthdayMonth
        );

        loyaltyInfo = {
          customerId: customer._id,
          customerName: customer.name,
          tier: customer.tier,
          pointsEarned,
          pointsRedeemed: pointsToRedeem || 0,
          newBalance,
          tierDiscountINR,
          loyaltyRedemptionDiscountINR: loyaltyRedemptionDiscount,
        };

        // Schedule feedback SMS (30-min delay via async setTimeout — in production use Bull queue)
        if (customer.smsOptIn && loyaltySettings.msg91AuthKey) {
          const feedbackRecord = await Feedback.create({
            customerId: customer._id,
            restaurantId,
            branchId: req.user!.branchId,
            orderId: order._id,
            invoiceId: invoice._id,
            phone: customerPhone,
            feedbackSentAt: new Date(Date.now() + 30 * 60 * 1000),
          });
          // Note: actual SMS sending is handled by the feedback cron job
        }
      } catch (loyaltyErr) {
        console.error('[Loyalty] Error processing loyalty:', loyaltyErr);
        // Non-fatal — don't fail the billing
      }
    }

    // Emit real-time events
    io.to(`restaurant_${restaurantId}_branch_${req.user!.branchId}`).emit('table_update', {
      type: 'TABLE_FREED', tableNumber: order.tableNumber,
    });
    io.to(`restaurant_${restaurantId}_branch_${req.user!.branchId}`).emit('order_update', {
      type: 'ORDER_PAID', orderId: order._id,
    });
    io.to(`order_${order._id}`).emit('order_update', {
      type: 'ORDER_PAID', orderId: order._id,
    });

    return res.status(201).json({ invoice });
  } catch (error: any) {
    console.error('Payment Error:', error);
    // Handle duplicate invoice number (race condition / retry)
    if (error?.code === 11000) {
      // Unique key violation — invoice already exists, return it
      try {
        const dup = await Invoice.findOne({ orderId: req.body.orderId }).sort({ createdAt: -1 });
        if (dup) return res.status(200).json({ invoice: dup });
      } catch (_) {}
    }
    return res.status(500).json({ error: 'Server error: ' + (error as Error).message });
  }
};

// ─── Razorpay Webhook ────────────────────────────────────────────────────────

export const razorpayWebhook = async (req: any, res: Response) => {
  try {
    const { event, payload } = req.body;
    if (event === 'payment.captured') {
      const paymentId = payload.payment.entity.id;
      const orderId = payload.payment.entity.order_id;
      await Invoice.findOneAndUpdate(
        { razorpayOrderId: orderId },
        { razorpayPaymentId: paymentId }
      );
    }
    return res.json({ received: true });
  } catch (err) {
    return res.status(500).json({ error: 'Webhook error' });
  }
};

// ─── EOD Summary ─────────────────────────────────────────────────────────────

export const eodSummary = async (req: AuthRequest, res: Response) => {
  try {
    const restaurantId = req.user!.restaurantId;
    const dateStr = (req.query.date as string) || new Date().toISOString().slice(0, 10);
    const [year, month, day] = dateStr.split('-').map(Number);
    const start = new Date(year, month - 1, day, 0, 0, 0);
    const end = new Date(year, month - 1, day, 23, 59, 59);

    const invoices = await Invoice.find({
      restaurantId,
      createdAt: { $gte: start, $lte: end },
    });

    const summary = {
      date: dateStr,
      restaurantId,
      totalOrders: invoices.length,
      totalRevenue: +invoices.reduce((s, i) => s + i.grandTotalINR, 0).toFixed(2),
      cashCollected: +invoices
        .filter(i => ['CASH', 'SPLIT'].includes(i.paymentMode))
        .reduce((s, i) => s + i.payments.filter(p => p.mode === 'CASH').reduce((ss, p) => ss + p.amountINR, 0), 0)
        .toFixed(2),
      cardCollected: +invoices
        .filter(i => ['CARD', 'SPLIT'].includes(i.paymentMode))
        .reduce((s, i) => s + i.payments.filter(p => p.mode === 'CARD').reduce((ss, p) => ss + p.amountINR, 0), 0)
        .toFixed(2),
      upiCollected: +invoices
        .filter(i => ['UPI', 'SPLIT'].includes(i.paymentMode))
        .reduce((s, i) => s + i.payments.filter(p => p.mode === 'UPI').reduce((ss, p) => ss + p.amountINR, 0), 0)
        .toFixed(2),
      totalGSTCollected: +invoices.reduce((s, i) => s + i.totalGSTINR, 0).toFixed(2),
      cgstCollected: +invoices.reduce((s, i) => s + i.gstBreakup.reduce((ss, g) => ss + g.cgst, 0), 0).toFixed(2),
      sgstCollected: +invoices.reduce((s, i) => s + i.gstBreakup.reduce((ss, g) => ss + g.sgst, 0), 0).toFixed(2),
      totalDiscounts: +invoices.reduce((s, i) => s + (i.discount?.flatAmount ?? 0), 0).toFixed(2),
      invoices: invoices.map(i => ({
        invoiceNumber: i.invoiceNumber,
        grandTotal: i.grandTotalINR,
        mode: i.paymentMode,
      })),
    };

    return res.json(summary);
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
};

// ─── Create Direct Bill (POS) ────────────────────────────────────────────────
export const createDirectBill = async (req: AuthRequest, res: Response) => {
  try {
    const {
      items,
      orderType = 'TAKEAWAY',
      discount,
      payments,
      paymentMode,
      amountPaidINR,
      customerPhone,
      customerName,
      redeemPoints: pointsToRedeem,
    } = req.body;

    const restaurantId = req.user!.restaurantId;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'No items provided' });
    }

    // 1. Create a "Direct" Order
    const totalAmountINR = items.reduce((sum: number, item: any) => sum + (item.priceAtOrderTime * item.quantity), 0);
    
    const order = await Order.create({
      restaurantId,
      branchId: req.user!.branchId,
      isOnlineOrder: true, // Bypass table requirement
      deliveryPlatform: 'MANUAL',
      waiterId: req.user!.userId,
      waiterName: req.user!.name || 'Staff',
      items: items.map((i: any) => ({ ...i, _id: new mongoose.Types.ObjectId(), sentToKitchen: true })),
      totalAmountINR,
      status: 'PAID', // Directly marked as paid
      customerName,
      customerPhone,
      paymentMode,
      paymentStatus: 'PAID',
    });

    // 2. Compute Invoice Data
    const menuItemIds = order.items.map(i => i.menuItemId);
    const menuItems = await MenuItem.find({ _id: { $in: menuItemIds } });

    const enrichedItems = order.items.map(i => {
      const mi = menuItems.find(m => m._id.toString() === i.menuItemId.toString());
      return { ...(i as any).toObject(), gstSlab: mi?.gstSlab ?? 5, hindiName: mi?.hindiName };
    });

    const lineItems = buildLineItems(enrichedItems as any);
    const subtotal = +lineItems.reduce((s, l) => s + l.lineTotal, 0).toFixed(2);

    // 3. Loyalty & Discounts
    const loyaltySettings = await getOrInitSettings(restaurantId as string);
    let tierDiscountINR = 0;
    let loyaltyRedemptionDiscount = 0;

    if (customerPhone) {
      const loyaltyCustomer = await Customer.findOne({ restaurantId, phone: customerPhone });
      if (loyaltyCustomer) {
        const tierConfig = resolveTier(loyaltyCustomer.totalSpend, loyaltySettings.tiers);
        tierDiscountINR = applyTierDiscount(subtotal, tierConfig);

        if (pointsToRedeem && pointsToRedeem >= loyaltySettings.minimumRedemptionPoints) {
          loyaltyRedemptionDiscount = +(pointsToRedeem / loyaltySettings.pointsPerRupeeRedemption).toFixed(2);
        }
      }
    }

    let flatDiscount = tierDiscountINR + loyaltyRedemptionDiscount;
    if (discount) {
      flatDiscount += discount.type === 'FLAT'
        ? discount.value
        : +(subtotal * discount.value / 100).toFixed(2);
    }

    const gstBreakup = computeGSTBreakup(lineItems, flatDiscount);
    const totalGST = +gstBreakup.reduce((s, g) => s + g.cgst + g.sgst, 0).toFixed(2);
    const raw = subtotal - flatDiscount;
    const rounded = Math.round(raw);
    const roundOff = +(rounded - raw).toFixed(2);
    const grandTotal = rounded;

    // 4. Generate Invoice (atomic sequence)
    const branchId = req.user!.branchId;
    const seq = await (InvoiceSequence as any).getNextSequence(
      new mongoose.Types.ObjectId(restaurantId as string),
      branchId ? new mongoose.Types.ObjectId(branchId as string) : undefined
    );
    // Look up branch prefix for invoice numbering
    let branchPrefix: string | undefined;
    if (branchId) {
      const branch = await Branch.findById(branchId).select('invoicePrefix').lean();
      branchPrefix = branch?.invoicePrefix;
    }
    const invoiceNumber = generateInvoiceNumber(seq, branchPrefix);
    const { english: totalInWords, hindi: totalInWordHindi } = amountInWords(grandTotal);

    const invoice = await Invoice.create({
      invoiceNumber,
      restaurantId,
      branchId: branchId || undefined,
      orderId: order._id,
      tableNumber: 'DIRECT',
      waiterName: order.waiterName,
      orderType,
      lineItems,
      subtotalINR: subtotal,
      gstBreakup,
      totalGSTINR: totalGST,
      discount: discount
        ? { type: discount.type, value: discount.value, flatAmount: flatDiscount, approvedBy: discount.approvedBy }
        : undefined,
      roundOff,
      grandTotalINR: grandTotal,
      payments: payments ?? [{ mode: paymentMode, amountINR: grandTotal }],
      paymentMode,
      amountPaidINR: amountPaidINR ?? grandTotal,
      changeINR: Math.max(0, (amountPaidINR ?? grandTotal) - grandTotal),
      totalInWords,
      totalInWordHindi,
      customerPhone,
      dailySequence: seq,
    });

    // 5. Update Loyalty (similar to processPayment)
    let loyaltyInfo: any = null;
    if (customerPhone && grandTotal > 0) {
      try {
        const { customer, isFirstVisit, isBirthdayMonth } = await upsertCustomer(
          restaurantId as string,
          customerPhone,
          customerName || order.customerName || 'Guest',
          grandTotal,
          (order._id as any).toString(),
          order.items.map((i) => ({ name: i.name, menuItemId: i.menuItemId.toString(), quantity: i.quantity }))
        );

        if (pointsToRedeem && loyaltyRedemptionDiscount > 0) {
          await redeemPoints(
            customer._id.toString(),
            restaurantId as string,
            pointsToRedeem,
            (order._id as any).toString(),
            loyaltySettings
          );
        }

        const { pointsEarned, newBalance } = await earnPoints(
          customer,
          grandTotal,
          (order._id as any).toString(),
          loyaltySettings,
          isFirstVisit,
          isBirthdayMonth
        );

        loyaltyInfo = {
          customerId: customer._id,
          customerName: customer.name,
          tier: customer.tier,
          pointsEarned,
          pointsRedeemed: pointsToRedeem || 0,
          newBalance,
          tierDiscountINR,
          loyaltyRedemptionDiscountINR: loyaltyRedemptionDiscount,
        };
      } catch (loyaltyErr) {
        console.error('[Loyalty] Error processing loyalty:', loyaltyErr);
      }
    }

    return res.status(201).json({ invoice, loyaltyInfo, order });
  } catch (err) {
    console.error('Error creating direct bill:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
