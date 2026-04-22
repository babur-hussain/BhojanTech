import React from 'react';
import { GSTSlabBreakup, InvoiceLineItem, PaymentMode } from '@restaurant/types';

interface RestaurantInfo {
  name: string;
  address: string;
  gstin: string;
  fssai: string;
  logoUrl?: string;
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

/**
 * 80mm thermal printer–optimised invoice component.
 * Renders in a fixed ~302px width, using tight spacing, monospace
 * sections and a print CSS class.  
 * Call window.print() to send directly to a Star / Epson thermal printer
 * (set paper size to 80mm in browser print settings).
 */
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
    <div
      id="invoice-print"
      className="bg-white text-black"
      style={{ width: '302px', fontFamily: 'monospace', fontSize: '11px', padding: '8px', lineHeight: 1.4 }}
    >
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        {restaurant.logoUrl && (
          <img src={restaurant.logoUrl} alt="logo" style={{ height: 40, marginBottom: 4 }} />
        )}
        <div style={{ fontSize: 14, fontWeight: 900, letterSpacing: 1 }}>{restaurant.name}</div>
        <div style={{ fontSize: 10 }}>{restaurant.address}</div>
        <div style={{ fontSize: 10 }}>GSTIN: {restaurant.gstin}</div>
        <div style={{ fontSize: 10 }}>FSSAI: {restaurant.fssai}</div>
      </div>

      <Dashes />

      {/* ── Meta ────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
        <div>
          <div><b>Invoice:</b> {invoiceNumber}</div>
          <div><b>Table:</b> {preview.order.tableNumber}</div>
          <div><b>Waiter:</b> {preview.order.waiterName}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div>{dateStr}</div>
          <div>{timeStr}</div>
          <div style={{ textTransform: 'uppercase', fontSize: 9, marginTop: 2, background: '#000', color: '#fff', padding: '1px 4px', borderRadius: 2 }}>
            {paymentMode}
          </div>
        </div>
      </div>

      <Dashes />

      {/* ── Column Headings ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', fontWeight: 'bold', fontSize: 10 }}>
        <span style={{ flex: 3 }}>Item</span>
        <span style={{ flex: 1, textAlign: 'center' }}>Qty</span>
        <span style={{ flex: 1, textAlign: 'right' }}>Rate</span>
        <span style={{ flex: 1, textAlign: 'right' }}>Amt</span>
      </div>
      <Dashes char="-" />

      {/* ── Line Items ──────────────────────────────────────────────── */}
      {preview.lineItems.map((item, i) => (
        <div key={i}>
          <div style={{ display: 'flex', alignItems: 'flex-start' }}>
            <span style={{ flex: 3 }}>
              {item.name}
              {item.variantName && item.variantName !== 'Regular'
                ? ` (${item.variantName})` : ''}
              {item.hindiName ? <><br/><span style={{ fontSize: 9, color: '#555' }}>{item.hindiName}</span></> : null}
            </span>
            <span style={{ flex: 1, textAlign: 'center' }}>{item.quantity}</span>
            <span style={{ flex: 1, textAlign: 'right' }}>{item.unitPrice}</span>
            <span style={{ flex: 1, textAlign: 'right', fontWeight: 600 }}>{item.lineTotal}</span>
          </div>
          <div style={{ fontSize: 9, color: '#666', paddingLeft: 2 }}>
            HSN: {item.hsnCode} | GST @{item.gstSlab}%
          </div>
        </div>
      ))}

      <Dashes />

      {/* ── Subtotal / Discount / Totals ────────────────────────────── */}
      <Row label="Sub-total" value={`₹${preview.subtotalINR.toFixed(2)}`} />
      {discountFlat > 0 && <Row label="Discount" value={`-₹${discountFlat.toFixed(2)}`} />}
      {roundOff !== 0 && <Row label="Round-off" value={`${roundOff > 0 ? '+' : ''}₹${roundOff.toFixed(2)}`} small />}
      <Row label="TOTAL" value={`₹${finalTotal}`} bold />

      <Dashes char="-" />

      {/* ── GST Breakup ─────────────────────────────────────────────── */}
      <div style={{ fontSize: 10, fontWeight: 'bold', marginBottom: 2 }}>GST Breakup</div>
      <div style={{ display: 'flex', fontSize: 9, fontWeight: 'bold', borderBottom: '1px dashed #ccc', paddingBottom: 2, marginBottom: 2 }}>
        <span style={{ flex: 1 }}>Slab</span>
        <span style={{ flex: 2, textAlign: 'right' }}>Taxable</span>
        <span style={{ flex: 1, textAlign: 'right' }}>CGST</span>
        <span style={{ flex: 1, textAlign: 'right' }}>SGST</span>
        <span style={{ flex: 1.5, textAlign: 'right' }}>Tax Total</span>
      </div>
      {preview.gstBreakup.map((g, i) => (
        <div key={i} style={{ display: 'flex', fontSize: 9 }}>
          <span style={{ flex: 1 }}>@{g.slab}%</span>
          <span style={{ flex: 2, textAlign: 'right' }}>{g.taxableAmount.toFixed(2)}</span>
          <span style={{ flex: 1, textAlign: 'right' }}>{g.cgst.toFixed(2)}</span>
          <span style={{ flex: 1, textAlign: 'right' }}>{g.sgst.toFixed(2)}</span>
          <span style={{ flex: 1.5, textAlign: 'right' }}>{(g.cgst+g.sgst).toFixed(2)}</span>
        </div>
      ))}
      <Row label="Total GST" value={`₹${totalGST.toFixed(2)}`} small />

      <Dashes />

      {/* ── Total in Words ──────────────────────────────────────────── */}
      <div style={{ fontSize: 10, fontStyle: 'italic', marginBottom: 4 }}>
        <b>Amount:</b> {totalWords}
      </div>
      <div style={{ fontSize: 10, fontStyle: 'italic', marginBottom: 8 }}>
        {totalHindi}
      </div>

      {/* ── UPI QR Placeholder ──────────────────────────────────────── */}
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <div style={{ width: 80, height: 80, border: '2px dashed #999', margin: '0 auto 4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#999' }}>
          UPI QR
        </div>
        <div style={{ fontSize: 9, color: '#555' }}>Scan to pay / verify</div>
      </div>

      <Dashes />

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', fontSize: 10, marginTop: 4 }}>
        <div>Thank you, visit again!</div>
        <div style={{ fontWeight: 700 }}>धन्यवाद, फिर पधारें! 🙏</div>
        <div style={{ fontSize: 9, color: '#888', marginTop: 4 }}>
          This is a computer-generated invoice
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const Dashes = ({ char = '=' }: { char?: string }) => (
  <div style={{ borderTop: char === '=' ? '2px solid #000' : '1px dashed #aaa', margin: '4px 0' }} />
);

const Row = ({ label, value, bold, small }: { label: string; value: string; bold?: boolean; small?: boolean }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: bold ? 900 : 400, fontSize: small ? 9 : 11 }}>
    <span>{label}</span>
    <span>{value}</span>
  </div>
);

// ─── Mini number-to-words (client side, for print) ───────────────────────────
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
