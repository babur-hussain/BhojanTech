import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  GSTSlabBreakup, InvoiceLineItem, PaymentMode,
  DiscountDetails, PaymentSplit,
} from '@restaurant/types';
import {
  ArrowLeft, Printer, MessageSquare, CheckCircle,
  CreditCard, Smartphone, Banknote, Split,
  Tag, AlertTriangle, UserPlus, Search, Gift
} from 'lucide-react';
import InvoicePrint from '../components/Billing/InvoicePrint';

// ─── Types ────────────────────────────────────────────────────────────────────
interface BillPreview {
  order: { tableNumber: string; waiterName: string; id: string };
  lineItems: InvoiceLineItem[];
  subtotalINR: number;
  gstBreakup: GSTSlabBreakup[];
  totalGSTINR: number;
  grandTotalINR: number;
  roundOff: number;
}

// ─── Mock preview (replace with: fetch(`/api/billing/preview/${orderId}`)) ───
const MOCK_PREVIEW: BillPreview = {
  order: { tableNumber: '12', waiterName: 'Rahul', id: 'ord1' },
  lineItems: [
    { name: 'Paneer Tikka', hindiName: 'पनीर टिक्का', variantName: 'Half', quantity: 2, unitPrice: 150, gstSlab: 5, lineTotal: 300, hsnCode: '9963' },
    { name: 'Butter Chicken', hindiName: 'बटर चिकन', variantName: 'Full', quantity: 1, unitPrice: 600, gstSlab: 5, lineTotal: 600, hsnCode: '9963' },
    { name: 'Mango Lassi', variantName: 'Regular', quantity: 2, unitPrice: 120, gstSlab: 12, lineTotal: 240, hsnCode: '9963' },
  ],
  subtotalINR: 1140,
  gstBreakup: [
    { slab: 5, taxableAmount: 857.14, cgst: 21.43, sgst: 21.43, total: 900 },
    { slab: 12, taxableAmount: 214.29, cgst: 12.86, sgst: 12.86, total: 240 },
  ],
  totalGSTINR: 68.58,
  grandTotalINR: 1140,
  roundOff: 0,
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function BillingScreen() {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [preview, setPreview] = useState<BillPreview>(MOCK_PREVIEW);
  const [paymentMode, setMode] = useState<PaymentMode>('CASH');
  const [cashReceived, setCash] = useState('');
  const [upiRef, setUpiRef] = useState('');
  const [splits, setSplits] = useState<PaymentSplit[]>([]);
  const [discountType, setDcType] = useState<'FLAT' | 'PERCENT'>('PERCENT');
  const [discountVal, setDcVal] = useState('');
  const [approver, setApprover] = useState('');
  const [showDiscount, setShowDc] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [paid, setPaid] = useState(false);
  const [whatsapp, setWhatsapp] = useState('');

  const [customerPhone, setCustomerPhone] = useState('');
  const [customer, setCustomer] = useState<{ name: string, tier: string, loyaltyPoints: number, pointValue: number } | null>(null);
  const [redeemPoints, setRedeemPoints] = useState('');

  const handleCustomerSearch = () => {
    if (customerPhone.length >= 10) {
      // Mock API call to fetch customer by phone
      setCustomer({ name: 'Rahul Sharma', tier: 'GOLD', loyaltyPoints: 450, pointValue: 0.5 });
    } else {
      setCustomer(null);
    }
  };

  // ── Discount computation ─────────────────────────────────────────────────
  const pointsDiscount = customer && redeemPoints ? Math.min(Number(redeemPoints) * customer.pointValue, preview.subtotalINR) : 0;

  const discountFlat = (() => {
    let dc = 0;
    if (discountVal) {
      dc = discountType === 'FLAT' ? Math.min(+discountVal, preview.subtotalINR) : +(preview.subtotalINR * Math.min(+discountVal, 100) / 100).toFixed(2);
    }
    return dc + pointsDiscount;
  })();

  const needsApproval = discountType === 'PERCENT'
    ? +discountVal > 10
    : (discountFlat - pointsDiscount) / preview.subtotalINR > 0.10;

  const afterDiscount = +(preview.grandTotalINR - discountFlat).toFixed(2);
  const finalTotal = Math.max(0, Math.round(afterDiscount));
  const roundOff = +(finalTotal - afterDiscount).toFixed(2);
  const change = paymentMode === 'CASH' && cashReceived
    ? Math.max(0, +cashReceived - finalTotal) : 0;

  // ── Split helpers ────────────────────────────────────────────────────────
  const addSplit = () => setSplits(s => [...s, { mode: 'CASH', amountINR: 0 }]);
  const updateSplit = (i: number, field: keyof PaymentSplit, val: any) =>
    setSplits(s => s.map((sp, idx) => idx === i ? { ...sp, [field]: val } : sp));
  const removeSplit = (i: number) => setSplits(s => s.filter((_, idx) => idx !== i));
  const splitsTotal = splits.reduce((s, sp) => s + (+sp.amountINR || 0), 0);

  // ── Pay ──────────────────────────────────────────────────────────────────
  const handlePay = async () => {
    // Real: POST /api/billing/pay { orderId, paymentMode, discount, payments, … }
    setPaid(true);
  };

  if (paid) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-6 p-8">
        <CheckCircle size={72} className="text-green-500" />
        <h2 className="text-3xl font-bold text-gray-800">Payment Received!</h2>
        <p className="text-gray-600">Invoice generated — Table 12 is now available.</p>
        <div className="flex gap-4">
          <button
            onClick={() => setShowPrint(true)}
            className="flex items-center gap-2 px-6 py-3 bg-maroon text-white rounded-lg font-semibold hover:bg-opacity-90"
          >
            <Printer size={20} /> Print Receipt
          </button>
          <button
            onClick={() => navigate('/tables')}
            className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-100"
          >
            Back to Tables
          </button>
        </div>

        {showPrint && (
          <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-sm w-full max-h-screen overflow-y-auto">
              <div className="flex justify-between items-center p-4 border-b">
                <h3 className="font-bold">Invoice Preview</h3>
                <div className="flex gap-2">
                  <button onClick={() => window.print()} className="px-4 py-2 bg-maroon text-white rounded text-sm font-semibold">Print</button>
                  <button onClick={() => setShowPrint(false)} className="px-4 py-2 bg-gray-200 rounded text-sm">Close</button>
                </div>
              </div>
              <InvoicePrint
                preview={preview}
                finalTotal={finalTotal}
                discountFlat={discountFlat}
                roundOff={roundOff}
                paymentMode={paymentMode}
                invoiceNumber="INV-20260421-0001"
                restaurant={{
                  name: 'Saffron Palace Restaurant',
                  address: '12/A, Connaught Place, New Delhi — 110001',
                  gstin: '07AABCU9603R1ZN',
                  fssai: '11316040000016',
                }}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-maroon text-white px-6 py-4 flex items-center gap-4 shadow">
        <button onClick={() => navigate(-1)} className="hover:bg-white hover:bg-opacity-20 p-1 rounded">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-xl font-bold flex-1">
          Bill — Table {preview.order.tableNumber}
        </h1>
        <span className="text-sm bg-white bg-opacity-20 px-3 py-1 rounded">
          {preview.order.waiterName}
        </span>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-0 max-w-6xl mx-auto w-full p-4 gap-4">

        {/* ── Left: Order & GST Summary ──────────────────────────────────── */}
        <div className="flex-1 space-y-4">

          {/* Line Items */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b">
              <h2 className="font-bold text-gray-700">Order Items</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-2 text-left">Item</th>
                  <th className="px-4 py-2 text-center">Qty</th>
                  <th className="px-4 py-2 text-right">Rate</th>
                  <th className="px-4 py-2 text-right">GST%</th>
                  <th className="px-4 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {preview.lineItems.map((item, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{item.name}
                        {item.variantName && item.variantName !== 'Regular' && (
                          <span className="text-gray-400 text-xs ml-1">({item.variantName})</span>
                        )}
                      </p>
                      {item.hindiName && <p className="text-xs text-gray-400">{item.hindiName}</p>}
                    </td>
                    <td className="px-4 py-3 text-center">{item.quantity}</td>
                    <td className="px-4 py-3 text-right">₹{item.unitPrice}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-xs font-medium">
                        {item.gstSlab}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">₹{item.lineTotal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* GST Breakup Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b">
              <h2 className="font-bold text-gray-700">GST Breakup (HSN: 9963)</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-2 text-left">Slab</th>
                  <th className="px-4 py-2 text-right">Taxable Amt</th>
                  <th className="px-4 py-2 text-right">CGST (½)</th>
                  <th className="px-4 py-2 text-right">SGST (½)</th>
                  <th className="px-4 py-2 text-right">Total GST</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {preview.gstBreakup.map((g, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3 font-medium">@{g.slab}%</td>
                    <td className="px-4 py-3 text-right">₹{g.taxableAmount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-blue-600">₹{g.cgst.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-purple-600">₹{g.sgst.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-semibold">₹{(g.cgst + g.sgst).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t">
                <tr>
                  <td className="px-4 py-2 font-bold" colSpan={4}>Total GST</td>
                  <td className="px-4 py-2 text-right font-bold text-maroon">₹{preview.totalGSTINR.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Discount */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <button
              onClick={() => setShowDc(d => !d)}
              className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-maroon"
            >
              <Tag size={16} /> {showDiscount ? 'Remove Discount' : 'Apply Discount'}
            </button>

            {showDiscount && (
              <div className="mt-4 space-y-3">
                <div className="flex gap-3">
                  <select
                    value={discountType}
                    onChange={e => setDcType(e.target.value as any)}
                    className="border rounded px-3 py-2 text-sm focus:ring-saffron focus:border-saffron"
                  >
                    <option value="PERCENT">% Percentage</option>
                    <option value="FLAT">₹ Flat Amount</option>
                  </select>
                  <input
                    type="number"
                    min="0"
                    value={discountVal}
                    onChange={e => setDcVal(e.target.value)}
                    placeholder={discountType === 'PERCENT' ? '0–100%' : 'Amount in ₹'}
                    className="flex-1 border rounded px-3 py-2 text-sm focus:ring-saffron focus:border-saffron"
                  />
                </div>

                {discountVal && (
                  <div className="flex items-center gap-2 text-green-700 text-sm bg-green-50 rounded px-3 py-2">
                    <CheckCircle size={14} />
                    Discount: ₹{discountFlat.toFixed(2)}
                  </div>
                )}

                {needsApproval && (
                  <div className="border border-yellow-300 bg-yellow-50 rounded p-3">
                    <div className="flex items-center gap-2 text-yellow-800 text-sm font-medium mb-2">
                      <AlertTriangle size={14} /> Discount &gt;10% requires Manager approval
                    </div>
                    <input
                      type="text"
                      placeholder="Manager name / approval code"
                      value={approver}
                      onChange={e => setApprover(e.target.value)}
                      className="w-full border rounded px-3 py-2 text-sm"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Payment Panel ───────────────────────────────────────── */}
        <div className="w-full lg:w-96 space-y-4">

          {/* Customer CRM Lookup */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 space-y-3">
              <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2"><UserPlus size={16} /> Customer</h3>
              {!customer ? (
                <div className="flex gap-2">
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    className="flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-saffron"
                  />
                  <button onClick={handleCustomerSearch} className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200">
                    <Search size={16} />
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-start bg-gray-50 border border-gray-100 p-3 rounded-lg">
                    <div>
                      <p className="font-bold text-gray-900">{customer.name}</p>
                      <p className="text-xs text-gray-500">{customerPhone}</p>
                    </div>
                    <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded-full">{customer.tier}</span>
                  </div>
                  <div className="bg-maroon bg-opacity-5 p-3 rounded-lg border border-maroon border-opacity-20 text-maroon">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-sm font-semibold flex items-center gap-1"><Gift size={14} /> Loyalty Points</p>
                      <p className="font-bold">{customer.loyaltyPoints.toLocaleString()}</p>
                    </div>
                    <p className="text-xs text-opacity-80 mb-2">Value: ₹{(customer.loyaltyPoints * customer.pointValue).toFixed(2)}</p>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Pts to redeem"
                        value={redeemPoints}
                        onChange={e => setRedeemPoints(e.target.value)}
                        className="w-24 text-sm border-maroon border-opacity-30 rounded px-2 py-1 bg-white focus:ring-saffron"
                        max={customer.loyaltyPoints}
                      />
                      <button
                        onClick={() => setRedeemPoints(String(customer.loyaltyPoints))}
                        className="text-xs font-bold bg-maroon text-white px-2 py-1 rounded hover:bg-opacity-90"
                      >MAX</button>
                      <button onClick={() => { setCustomer(null); setCustomerPhone(''); setRedeemPoints(''); }} className="text-xs ml-auto text-maroon hover:underline">Change</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Totals */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-maroon text-white px-4 py-3">
              <h2 className="font-bold">Bill Summary</h2>
            </div>
            <div className="p-4 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Sub-total (incl. GST)</span>
                <span>₹{preview.subtotalINR.toFixed(2)}</span>
              </div>
              {discountFlat > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>−₹{discountFlat.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-400 text-xs">
                <span>Round-off</span>
                <span>{roundOff >= 0 ? '+' : ''}₹{roundOff.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-xl text-maroon border-t pt-3 mt-2">
                <span>Total</span>
                <span>₹{finalTotal}</span>
              </div>
              <p className="text-xs text-gray-400 italic">({discountFlat > 0
                ? `After ₹${discountFlat} discount · ` : ''}
                CGST ₹{preview.gstBreakup.reduce((s, g) => s + g.cgst, 0).toFixed(2)} + SGST ₹{preview.gstBreakup.reduce((s, g) => s + g.sgst, 0).toFixed(2)})</p>
            </div>
          </div>

          {/* Payment Mode Selector */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h2 className="font-bold text-gray-700 mb-3">Payment Method</h2>
            <div className="grid grid-cols-2 gap-2">
              {([
                { mode: 'CASH', label: 'Cash', Icon: Banknote },
                { mode: 'CARD', label: 'Card', Icon: CreditCard },
                { mode: 'UPI', label: 'UPI', Icon: Smartphone },
                { mode: 'SPLIT', label: 'Split', Icon: Split },
              ] as const).map(({ mode, label, Icon }) => (
                <button
                  key={mode}
                  onClick={() => setMode(mode)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 font-semibold text-sm transition-all ${paymentMode === mode
                      ? 'border-maroon bg-red-50 text-maroon'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                >
                  <Icon size={18} /> {label}
                </button>
              ))}
            </div>
          </div>

          {/* Mode-specific fields */}
          {paymentMode === 'CASH' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
              <label className="block text-sm font-medium text-gray-700">Amount Received (₹)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-gray-500">₹</span>
                <input
                  type="number"
                  value={cashReceived}
                  onChange={e => setCash(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 border rounded-lg text-xl font-bold focus:ring-saffron focus:border-saffron"
                  placeholder={String(finalTotal)}
                />
              </div>
              {cashReceived && +cashReceived >= finalTotal && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                  <span className="text-green-700 font-bold text-lg">Change: ₹{change.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          {paymentMode === 'UPI' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center space-y-3">
              {/* In real app, show Razorpay QR here */}
              <div className="w-40 h-40 bg-gray-100 rounded mx-auto flex items-center justify-center border-2 border-dashed border-gray-300">
                <span className="text-xs text-gray-400 text-center">Razorpay<br />QR Code<br />Here</span>
              </div>
              <p className="text-sm text-gray-500">Scan to pay ₹{finalTotal}</p>
              <input
                type="text"
                placeholder="UPI Transaction ID (optional)"
                value={upiRef}
                onChange={e => setUpiRef(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
          )}

          {paymentMode === 'CARD' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center space-y-2">
              <CreditCard size={48} className="text-gray-300 mx-auto" />
              <p className="text-sm text-gray-500">Swipe / insert card for ₹{finalTotal}</p>
              <p className="text-xs text-gray-400">Mark as paid after terminal approval</p>
            </div>
          )}

          {paymentMode === 'SPLIT' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
              <h3 className="font-semibold text-gray-700 text-sm">Split Payment</h3>
              {splits.map((sp, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <select
                    value={sp.mode}
                    onChange={e => updateSplit(i, 'mode', e.target.value)}
                    className="border rounded px-2 py-2 text-sm"
                  >
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card</option>
                    <option value="UPI">UPI</option>
                  </select>
                  <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-2 flex items-center text-gray-500 text-sm">₹</span>
                    <input
                      type="number"
                      value={sp.amountINR || ''}
                      onChange={e => updateSplit(i, 'amountINR', +e.target.value)}
                      className="w-full pl-6 border rounded px-2 py-2 text-sm"
                    />
                  </div>
                  <button onClick={() => removeSplit(i)} className="text-red-400 hover:text-red-600">✕</button>
                </div>
              ))}
              <button onClick={addSplit} className="text-sm text-saffron hover:underline">+ Add payment</button>
              <div className={`text-sm font-semibold text-right ${splitsTotal === finalTotal ? 'text-green-600' : 'text-red-500'}`}>
                Collected: ₹{splitsTotal} / ₹{finalTotal}
              </div>
            </div>
          )}

          {/* WhatsApp */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <MessageSquare size={16} className="text-green-600" /> WhatsApp Receipt (optional)
            </label>
            <div className="flex gap-2">
              <span className="bg-gray-100 border border-r-0 rounded-l px-3 py-2 text-sm text-gray-500">+91</span>
              <input
                type="tel"
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
                maxLength={10}
                placeholder="9876543210"
                className="flex-1 border rounded-r px-3 py-2 text-sm focus:ring-saffron focus:border-saffron"
              />
            </div>
          </div>

          {/* Collect Button */}
          <button
            onClick={handlePay}
            disabled={
              (paymentMode === 'CASH' && (!cashReceived || +cashReceived < finalTotal)) ||
              (paymentMode === 'SPLIT' && splitsTotal !== finalTotal) ||
              (needsApproval && !approver.trim())
            }
            className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-black text-xl rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            COLLECT ₹{finalTotal}
          </button>
        </div>
      </div>
    </div>
  );
}
