import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft, CheckCircle } from 'lucide-react';
import { api } from '../utils/api';
import PageLoader from '../components/PageLoader';
import InvoicePrint from '../components/Billing/InvoicePrint';
import { printReceipt, toWordsEN, type ReceiptData } from '../utils/thermalPrint';

export default function InvoiceScreen() {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const receiptRef = useRef<HTMLDivElement>(null);

  const [invoice, setInvoice] = useState<any>(null);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!invoiceId) return;
    (async () => {
      try {
        const [invRes, restRes] = await Promise.all([
          api.get(`/billing/invoice/${invoiceId}`), // We need to add this endpoint if it doesn't exist!
          api.get('/restaurant/info'),
        ]);
        setInvoice(invRes.data.invoice || invRes.data);
        setRestaurant(restRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [invoiceId]);

  if (loading) return <PageLoader message="Loading Invoice..." />;
  if (!invoice) return <div className="p-8 text-center text-red-500 font-bold">Invoice not found!</div>;

  const handlePrint = async () => {
    const now = new Date(invoice.createdAt || Date.now());
    const printerName = restaurant?.printerName || localStorage.getItem('qz_receipt_printer') || '';
    const receiptData: ReceiptData = {
      restaurantName: restaurant?.name || '',
      address: restaurant?.address || '',
      contactNumber: restaurant?.contactNumber || '',
      gstin: restaurant?.gstin || '',
      fssai: restaurant?.fssaiNumber || '',
      upiId: restaurant?.upiId || '',
      invoiceNumber: invoice.invoiceNumber,
      tableNumber: invoice.tableNumber || 'Takeaway',
      waiterName: invoice.waiterName || 'Staff',
      paymentMode: invoice.paymentMode || 'CASH',
      date: now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      items: (invoice.lineItems || []).map((li: any) => ({
        name: li.name,
        variantName: li.variantName,
        quantity: li.quantity,
        unitPrice: li.unitPrice,
        lineTotal: li.lineTotal,
        gstSlab: li.gstSlab,
      })),
      subtotal: invoice.subtotalINR,
      discountFlat: invoice.discount?.flatAmount || 0,
      roundOff: invoice.roundOff || 0,
      grandTotal: invoice.grandTotalINR,
      gstBreakup: invoice.gstBreakup || [],
      totalGST: invoice.totalGSTINR || 0,
      amountInWords: invoice.totalInWords || toWordsEN(invoice.grandTotalINR),
    };
    try {
      await printReceipt({
        receiptData,
        receiptContainerRef: receiptRef.current,
        printerName,
      });
    } catch (err: any) {
      console.error('Print error:', err);
      alert(err.message || 'Failed to print receipt.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-8 px-4">
      <div className="flex flex-col items-center mb-8">
        <CheckCircle size={64} className="text-green-500 mb-2" />
        <h2 className="text-2xl font-black text-gray-800">Invoice Generated!</h2>
        <p className="text-gray-500 mt-1">Invoice {invoice.invoiceNumber} — Table {invoice.tableNumber || 'Takeaway'} cleared.</p>
        <div className="flex gap-4 mt-6">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-8 py-3 bg-maroon text-white rounded-xl font-bold shadow-lg hover:bg-opacity-90 transition-transform active:scale-95"
          >
            <Printer size={20} /> Print Receipt
          </button>
          <button 
            onClick={() => navigate(`/pos?edit=${invoice._id}`)} 
            className="px-8 py-3 border-2 border-orange-300 text-orange-600 rounded-xl font-bold bg-white shadow-sm hover:bg-orange-50 transition-transform active:scale-95"
          >
            Edit Invoice
          </button>
          <button onClick={() => navigate(-1)} className="px-8 py-3 border-2 border-gray-300 rounded-xl font-bold text-gray-700 bg-white shadow-sm hover:bg-gray-50 transition-transform active:scale-95">
            Close
          </button>
        </div>
      </div>

      <div className="relative">
        <div className="absolute -inset-4 bg-gradient-to-b from-gray-200/50 to-transparent blur-xl -z-10 rounded-full"></div>
        <div ref={receiptRef}>
          <InvoicePrint
            preview={{
              order: { tableNumber: invoice.tableNumber, waiterName: invoice.waiterName },
              lineItems: invoice.lineItems,
              subtotalINR: invoice.subtotalINR,
              gstBreakup: invoice.gstBreakup,
              totalGSTINR: invoice.totalGSTINR,
            }}
            finalTotal={invoice.grandTotalINR}
            discountFlat={invoice.discount?.flatAmount || 0}
            roundOff={invoice.roundOff || 0}
            paymentMode={invoice.paymentMode || 'CASH'}
            invoiceNumber={invoice.invoiceNumber}
            restaurant={{
              name: restaurant?.name || '',
              address: restaurant?.address || '',
              contactNumber: restaurant?.contactNumber || '',
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
