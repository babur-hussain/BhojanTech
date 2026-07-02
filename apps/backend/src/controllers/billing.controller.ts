import { Response } from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { razorpay } from '../config/razorpay';
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
import { getBaseQuery } from '../utils/queryHelpers';
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
import { sendInvoiceWA } from '../services/whatsappService';

export const getInvoice = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findOne({ _id: id, restaurantId: req.user!.restaurantId });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    const order = await Order.findOne({ _id: invoice.orderId, restaurantId: req.user!.restaurantId });
    return res.json({ invoice, order });
  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
};
// Razorpay instance imported from shared config (config/razorpay.ts)

// ─── Preview Bill (before payment) ─────────────────────────────────────────

export const previewBill = async (req: AuthRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findOne({ _id: orderId, restaurantId: req.user!.restaurantId });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Enrich items with gstSlab
    // Priority: stored order item gstSlab > MenuItem lookup > default 5%
    const menuItemIds = order.items
      .map(i => i.menuItemId)
      .filter(id => id && id.toString() !== '000000000000000000000000');
    const menuItems = menuItemIds.length > 0
      ? await MenuItem.find({ _id: { $in: menuItemIds } })
      : [];

    const enrichedItems = order.items.map(i => {
      const mi = menuItems.find(m => m._id.toString() === i.menuItemId?.toString());
      return {
        ...(i as any).toObject(),
        gstSlab: (i as any).gstSlab ?? mi?.gstSlab ?? 0,  // stored gstSlab wins
        hindiName: mi?.hindiName,
      };
    });

    const lineItems = buildLineItems(enrichedItems as any);
    const subtotal = +lineItems.reduce((s, l) => s + l.lineTotal, 0).toFixed(2); // Pre-tax total
    const gstBreakup = computeGSTBreakup(lineItems);
    const totalGST = +gstBreakup.reduce((s, g) => s + g.cgst + g.sgst, 0).toFixed(2);
    const grandTotalRaw = subtotal + totalGST; // Subtotal + GST
    const rounded = Math.round(grandTotalRaw);
    const roundOff = +(rounded - grandTotalRaw).toFixed(2);

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
    if (!razorpay) {
      return res.status(500).json({ error: 'Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.' });
    }
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
        dob: customer.dob,
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
    const { customerPhone, customerName, customerDob } = req.body;
    const restaurantId = req.user!.restaurantId;

    const order = await Order.findOne({ _id: orderId, restaurantId });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status !== 'OPEN') return res.status(400).json({ error: 'Order is not open' });

    if (!customerPhone || !customerName) {
      return res.status(400).json({ error: 'Customer mobile number and name are required' });
    }

    if (customerPhone) {
      order.customerPhone = customerPhone;
      
      // Upsert basic customer info without affecting loyalty points
      let customer = await Customer.findOne({ restaurantId, phone: customerPhone });
      if (!customer) {
        let referralCode = crypto.randomBytes(4).toString('hex').toUpperCase();
        while (await Customer.findOne({ referralCode })) {
            referralCode = crypto.randomBytes(4).toString('hex').toUpperCase();
        }
        customer = await Customer.create({
          restaurantId,
          phone: customerPhone,
          name: customerName || 'Guest',
          firstVisitDate: new Date(),
          lastVisitDate: new Date(),
          referralCode,
          tier: 'BRONZE',
        });
      } else if (customerName) {
        customer.name = customerName;
      }
      
      if (customerDob) {
         customer.dob = new Date(customerDob);
         customer.birthdayMonth = customer.dob.getMonth() + 1;
      } else if (customerDob === null) {
         customer.dob = undefined;
         customer.birthdayMonth = undefined;
      }
      
      await customer.save();
    }

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
      customerDob,
      sendWhatsApp = true,
      redeemPoints: pointsToRedeem,
      razorpayOrderId,
      razorpayPaymentId,
      retailItems = [],    // [{ _id, quantity }]
      additionalMenuItems = [], // [{ menuItemId, name, variantName, quantity, priceAtOrderTime, gstSlab }]
    } = req.body;

    const restaurantId = req.user!.restaurantId;

    const [order, restaurant] = await Promise.all([
      Order.findOne({ _id: orderId, restaurantId }),
      Restaurant.findOne({ _id: restaurantId }),
    ]);

    if (!order) return res.status(404).json({ error: 'Order not found' });
    // Allow CANCELLED but nothing else outside the normal flow
    if (order.status === 'CANCELLED') return res.status(400).json({ error: 'Order is cancelled' });

    if (!customerPhone || !customerName) {
      return res.status(400).json({ error: 'Customer mobile number and name are required' });
    }

    // If already PAID, return the most-recent invoice immediately (idempotent re-print)
    if (order.status === 'PAID') {
      const existingInvoice = await Invoice.findOne({ orderId: order._id }).sort({ createdAt: -1 });
      if (existingInvoice) {
        return res.status(200).json({ invoice: existingInvoice });
      }
      // Edge case: PAID but no invoice found — fall through to create one
    }

    // Enrich items
    // Priority: stored order item gstSlab > MenuItem lookup > default 5%
    const menuItemIds2 = order.items
      .map(i => i.menuItemId)
      .filter(id => id && id.toString() !== '000000000000000000000000');
    const menuItemDocs = menuItemIds2.length > 0
      ? await MenuItem.find({ _id: { $in: menuItemIds2 } })
      : [];

    const enrichedItems = order.items.map(i => {
      const mi = menuItemDocs.find(m => m._id.toString() === i.menuItemId?.toString());
      return { ...(i as any).toObject(), gstSlab: (i as any).gstSlab ?? mi?.gstSlab ?? 0, hindiName: mi?.hindiName };
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

      // Deduct stock for each retail item sold at checkout
      for (const r of retailItems) {
        await RetailItem.findOneAndUpdate(
          { _id: r._id, restaurantId },
          { $inc: { stock: -r.quantity } }
        );
      }
    }

    // Deduct stock for retail items that were already in the order
    for (const item of order.items) {
      if ((item as any).isRetailItem && (item as any).retailItemId) {
        await RetailItem.findOneAndUpdate(
          { _id: (item as any).retailItemId, restaurantId },
          { $inc: { stock: -item.quantity } }
        );
      }
    }

    // ─ Additional Menu items (added at billing) ──────────────────────────────
    let additionalMenuLineItems: any[] = [];
    if (additionalMenuItems && additionalMenuItems.length > 0) {
      additionalMenuLineItems = additionalMenuItems.map((m: any) => {
        const lineTotal = +(m.priceAtOrderTime * m.quantity).toFixed(2);
        return {
          name: m.name,
          variantName: m.variantName,
          quantity: m.quantity,
          unitPrice: m.priceAtOrderTime,
          gstSlab: m.gstSlab,
          lineTotal,
          hsnCode: '',
        };
      });

      // Append to the Order so it's tracked in history
      const formattedItems = additionalMenuItems.map((i: any) => ({
        ...i,
        _id: new mongoose.Types.ObjectId(),
        menuItemId: mongoose.Types.ObjectId.isValid(i.menuItemId) ? new mongoose.Types.ObjectId(i.menuItemId) : undefined,
        sentToKitchen: false, // Added at checkout, no KOT
        priceAtOrderTime: Number(i.priceAtOrderTime || 0),
        gstSlab: Number(i.gstSlab ?? 0),
      }));
      order.items.push(...formattedItems);
      order.totalAmountINR += additionalMenuItems.reduce((sum: number, i: any) => sum + (i.priceAtOrderTime * i.quantity), 0);
    }

    const allLineItems = [...lineItems, ...retailLineItems, ...additionalMenuLineItems];
    const subtotal = +allLineItems.reduce((s: number, l: any) => s + l.lineTotal, 0).toFixed(2);

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

    let invoice: any = null;
    let attempts = 0;
    const maxAttempts = 10;
    let finalError = null;

    while (attempts < maxAttempts && !invoice) {
      try {
        attempts++;
        const branchId = req.user!.branchId;
        const seq = await (InvoiceSequence as any).getNextSequence(
          new mongoose.Types.ObjectId(restaurantId as string),
          branchId ? new mongoose.Types.ObjectId(branchId as string) : undefined
        );
        let branchPrefix: string | undefined;
        if (branchId) {
          const branch = await Branch.findById(branchId).select('invoicePrefix').lean() as any;
          branchPrefix = branch?.invoicePrefix;
        }
        const invoiceNumber = generateInvoiceNumber(seq, branchPrefix);

        const { english: totalInWords, hindi: totalInWordHindi } = amountInWords(grandTotal);

        invoice = await Invoice.create({
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
          customerName,
          dailySequence: seq,
        });

      } catch (err: any) {
        if (err.code === 11000) {
          // Check if this was a race condition for the same order
          const dup = await Invoice.findOne({ orderId: order._id }).sort({ createdAt: -1 });
          if (dup) {
            invoice = dup;
            break;
          }
          // If not the same order, it's a sequence collision. Loop and retry with new sequence.
          finalError = err;
        } else {
          throw err;
        }
      }
    }

    if (!invoice) {
      throw finalError || new Error('Failed to generate a unique invoice number after multiple attempts.');
    }

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
          order.items
            .filter((i) => i.menuItemId && i.menuItemId.toString() !== '000000000000000000000000')
            .map((i) => ({ name: i.name, menuItemId: i.menuItemId!.toString(), quantity: i.quantity })),
          undefined, // referredByCode
          customerDob === null ? null : (customerDob ? new Date(customerDob) : undefined)
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

    // Send Invoice via WhatsApp if customerPhone is present
    if (customerPhone && sendWhatsApp !== false) {
      const CUSTOMER_APP_URL = process.env.CUSTOMER_APP_URL || 'https://customer.lfvs.in';
      const invoiceUrl = `${CUSTOMER_APP_URL}/invoice/${invoice._id}`;
      sendInvoiceWA(customerPhone, invoiceUrl, invoice.invoiceNumber, {
        restaurantId: req.user!.restaurantId,
        branchId: order.branchId.toString(),
        customerName: customerName || undefined,
        amount: invoice.grandTotalINR,
        date: invoice.createdAt
      }).catch(err => {
        console.error('[WhatsApp] Failed to send invoice:', err);
      });
    }

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

    const query = getBaseQuery(req);
    if (req.query.branchId && req.query.branchId !== 'all') {
      query.branchId = req.query.branchId;
    } else if (req.query.branchId === 'all') {
      delete query.branchId; // allow fetching for all branches
    }

    const invoices = await Invoice.find({
      ...query,
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
      customerDob,
      sendWhatsApp = true,
      redeemPoints: pointsToRedeem,
    } = req.body;

    const restaurantId = req.user!.restaurantId;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'No items provided' });
    }

    if (!customerPhone || !customerName) {
      return res.status(400).json({ error: 'Customer mobile number and name are required' });
    }

    // 1. Create a "Direct" Order
    // For retail-only orders, items may not have real menuItemIds
    const totalAmountINR = items.reduce(
      (sum: number, item: any) => sum + (Number(item.priceAtOrderTime || 0) * Number(item.quantity || 1)),
      0
    );

    // Use a placeholder ObjectId for retail items that have no real menuItemId
    const RETAIL_PLACEHOLDER_ID = new mongoose.Types.ObjectId('000000000000000000000000');

    const formattedItems = items.map((i: any) => ({
      ...i,
      _id: new mongoose.Types.ObjectId(),
      menuItemId: i.menuItemId ? new mongoose.Types.ObjectId(i.menuItemId) : RETAIL_PLACEHOLDER_ID,
      sentToKitchen: true,
      priceAtOrderTime: Number(i.priceAtOrderTime || 0),
      gstSlab: Number(i.gstSlab ?? 0),   // ← persist actual product GST into the order
    }));

    const branchId = req.user!.branchId;

    const order = await Order.create({
      restaurantId,
      ...(branchId ? { branchId } : {}),
      isOnlineOrder: true, // Bypass table requirement
      deliveryPlatform: 'MANUAL',
      waiterId: req.user!.userId,
      waiterName: req.user!.name || 'Staff',
      items: formattedItems,
      totalAmountINR,
      status: 'PAID', // Directly marked as paid
      customerName,
      customerPhone,
      paymentMode,
      paymentStatus: 'PAID',
    });

    // 2. Compute Invoice Data — use gstSlab stored on each order item
    const enrichedItems = order.items.map((i: any) => ({
      ...(i as any).toObject(),
      gstSlab: (i as any).gstSlab ?? 0,  // comes from DB (persisted from request)
    }));

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
    const seq = await (InvoiceSequence as any).getNextSequence(
      new mongoose.Types.ObjectId(restaurantId as string),
      branchId ? new mongoose.Types.ObjectId(branchId as string) : undefined
    );
    // Look up branch prefix for invoice numbering
    let branchPrefix: string | undefined;
    if (branchId) {
      const branch = await Branch.findById(branchId).select('invoicePrefix').lean() as any;
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
      customerName,
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
          order.items
            .filter((i: any) => i.menuItemId && i.menuItemId.toString() !== '000000000000000000000000')
            .map((i) => ({ name: i.name, menuItemId: i.menuItemId!.toString(), quantity: i.quantity })),
          undefined, // referredByCode
          customerDob ? new Date(customerDob) : undefined
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
          };
      } catch (loyaltyErr) {
        console.error('[Loyalty] Error processing loyalty:', loyaltyErr);
      }
    }

    const room = branchId
      ? `restaurant_${restaurantId}_branch_${branchId}`
      : `restaurant_${restaurantId}`;
    io.to(room).emit('order_update', { type: 'NEW_ORDER', order });

    // Send Invoice via WhatsApp if customerPhone is present
    if (customerPhone && sendWhatsApp !== false) {
      const CUSTOMER_APP_URL = process.env.CUSTOMER_APP_URL || 'https://customer.lfvs.in';
      const invoiceUrl = `${CUSTOMER_APP_URL}/invoice/${invoice._id}`;
      sendInvoiceWA(customerPhone, invoiceUrl, invoice.invoiceNumber, {
        restaurantId: req.user!.restaurantId,
        branchId: order.branchId.toString(),
        customerName: customerName || undefined,
        amount: invoice.grandTotalINR,
        date: invoice.createdAt
      }).catch(err => {
        console.error('[WhatsApp] Failed to send invoice:', err);
      });
    }

    return res.status(201).json({ invoice, loyaltyInfo, order });
  } catch (err) {
    console.error('Error creating direct bill:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

export const updateInvoice = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      paymentMode,
      payments,
      amountPaidINR,
      customerPhone,
      customerName,
      customerDob,
      discount,
      items = [], // menu items
      retailItems = [], // retail items
    } = req.body;

    const restaurantId = req.user!.restaurantId;

    const invoice = await Invoice.findOne({ _id: id, restaurantId });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const order = await Order.findOne({ _id: invoice.orderId, restaurantId });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Restore old inventory
    for (const oldItem of order.items) {
      if ((oldItem as any).isRetailItem && (oldItem as any).retailItemId) {
        await RetailItem.findOneAndUpdate(
          { _id: (oldItem as any).retailItemId, restaurantId },
          { $inc: { stock: oldItem.quantity } }
        );
      }
    }

    // Set new order items
    order.items = [];
    
    // Process menu items
    const menuItemIds = items.map((i: any) => i.menuItemId).filter((id: any) => id && id.toString() !== '000000000000000000000000');
    const menuItemsDocs = menuItemIds.length > 0 ? await MenuItem.find({ _id: { $in: menuItemIds } }) : [];

    const enrichedItems = items.map((i: any) => {
      const mi = menuItemsDocs.find(m => m._id.toString() === i.menuItemId?.toString());
      const itemToSave = {
        _id: new mongoose.Types.ObjectId(),
        menuItemId: mongoose.Types.ObjectId.isValid(i.menuItemId) ? new mongoose.Types.ObjectId(i.menuItemId) : undefined,
        name: i.name,
        variantName: i.variantName,
        quantity: i.quantity,
        priceAtOrderTime: Number(i.priceAtOrderTime || 0),
        gstSlab: Number(i.gstSlab ?? mi?.gstSlab ?? 0),
        sentToKitchen: true,
        hindiName: mi?.hindiName
      };
      order.items.push(itemToSave as any);
      return itemToSave;
    });

    const menuLineItems = buildLineItems(enrichedItems as any);

    // Process retail items
    let retailLineItems: any[] = [];
    if (retailItems && retailItems.length > 0) {
      const retailIds = retailItems.map((r: any) => r._id || r.retailItemId);
      const retailDocs = await RetailItem.find({ _id: { $in: retailIds }, restaurantId });
      retailLineItems = retailItems.map((r: any) => {
        const doc = retailDocs.find((d: any) => d._id.toString() === (r._id || r.retailItemId));
        if (!doc) return null;
        const lineTotal = +(doc.priceINR * r.quantity).toFixed(2);
        
        order.items.push({
          _id: new mongoose.Types.ObjectId(),
          retailItemId: doc._id,
          isRetailItem: true,
          name: doc.name,
          quantity: r.quantity,
          priceAtOrderTime: doc.priceINR,
          gstSlab: doc.gstSlab,
          sentToKitchen: true
        } as any);

        return {
          name: doc.name,
          quantity: r.quantity,
          unitPrice: doc.priceINR,
          gstSlab: doc.gstSlab,
          lineTotal,
          hsnCode: '',
        };
      }).filter(Boolean);

      // Deduct stock for each retail item
      for (const r of retailItems) {
        await RetailItem.findOneAndUpdate(
          { _id: r._id || r.retailItemId, restaurantId },
          { $inc: { stock: -r.quantity } }
        );
      }
    }

    const allLineItems = [...menuLineItems, ...retailLineItems];
    const subtotal = +allLineItems.reduce((s: number, l: any) => s + l.lineTotal, 0).toFixed(2);

    let flatDiscount = 0;
    if (discount) {
      flatDiscount = discount.type === 'FLAT'
        ? discount.value
        : +(subtotal * discount.value / 100).toFixed(2);
    }

    const gstBreakup = computeGSTBreakup(allLineItems as any, flatDiscount);
    const totalGST = +gstBreakup.reduce((s, g) => s + g.cgst + g.sgst, 0).toFixed(2);
    const raw = subtotal - flatDiscount;
    const rounded = Math.round(raw);
    const roundOff = +(rounded - raw).toFixed(2);
    const grandTotal = rounded;

    const { english: totalInWords, hindi: totalInWordHindi } = amountInWords(grandTotal);

    // Update order totals
    order.totalAmountINR = subtotal; // wait, Order.totalAmountINR is usually sum of priceAtOrderTime * quantity
    if (customerPhone) {
      order.customerPhone = customerPhone;
      if (customerName) order.customerName = customerName;
    }
    await order.save();

    // Update invoice fields
    invoice.lineItems = allLineItems;
    invoice.subtotalINR = subtotal;
    invoice.gstBreakup = gstBreakup;
    invoice.totalGSTINR = totalGST;
    if (discount) {
      invoice.discount = { type: discount.type, value: discount.value, flatAmount: flatDiscount, approvedBy: discount.approvedBy };
    } else {
      invoice.discount = undefined;
    }
    invoice.roundOff = roundOff;
    invoice.grandTotalINR = grandTotal;
    invoice.payments = payments ?? [{ mode: paymentMode, amountINR: grandTotal }];
    invoice.paymentMode = paymentMode;
    invoice.amountPaidINR = amountPaidINR ?? grandTotal;
    invoice.changeINR = Math.max(0, (amountPaidINR ?? grandTotal) - grandTotal);
    invoice.totalInWords = totalInWords;
    invoice.totalInWordHindi = totalInWordHindi;
    if (customerPhone) {
      invoice.customerPhone = customerPhone;
      if (customerName) invoice.customerName = customerName;
    }

    await invoice.save();

    return res.json({ message: 'Invoice updated successfully', invoice });
  } catch (error: any) {
    console.error('updateInvoice error:', error);
    return res.status(500).json({ error: 'Server error while updating invoice' });
  }
};

export const resendWhatsApp = async (req: AuthRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const { customerPhone } = req.body;
    
    const order = await Order.findOne({ _id: orderId, restaurantId: req.user!.restaurantId });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    const invoice = await Invoice.findOne({ orderId: order._id });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    
    const phone = customerPhone || order.customerPhone;
    if (!phone) return res.status(400).json({ error: 'No phone number provided or saved for this order' });

    const CUSTOMER_APP_URL = process.env.CUSTOMER_APP_URL || 'https://customer.lfvs.in';
    const invoiceUrl = `${CUSTOMER_APP_URL}/invoice/${invoice._id}`;
    
    sendInvoiceWA(phone, invoiceUrl, invoice.invoiceNumber, {
      restaurantId: req.user!.restaurantId,
      branchId: order.branchId.toString(),
      customerName: order.customerName || undefined,
      amount: invoice.grandTotalINR,
      date: invoice.createdAt
    }).catch(err => console.error('[WhatsApp] Resend failed:', err));

    return res.json({ success: true, message: 'WhatsApp receipt sent' });
  } catch (err) {
    console.error('Error resending WhatsApp:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
