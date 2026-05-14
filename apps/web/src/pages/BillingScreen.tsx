import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  GSTSlabBreakup, InvoiceLineItem, PaymentMode, PaymentSplit,
} from '@restaurant/types';
import {
  ArrowLeft, Printer, MessageSquare, CheckCircle,
  CreditCard, Smartphone, Banknote, Split,
  Tag, AlertTriangle, UserPlus, Search, Gift, Loader2
} from 'lucide-react';
import InvoicePrint from '../components/Billing/InvoicePrint';
import { api } from '../utils/api';
import PageLoader from '../components/PageLoader';
import { printReceipt, toWordsEN, type ReceiptData } from '../utils/thermalPrint';

interface BillPreview {
  order: any;
  lineItems: InvoiceLineItem[];
  subtotalINR: number;
  gstBreakup: GSTSlabBreakup[];
  totalGSTINR: number;
  grandTotalINR: number;
  roundOff: number;
}

export default function BillingScreen() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const receiptRef = React.useRef<HTMLDivElement>(null);

  const [preview, setPreview] = useState<BillPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
  const [paying, setPaying] = useState(false);
  const [whatsapp, setWhatsapp] = useState('');
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [restaurant, setRestaurant] = useState<any>(null);

  const [customerPhone, setCustomerPhone] = useState('');
  const [customer, setCustomer] = useState<any>(null);
  const [customerLoading, setCustLoading] = useState(false);
  const [redeemPoints, setRedeemPoints] = useState('');
  const [pointValue, setPointValue] = useState(0);
  const [tierDiscountPct, setTierDiscountPct] = useState(0);

  // Fetch bill preview from backend
  useEffect(() => {
    if (!orderId) return;
    (async () => {
      try {
        setLoading(true);
        const [prevRes, restRes] = await Promise.all([
          api.get(`/billing/preview/${orderId}`),
          api.get('/restaurant/info'),
        ]);
        setPreview(prevRes.data);
        setRestaurant(restRes.data);
      } catch (e: any) {
        setError(e?.response?.data?.error || 'Failed to load bill');
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId]);

  // Customer CRM lookup (live)
  const handleCustomerSearch = async () => {
    if (customerPhone.length < 10) return;
    try {
      setCustLoading(true);
      const res = await api.get(`/billing/customer/${customerPhone}`);
      if (res.data.found) {
        setCustomer(res.data.customer);
        setPointValue(res.data.pointsPerRupeeRedemption || 1);
        setTierDiscountPct(res.data.tierDiscountPercent || 0);
      } else {
        setCustomer(null);
      }
    } catch {
      setCustomer(null);
    } finally {
      setCustLoading(false);
    }
  };

  if (loading) {
    return <PageLoader message="Loading bill…" />;
  }
  if (error || !preview) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertTriangle size={48} className="text-red-400" />
        <p className="text-red-600 font-semibold">{error || 'Order not found'}</p>
        <button onClick={() => navigate(-1)} className="text-sm text-gray-500 underline">Go Back</button>
      </div>
    );
  }

  // Discount computation
  const pointsDiscount = customer && redeemPoints ? Math.min(Number(redeemPoints) / (pointValue || 1), preview.subtotalINR) : 0;
  const discountFlat = (() => {
    let dc = 0;
    if (discountVal) {
      dc = discountType === 'FLAT' ? Math.min(+discountVal, preview.subtotalINR) : +(preview.subtotalINR * Math.min(+discountVal, 100) / 100).toFixed(2);
    }
    return dc + pointsDiscount;
  })();
  const needsApproval = discountType === 'PERCENT' ? +discountVal > 10 : (discountFlat - pointsDiscount) / preview.subtotalINR > 0.10;
  const afterDiscount = +(preview.grandTotalINR - discountFlat).toFixed(2);
  const finalTotal = Math.max(0, Math.round(afterDiscount));
  const roundOff = +(finalTotal - afterDiscount).toFixed(2);
  const change = paymentMode === 'CASH' && cashReceived ? Math.max(0, +cashReceived - finalTotal) : 0;

  // Split helpers
  const addSplit = () => setSplits(s => [...s, { mode: 'CASH', amountINR: 0 }]);
  const updateSplit = (i: number, field: keyof PaymentSplit, val: any) =>
    setSplits(s => s.map((sp, idx) => idx === i ? { ...sp, [field]: val } : sp));
  const removeSplit = (i: number) => setSplits(s => s.filter((_, idx) => idx !== i));
  const splitsTotal = splits.reduce((s, sp) => s + (+sp.amountINR || 0), 0);

  // Pay — live API call
  const handlePay = async () => {
    try {
      setPaying(true);
      const body: any = {
        orderId,
        paymentMode,
        amountPaidINR: paymentMode === 'CASH' ? +cashReceived || finalTotal : finalTotal,
        payments: paymentMode === 'SPLIT' ? splits : [{ mode: paymentMode, amountINR: finalTotal }],
      };
      if (discountFlat > pointsDiscount && discountVal) {
        body.discount = { type: discountType, value: +discountVal, approvedBy: approver || undefined };
      }
      if (customerPhone) { body.customerPhone = customerPhone; body.customerName = customer?.name; }
      if (redeemPoints && +redeemPoints > 0) body.redeemPoints = +redeemPoints;
      if (whatsapp) body.whatsappNumber = whatsapp;

      const res = await api.post('/billing/pay', body);
      setInvoiceData(res.data.invoice);
      setPaid(true);
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  if (paid) {
    return (
      <div className="h-[calc(100vh-80px)] overflow-y-auto bg-gray-50 flex flex-col items-center py-8 -m-4 p-4">
        <div className="flex flex-col items-center mb-8">
          <CheckCircle size={64} className="text-green-500 mb-2" />
          <h2 className="text-2xl font-black text-gray-800">Payment Received!</h2>
          <p className="text-gray-500 mt-1">Invoice {invoiceData?.invoiceNumber || ''} — Table {preview.order.tableNumber} cleared.</p>
          <div className="flex gap-4 mt-6">
            <button
              onClick={() => {
                const now = new Date();
                const printerName = restaurant?.printerName || localStorage.getItem('qz_receipt_printer') || '';
                const receiptData: ReceiptData = {
                  restaurantName: restaurant?.name || '',
                  address: restaurant?.address || '',
                  gstin: restaurant?.gstin || '',
                  fssai: restaurant?.fssaiNumber || '',
                  upiId: restaurant?.upiId || '',
                  invoiceNumber: invoiceData?.invoiceNumber || '',
                  tableNumber: preview.order.tableNumber || 'Takeaway',
                  waiterName: preview.order.waiterName || 'Staff',
                  paymentMode: paymentMode,
                  date: now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
                  time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                  items: (invoiceData?.lineItems || preview.lineItems || []).map((li: any) => ({
                    name: li.name,
                    variantName: li.variantName,
                    quantity: li.quantity,
                    unitPrice: li.unitPrice,
                    lineTotal: li.lineTotal,
                    gstSlab: li.gstSlab,
                  })),
                  subtotal: invoiceData?.subtotalINR ?? preview.subtotalINR,
                  discountFlat: discountFlat,
                  roundOff: roundOff,
                  grandTotal: invoiceData?.grandTotalINR ?? finalTotal,
                  gstBreakup: invoiceData?.gstBreakup ?? preview.gstBreakup ?? [],
                  totalGST: (invoiceData?.gstBreakup ?? preview.gstBreakup ?? []).reduce(
                    (s: number, g: any) => s + (g.cgst ?? 0) + (g.sgst ?? 0), 0
                  ),
                  amountInWords: toWordsEN(invoiceData?.grandTotalINR ?? finalTotal),
                };
                printReceipt({
                  receiptData,
                  receiptContainerRef: receiptRef.current,
                  printerName,
                });
              }}
              className="flex items-center gap-2 px-8 py-3 bg-maroon text-white rounded-xl font-bold shadow-lg hover:bg-opacity-90 transition-transform active:scale-95"
            >
              <Printer size={20} /> Print Receipt
            </button>
            <button onClick={() => navigate('/tables')} className="px-8 py-3 border-2 border-gray-300 rounded-xl font-bold text-gray-700 bg-white shadow-sm hover:bg-gray-50 transition-transform active:scale-95">
              Back to Tables
            </button>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-4 bg-gradient-to-b from-gray-200/50 to-transparent blur-xl -z-10 rounded-full"></div>
          <div ref={receiptRef}>
            <InvoicePrint
              preview={preview}
              finalTotal={invoiceData?.grandTotalINR || finalTotal}
              discountFlat={discountFlat}
              roundOff={roundOff}
              paymentMode={paymentMode}
              invoiceNumber={invoiceData?.invoiceNumber || ''}
              restaurant={{
                name: restaurant?.name || '',
                address: restaurant?.address || '',
                gstin: restaurant?.gstin || '',
                fssai: restaurant?.fssaiNumber || '',
                upiId: restaurant?.upiId || '',
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-maroon text-white px-6 py-4 flex items-center gap-4 shadow">
        <button onClick={() => navigate(-1)} className="hover:bg-white hover:bg-opacity-20 p-1 rounded"><ArrowLeft size={22} /></button>
        <h1 className="text-xl font-bold flex-1">Bill — Table {preview.order.tableNumber}</h1>
        <span className="text-sm bg-white bg-opacity-20 px-3 py-1 rounded">{preview.order.waiterName}</span>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-0 max-w-6xl mx-auto w-full p-4 gap-4">
        {/* Left: Order & GST */}
        <div className="flex-1 space-y-4">
          {/* Line Items */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b"><h2 className="font-bold text-gray-700">Order Items</h2></div>
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
                        {item.variantName && item.variantName !== 'Regular' && <span className="text-gray-400 text-xs ml-1">({item.variantName})</span>}
                      </p>
                      {item.hindiName && <p className="text-xs text-gray-400">{item.hindiName}</p>}
                    </td>
                    <td className="px-4 py-3 text-center">{item.quantity}</td>
                    <td className="px-4 py-3 text-right">₹{item.unitPrice}</td>
                    <td className="px-4 py-3 text-right"><span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-xs font-medium">{item.gstSlab}%</span></td>
                    <td className="px-4 py-3 text-right font-semibold">₹{item.lineTotal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* GST Breakup */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b"><h2 className="font-bold text-gray-700">GST Breakup (HSN: 9963)</h2></div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b text-gray-500 text-xs uppercase tracking-wide">
                <tr><th className="px-4 py-2 text-left">Slab</th><th className="px-4 py-2 text-right">Taxable Amt</th><th className="px-4 py-2 text-right">CGST (½)</th><th className="px-4 py-2 text-right">SGST (½)</th><th className="px-4 py-2 text-right">Total GST</th></tr>
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
                <tr><td className="px-4 py-2 font-bold" colSpan={4}>Total GST</td><td className="px-4 py-2 text-right font-bold text-maroon">₹{preview.totalGSTINR.toFixed(2)}</td></tr>
              </tfoot>
            </table>
          </div>

          {/* Discount */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <button onClick={() => setShowDc(d => !d)} className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-maroon">
              <Tag size={16} /> {showDiscount ? 'Remove Discount' : 'Apply Discount'}
            </button>
            {showDiscount && (
              <div className="mt-4 space-y-3">
                <div className="flex gap-3">
                  <select value={discountType} onChange={e => setDcType(e.target.value as any)} className="border rounded px-3 py-2 text-sm">
                    <option value="PERCENT">% Percentage</option><option value="FLAT">₹ Flat Amount</option>
                  </select>
                  <input type="number" min="0" value={discountVal} onChange={e => setDcVal(e.target.value)}
                    placeholder={discountType === 'PERCENT' ? '0–100%' : 'Amount in ₹'} className="flex-1 border rounded px-3 py-2 text-sm" />
                </div>
                {discountVal && <div className="flex items-center gap-2 text-green-700 text-sm bg-green-50 rounded px-3 py-2"><CheckCircle size={14} /> Discount: ₹{discountFlat.toFixed(2)}</div>}
                {needsApproval && (
                  <div className="border border-yellow-300 bg-yellow-50 rounded p-3">
                    <div className="flex items-center gap-2 text-yellow-800 text-sm font-medium mb-2"><AlertTriangle size={14} /> Discount &gt;10% requires Manager approval</div>
                    <input type="text" placeholder="Manager name / approval code" value={approver} onChange={e => setApprover(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Payment Panel */}
        <div className="w-full lg:w-96 space-y-4">
          {/* Customer CRM Lookup */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden p-4 space-y-3">
            <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2"><UserPlus size={16} /> Customer</h3>
            {!customer ? (
              <div className="flex gap-2">
                <input type="tel" placeholder="Phone Number" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCustomerSearch()}
                  className="flex-1 border rounded-lg px-3 py-2 text-sm" />
                <button onClick={handleCustomerSearch} disabled={customerLoading} className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200">
                  {customerLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-start bg-gray-50 border border-gray-100 p-3 rounded-lg">
                  <div><p className="font-bold text-gray-900">{customer.name}</p><p className="text-xs text-gray-500">{customer.phone}</p></div>
                  <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded-full">{customer.tier}</span>
                </div>
                <div className="bg-maroon bg-opacity-5 p-3 rounded-lg border border-maroon border-opacity-20 text-maroon">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-sm font-semibold flex items-center gap-1"><Gift size={14} /> Loyalty Points</p>
                    <p className="font-bold">{customer.loyaltyPoints?.toLocaleString() || 0}</p>
                  </div>
                  <p className="text-xs text-opacity-80 mb-2">Value: ₹{((customer.loyaltyPoints || 0) / (pointValue || 1)).toFixed(2)}</p>
                  <div className="flex gap-2">
                    <input type="number" placeholder="Pts to redeem" value={redeemPoints} onChange={e => setRedeemPoints(e.target.value)}
                      className="w-24 text-sm border-maroon border-opacity-30 rounded px-2 py-1 bg-white" max={customer.loyaltyPoints} />
                    <button onClick={() => setRedeemPoints(String(customer.loyaltyPoints || 0))} className="text-xs font-bold bg-maroon text-white px-2 py-1 rounded hover:bg-opacity-90">MAX</button>
                    <button onClick={() => { setCustomer(null); setCustomerPhone(''); setRedeemPoints(''); }} className="text-xs ml-auto text-maroon hover:underline">Change</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-maroon text-white px-4 py-3"><h2 className="font-bold">Bill Summary</h2></div>
            <div className="p-4 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600"><span>Sub-total (incl. GST)</span><span>₹{preview.subtotalINR.toFixed(2)}</span></div>
              {discountFlat > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>−₹{discountFlat.toFixed(2)}</span></div>}
              <div className="flex justify-between text-gray-400 text-xs"><span>Round-off</span><span>{roundOff >= 0 ? '+' : ''}₹{roundOff.toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-xl text-maroon border-t pt-3 mt-2"><span>Total</span><span>₹{finalTotal}</span></div>
              <p className="text-xs text-gray-400 italic">
                ({discountFlat > 0 ? `After ₹${discountFlat} discount · ` : ''}
                CGST ₹{preview.gstBreakup.reduce((s, g) => s + g.cgst, 0).toFixed(2)} + SGST ₹{preview.gstBreakup.reduce((s, g) => s + g.sgst, 0).toFixed(2)})
              </p>
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
                <button key={mode} onClick={() => setMode(mode)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 font-semibold text-sm transition-all ${paymentMode === mode ? 'border-maroon bg-red-50 text-maroon' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
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
                <input type="number" value={cashReceived} onChange={e => setCash(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 border rounded-lg text-xl font-bold" placeholder={String(finalTotal)} />
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
              <p className="text-sm text-gray-500">Collect ₹{finalTotal} via UPI</p>
              <input type="text" placeholder="UPI Transaction ID (optional)" value={upiRef} onChange={e => setUpiRef(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
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
                  <select value={sp.mode} onChange={e => updateSplit(i, 'mode', e.target.value)} className="border rounded px-2 py-2 text-sm">
                    <option value="CASH">Cash</option><option value="CARD">Card</option><option value="UPI">UPI</option>
                  </select>
                  <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-2 flex items-center text-gray-500 text-sm">₹</span>
                    <input type="number" value={sp.amountINR || ''} onChange={e => updateSplit(i, 'amountINR', +e.target.value)} className="w-full pl-6 border rounded px-2 py-2 text-sm" />
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
              <input type="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} maxLength={10} placeholder="9876543210"
                className="flex-1 border rounded-r px-3 py-2 text-sm" />
            </div>
          </div>

          {/* Collect Button */}
          <button onClick={handlePay} disabled={
            paying ||
            (paymentMode === 'CASH' && (!cashReceived || +cashReceived < finalTotal)) ||
            (paymentMode === 'SPLIT' && splitsTotal !== finalTotal) ||
            (needsApproval && !approver.trim())
          }
            className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-black text-xl rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {paying ? <Loader2 size={22} className="animate-spin" /> : null}
            {paying ? 'Processing…' : `COLLECT ₹${finalTotal}`}
          </button>
        </div>
      </div>
    </div>
  );
}
