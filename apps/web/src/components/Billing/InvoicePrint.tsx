import React from 'react';
import { GSTSlabBreakup, InvoiceLineItem, PaymentMode } from '@restaurant/types';
import { getMediaUrl } from '../../utils/api';

interface RestaurantInfo {
  name: string;
  address: string;
  gstin: string;
  fssai: string;
  logoUrl?: string;
  upiId?: string;
}

interface Props {
  preview: {
    order: { tableNumber: string; waiterName: string };
    lineItems: InvoiceLineItem[];
    gstBreakup: GSTSlabBreakup[];
    subtotalINR: number;
    totalGSTINR: number;
  };
  finalTotal: number;
  discountFlat: number;
  roundOff: number;
  paymentMode: PaymentMode;
  invoiceNumber: string;
  restaurant: RestaurantInfo;
}

export default function InvoicePrint({
  preview, finalTotal, discountFlat, roundOff, paymentMode, invoiceNumber, restaurant,
}: Props) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
  const timeStr = now.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });

  const totalWords = toWordsEN(finalTotal);
  const totalHindi = toWordsHI(finalTotal);

  const totalGST = preview.gstBreakup.reduce((s, g) => s + g.cgst + g.sgst, 0);

  return (
    <div className="bg-white shadow-2xl rounded-sm border border-gray-200 mx-auto relative overflow-hidden" style={{ width: '302px' }}>
      <style>{`
        @page {
          margin: 0;
          size: 80mm auto;
        }
        @media print {
          body * {
            visibility: hidden;
          }
          #invoice-print, #invoice-print * {
            visibility: visible;
          }
          #invoice-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%; /* Use 100% of 80mm */
            padding: 0;
            margin: 0;
            box-shadow: none;
            border: none;
          }
        }
      `}</style>
      
      {/* Zig-zag top border for realistic receipt look (optional CSS trick) */}
      <div className="absolute top-0 left-0 w-full h-2 bg-repeat-x" style={{ backgroundImage: 'radial-gradient(circle at 50% 0, transparent 4px, white 5px)', backgroundSize: '10px 10px' }}></div>

      <div
        id="invoice-print"
        className="text-black bg-white pt-6 pb-8 px-5"
        style={{ fontFamily: '"Courier New", Courier, monospace', fontSize: '12px', lineHeight: 1.4 }}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="text-center mb-4">
          {restaurant.logoUrl && (
            <img src={getMediaUrl(restaurant.logoUrl)} alt="logo" className="mx-auto object-contain mb-2" style={{ height: '48px' }} />
          )}
          <div className="text-xl font-bold uppercase tracking-wider mb-1 leading-tight">{restaurant.name}</div>
          <div className="text-xs text-gray-700 leading-snug max-w-[250px] mx-auto">{restaurant.address}</div>
          <div className="text-xs text-gray-700 mt-1">GSTIN: {restaurant.gstin}</div>
          <div className="text-xs text-gray-700">FSSAI: {restaurant.fssai}</div>
        </div>

        <DottedLine />

        {/* ── Meta ────────────────────────────────────────────────────── */}
        <div className="flex justify-between items-start text-xs my-3">
          <div className="space-y-0.5">
            <div><span className="font-bold text-gray-600">INV:</span> {invoiceNumber}</div>
            <div><span className="font-bold text-gray-600">TBL:</span> {preview.order.tableNumber || 'Takeaway'}</div>
            <div><span className="font-bold text-gray-600">USR:</span> {preview.order.waiterName || 'Staff'}</div>
          </div>
          <div className="text-right space-y-0.5">
            <div>{dateStr}</div>
            <div>{timeStr}</div>
            <div className="inline-block px-1.5 py-0.5 border border-black rounded text-[10px] font-bold mt-1">
              {paymentMode}
            </div>
          </div>
        </div>

        <DottedLine />

        {/* ── Column Headings ─────────────────────────────────────────── */}
        <div className="flex font-bold text-xs my-2 uppercase tracking-wide border-b border-black pb-1">
          <span className="flex-[3]">Item</span>
          <span className="flex-1 text-center">Qty</span>
          <span className="flex-1 text-right">Rate</span>
          <span className="flex-1 text-right">Amt</span>
        </div>

        {/* ── Line Items ──────────────────────────────────────────────── */}
        <div className="py-1 space-y-2">
          {preview.lineItems.map((item, i) => (
            <div key={i} className="flex flex-col">
              <div className="flex items-start text-xs font-semibold">
                <span className="flex-[3] pr-1">
                  {item.name}
                  {item.variantName && item.variantName !== 'Regular' ? ` (${item.variantName})` : ''}
                </span>
                <span className="flex-1 text-center">{item.quantity}</span>
                <span className="flex-1 text-right pr-2">{item.unitPrice}</span>
                <span className="flex-1 text-right">{item.lineTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-gray-500 pl-1 mt-0.5">
                <span>{item.hindiName || ''}</span>
                <span>HSN:{item.hsnCode} | GST:{item.gstSlab}%</span>
              </div>
            </div>
          ))}
        </div>

        <DottedLine />

        {/* ── Subtotal / Discount / Totals ────────────────────────────── */}
        <div className="my-2 space-y-1">
          <Row label="Sub-total" value={`₹${preview.subtotalINR.toFixed(2)}`} />
          {discountFlat > 0 && <Row label="Discount" value={`-₹${discountFlat.toFixed(2)}`} />}
          {roundOff !== 0 && <Row label="Round-off" value={`${roundOff > 0 ? '+' : ''}₹${roundOff.toFixed(2)}`} small />}
        </div>
        
        <div className="border-t-2 border-black border-dashed pt-2 pb-1 mt-1">
          <div className="flex justify-between items-center font-black text-lg">
            <span>TOTAL PAYABLE</span>
            <span>₹{finalTotal}</span>
          </div>
        </div>

        <DottedLine />

        {/* ── GST Breakup ─────────────────────────────────────────────── */}
        <div className="mt-3">
          <div className="text-[11px] font-bold uppercase tracking-wider mb-1 text-center">Tax Summary</div>
          <div className="flex text-[9px] font-bold border-b border-gray-400 pb-1 mb-1">
            <span className="flex-1">Slab</span>
            <span className="flex-[1.5] text-right">Taxable</span>
            <span className="flex-1 text-right">CGST</span>
            <span className="flex-1 text-right">SGST</span>
            <span className="flex-[1.5] text-right">Total Tax</span>
          </div>
          {preview.gstBreakup.map((g, i) => (
            <div key={i} className="flex text-[10px] my-0.5">
              <span className="flex-1 font-semibold">{g.slab}%</span>
              <span className="flex-[1.5] text-right">{g.taxableAmount.toFixed(2)}</span>
              <span className="flex-1 text-right">{g.cgst.toFixed(2)}</span>
              <span className="flex-1 text-right">{g.sgst.toFixed(2)}</span>
              <span className="flex-[1.5] text-right">{(g.cgst+g.sgst).toFixed(2)}</span>
            </div>
          ))}
          <div className="flex justify-between text-[10px] font-bold mt-1 pt-1 border-t border-gray-300">
            <span>Total GST Included</span>
            <span>₹{totalGST.toFixed(2)}</span>
          </div>
        </div>

        <DottedLine />

        {/* ── Total in Words ──────────────────────────────────────────── */}
        <div className="text-[10px] italic text-center text-gray-700 my-3 leading-tight space-y-1">
          <div>{totalWords}</div>
          <div>{totalHindi}</div>
        </div>

        <DottedLine />

        {/* ── UPI QR & Footer ─────────────────────────────────────────── */}
        <div className="text-center mt-4 space-y-1">
          {/* Live UPI QR Code */}
          <div className="mb-4">
            {restaurant.upiId ? (
              <>
                <div className="inline-block p-1 bg-white border-2 border-black rounded-lg">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`upi://pay?pa=${restaurant.upiId}&pn=${restaurant.name.replace(/ /g, '+')}&am=${finalTotal}&cu=INR`)}`}
                    alt="UPI QR"
                    className="w-24 h-24"
                  />
                </div>
                <div className="text-[10px] font-bold mt-1">Scan to Pay via UPI</div>
                <div className="text-[9px] text-gray-500 font-mono">{restaurant.upiId}</div>
              </>
            ) : (
              <div className="text-[10px] text-gray-400 italic">UPI not configured</div>
            )}
          </div>

          <div className="font-bold text-sm tracking-wide">THANK YOU!</div>
          <div className="font-bold text-sm tracking-wide">धन्यवाद, फिर पधारें! 🙏</div>
          
          <div className="mt-4 flex flex-col items-center">
             {/* Mock Barcode using a font or border trick */}
             <div className="w-48 h-10 border-l-2 border-r-4 border-black bg-[repeating-linear-gradient(90deg,#000,#000_2px,transparent_2px,transparent_4px)]"></div>
             <div className="text-[9px] tracking-[0.2em] mt-1">{invoiceNumber}</div>
          </div>
          
          <div className="text-[9px] text-gray-500 mt-4">
            ~ Powered by RestoOS ~
          </div>
        </div>

      </div>
      
      {/* Zig-zag bottom border */}
      <div className="absolute bottom-0 left-0 w-full h-2 bg-repeat-x" style={{ backgroundImage: 'radial-gradient(circle at 50% 100%, transparent 4px, white 5px)', backgroundSize: '10px 10px', backgroundPosition: 'bottom' }}></div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const DottedLine = () => (
  <div className="w-full border-t border-dashed border-gray-400 my-3" />
);

const Row = ({ label, value, bold, small }: { label: string; value: string; bold?: boolean; small?: boolean }) => (
  <div className={`flex justify-between ${bold ? 'font-black text-sm' : 'font-semibold text-xs'} ${small ? 'text-[10px] text-gray-600' : ''}`}>
    <span>{label}</span>
    <span>{value}</span>
  </div>
);

// ─── Mini number-to-words ───────────────────────────
const ones_en = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
const tens_en = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];

function twoEn(n: number): string {
  if (!n) return '';
  if (n < 20) return ones_en[n];
  return tens_en[Math.floor(n/10)] + (n%10 ? ' '+ones_en[n%10] : '');
}
function threeEn(n: number): string {
  if (!n) return '';
  const h = Math.floor(n/100), r = n%100;
  return (h ? ones_en[h]+' Hundred ' : '') + twoEn(r);
}
function toWordsEN(n: number): string {
  n = Math.round(n);
  if (!n) return 'Zero Rupees Only';
  let r = '';
  if (n >= 1e7) { r += threeEn(Math.floor(n/1e7))+' Crore '; n %= 1e7; }
  if (n >= 1e5) { r += threeEn(Math.floor(n/1e5))+' Lakh '; n %= 1e5; }
  if (n >= 1e3) { r += threeEn(Math.floor(n/1e3))+' Thousand '; n %= 1e3; }
  return (r + threeEn(n)).trim() + ' Rupees Only';
}

const ones_hi = ['','एक','दो','तीन','चार','पाँच','छह','सात','आठ','नौ','दस','ग्यारह','बारह','तेरह','चौदह','पंद्रह','सोलह','सत्रह','अठारह','उन्नीस'];
const tens_hi = ['','','बीस','तीस','चालीस','पचास','साठ','सत्तर','अस्सी','नब्बे'];
function twoHi(n: number): string {
  if (!n) return '';
  if (n < 20) return ones_hi[n];
  return tens_hi[Math.floor(n/10)] + (n%10 ? ' '+ones_hi[n%10] : '');
}
function threeHi(n: number): string {
  if (!n) return '';
  const h = Math.floor(n/100), r = n%100;
  return (h ? ones_hi[h]+' सौ ' : '') + twoHi(r);
}
function toWordsHI(n: number): string {
  n = Math.round(n);
  if (!n) return 'शून्य रुपये मात्र';
  let r = '';
  if (n >= 1e7) { r += threeHi(Math.floor(n/1e7))+' करोड़ '; n %= 1e7; }
  if (n >= 1e5) { r += threeHi(Math.floor(n/1e5))+' लाख '; n %= 1e5; }
  if (n >= 1e3) { r += threeHi(Math.floor(n/1e3))+' हज़ार '; n %= 1e3; }
  return (r + threeHi(n)).trim() + ' रुपये मात्र';
}
