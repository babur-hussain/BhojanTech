import Anthropic from '@anthropic-ai/sdk';
import mongoose from 'mongoose';
import { Invoice } from '../models/Invoice';
import { Order } from '../models/Order';
import { InventoryItem } from '../models/InventoryItem';
import { StaffMember } from '../models/StaffMember';
import { Attendance } from '../models/Attendance';
import { MenuItem } from '../models/MenuItem';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const SYSTEM_PROMPT = `You are an expert restaurant management consultant for an Indian restaurant. You have deep knowledge of:
- Indian cuisine, ingredients, and cooking methods
- Indian GST regulations (CGST/SGST), GSTR-1, GSTR-3B filing
- Food cost management and Indian restaurant operations
- Local Indian festivals and their impact on business (Diwali, Holi, Navratri, Eid, Christmas, Durga Puja)
- Staff management, shift planning, and Indian labour practices
- Inventory management with Indian ingredients (spices, dal, paneer, masalas)
- Menu pricing strategies for Indian restaurants

You are given REAL-TIME DATA from the restaurant's management system. Use this data to give SPECIFIC, ACTIONABLE, and PRACTICAL advice — not generic tips. When referencing numbers, use exact figures from the data provided.

IMPORTANT RULES:
- When the user writes in Hindi (हिंदी), always respond in Hindi.
- Keep responses concise — restaurant owners are busy people.
- Use bullet points and short paragraphs.
- Always reference actual data figures when they're relevant.
- Format monetary values in Indian style: ₹1,00,000 not ₹100,000.`;

// ─── Fetch live restaurant context ───────────────────────────────────────────

export async function buildRestaurantContext(restaurantId: string): Promise<Record<string, any>> {
  const rid = new mongoose.Types.ObjectId(restaurantId);
  const todayStr = new Date().toISOString().slice(0, 10);

  const [y, m] = todayStr.split('-').map(Number);
  const monthStart = new Date(y, m - 1, 1);
  const monthEnd   = new Date(y, m, 0, 23, 59, 59);
  const todayStart = new Date(todayStr + 'T00:00:00.000Z');
  const todayEnd   = new Date(todayStr + 'T23:59:59.999Z');

  // Parallel fetch
  const [todayInvoices, monthInvoices, orders, lowStock, staff, todayAttendance] = await Promise.all([
    Invoice.find({ restaurantId: rid, createdAt: { $gte: todayStart, $lte: todayEnd } }),
    Invoice.find({ restaurantId: rid, createdAt: { $gte: monthStart, $lte: monthEnd } }),
    Order.find({ restaurantId: rid, status: 'OPEN' }).limit(10),
    InventoryItem.find({ restaurantId: rid, isActive: true })
      .then(items => items.filter(i => i.currentQty <= i.minThreshold)),
    StaffMember.find({ restaurantId: rid, isOnDuty: true, isActive: true }),
    Attendance.find({ restaurantId: rid, date: todayStr }),
  ]);

  // Top items today
  const itemSales: Record<string, { qty: number; rev: number }> = {};
  todayInvoices.forEach(inv => inv.lineItems.forEach(l => {
    const k = l.name; if (!itemSales[k]) itemSales[k] = { qty: 0, rev: 0 };
    itemSales[k].qty += l.quantity; itemSales[k].rev += l.lineTotal;
  }));
  const topItems = Object.entries(itemSales)
    .sort(([,a],[,b]) => b.rev - a.rev)
    .slice(0, 5)
    .map(([name, v]) => `${name}: ₹${v.rev.toFixed(0)} (${v.qty} orders)`);

  // GST totals this month
  const monthGST = {
    cgst: +monthInvoices.reduce((s, i) => s + i.gstBreakup.reduce((ss, g) => ss + g.cgst, 0), 0).toFixed(2),
    sgst: +monthInvoices.reduce((s, i) => s + i.gstBreakup.reduce((ss, g) => ss + g.sgst, 0), 0).toFixed(2),
    total: +monthInvoices.reduce((s, i) => s + i.totalGSTINR, 0).toFixed(2),
  };

  return {
    date:          todayStr,
    time:          new Date().toLocaleTimeString('en-IN'),
    todaySales: {
      revenue:    +todayInvoices.reduce((s, i) => s + i.grandTotalINR, 0).toFixed(2),
      orders:     todayInvoices.length,
      avgBill:    todayInvoices.length > 0
        ? +(todayInvoices.reduce((s,i) => s + i.grandTotalINR, 0) / todayInvoices.length).toFixed(2) : 0,
      cashSales:  +todayInvoices.filter(i => i.paymentMode === 'CASH').reduce((s,i) => s + i.grandTotalINR,0).toFixed(2),
      upiSales:   +todayInvoices.filter(i => i.paymentMode === 'UPI').reduce((s,i) => s + i.grandTotalINR,0).toFixed(2),
      cardSales:  +todayInvoices.filter(i => i.paymentMode === 'CARD').reduce((s,i) => s + i.grandTotalINR,0).toFixed(2),
    },
    topSellingItemsToday: topItems,
    activeOrders: orders.map(o => ({ tableNumber: o.tableNumber, status: o.status })),
    lowStockItems: lowStock.map(i => `${i.name}: ${i.currentQty} ${i.unit} (min: ${i.minThreshold})`),
    staffOnDuty:  staff.map(s => `${s.name} (${s.role}, ${s.currentShift || 'Unknown shift'})`),
    attendanceToday: { present: todayAttendance.filter(a => a.status === 'PRESENT').length, total: todayAttendance.length },
    monthlyGST:   monthGST,
    monthRevenue: +monthInvoices.reduce((s,i) => s + i.grandTotalINR, 0).toFixed(2),
  };
}

// ─── Stream chat to client ────────────────────────────────────────────────────

export async function streamChatResponse(
  messages: { role: 'user' | 'assistant'; content: string }[],
  context: Record<string, any>,
  onChunk: (text: string) => void,
  onDone: (totalTokens: number) => void,
) {
  const contextBlock = `\n\n---\nCURRENT RESTAURANT DATA (use this for your answer):\n${JSON.stringify(context, null, 2)}\n---\n`;

  // Inject context into the first user message
  const augmentedMessages = messages.map((msg, i) => ({
    role: msg.role,
    content: i === 0 && msg.role === 'user'
      ? contextBlock + '\n\nUser question: ' + msg.content
      : msg.content,
  }));

  let totalInputTokens = 0, totalOutputTokens = 0;

  const stream = await client.messages.stream({
    model:      'claude-opus-4-5',
    max_tokens: 1024,
    system:     SYSTEM_PROMPT,
    messages:   augmentedMessages as any,
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      onChunk(event.delta.text);
    }
    if (event.type === 'message_delta' && event.usage) {
      totalOutputTokens = event.usage.output_tokens;
    }
    if (event.type === 'message_start' && event.message.usage) {
      totalInputTokens = event.message.usage.input_tokens;
    }
  }

  onDone(totalInputTokens + totalOutputTokens);
}

// ─── Generate daily AI insights ──────────────────────────────────────────────

export async function generateDailyInsights(restaurantId: string, context: Record<string, any>): Promise<string> {
  const prompt = `Based on the restaurant data provided, generate exactly 3 specific, actionable insights for the restaurant owner. Each insight must be based on actual numbers from the data.

Format your response as a JSON array with this exact structure:
[
  { "type": "SALES|INVENTORY|STAFF|MENU|GENERAL", "title": "Short title (max 8 words)", "body": "Specific actionable insight with exact numbers", "priority": "HIGH|MEDIUM|LOW" },
  ...
]

Focus on: unusual patterns, opportunities, risks, and immediate actions needed.`;

  const response = await client.messages.create({
    model:      'claude-opus-4-5',
    max_tokens: 800,
    system:     SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `Restaurant data:\n${JSON.stringify(context, null, 2)}\n\n${prompt}`,
    }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '[]';
  // Extract JSON from response
  const match = text.match(/\[[\s\S]*\]/);
  return match ? match[0] : '[]';
}

// ─── Menu Intelligence ────────────────────────────────────────────────────────

export async function generateMenuSuggestions(restaurantId: string, context: Record<string, any>, ownerNote: string): Promise<string> {
  const stream = await client.messages.stream({
    model:      'claude-opus-4-5',
    max_tokens: 1200,
    system:     SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `Restaurant data:\n${JSON.stringify(context, null, 2)}\n\nOwner's note: ${ownerNote}\n\nPlease analyze our menu performance and provide:\n1. **Today's Special Suggestions** (based on available inventory)\n2. **Slow-Moving Items to Bundle** (combo deal recommendations with pricing)\n3. **Price Optimization** (items to reprice based on demand)\n4. **Festival Menu Ideas** (based on upcoming Indian festivals this month)\n\nBe specific with prices in ₹ and item names from our data.`,
    }],
  });

  let result = '';
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      result += event.delta.text;
    }
  }
  return result;
}
