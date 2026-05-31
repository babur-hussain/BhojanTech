/**
 * thermalPrint.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Strategy (auto-selected at runtime):
 *
 *  1. QZ Tray  — if QZ Tray is running on the machine (ws://localhost:8182)
 *                sends raw ESC/POS bytes → printer fires instantly, NO dialog.
 *
 *  2. Popup window — fallback when QZ Tray is not running.
 *                    Opens a receipt-only window, auto-calls window.print().
 *                    Chrome remembers the thermal printer after first use.
 *
 * QZ Tray setup (one-time, ~5 min):
 *   https://qz.io/download/
 * ────────────────────────────────────────────────────────────────────────────
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let qz: any = null;

// ── QZ Tray Certificate & Private Key ────────────────────────────────────────
// These are used for proper signed communication with QZ Tray.
// The matching override.crt (Root CA) must be installed in the QZ Tray
// installation directory.
//
// Certificate chain: site cert + intermediate (root CA)
const QZ_CERTIFICATE =
  "-----BEGIN CERTIFICATE-----\n" +
  "MIID3jCCAsagAwIBAgIUMztbSHzAhiDf4qFPM1A3XUQO4wAwDQYJKoZIhvcNAQEL\n" +
  "BQAwgYsxCzAJBgNVBAYTAklOMRIwEAYDVQQIDAlSYWphc3RoYW4xFDASBgNVBAoM\n" +
  "C1Jlc3RvT1MgUE9TMRQwEgYDVQQLDAtSZXN0b09TIFBPUzEYMBYGA1UEAwwPUmVz\n" +
  "dG9PUyBSb290IENBMSIwIAYJKoZIhvcNAQkBFhNhZG1pbkByZXN0b29zLmxvY2Fs\n" +
  "MB4XDTI2MDUwODAwMjgxMVoXDTM2MDUwNTAwMjgxMVowgYExCzAJBgNVBAYTAklO\n" +
  "MRIwEAYDVQQIDAlSYWphc3RoYW4xEDAOBgNVBAoMB1Jlc3RvT1MxFDASBgNVBAsM\n" +
  "C1Jlc3RvT1MgUE9TMRIwEAYDVQQDDAlsb2NhbGhvc3QxIjAgBgkqhkiG9w0BCQEW\n" +
  "E2FkbWluQHJlc3Rvb3MubG9jYWwwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEK\n" +
  "AoIBAQC5NE6zgp5Ua3hLKitxAjxKpFukhS8A/aAzciJhaJy/dBDz2V602Kb8hCA8\n" +
  "oCgp8tgAr83xlXCom5OPd64oxLnSFn+F2LO7wKzCE2Mqx/aNzsCquyhAXXKUu3dH\n" +
  "M85QmLzb+qekthoGHxs5RSzSbCoVa04DZC/oeBe6dmRPFGx48IqbsIBBe/iZGf2G\n" +
  "XhP7CMEx+Vi1GnrtZjkLSC/igFu0mgzZxv7Uay3Hs5lCIFqwzBOcI0iqmcZnY9tN\n" +
  "8xW+oqUU3WotVLazzLPHjFAiU1ekhr/AtIAmkM5Wf+aGjK8zc4BqC+jHIO4efTSi\n" +
  "j/NxxWNEjnGK06miQIKaJ3gfvlzNAgMBAAGjQjBAMB0GA1UdDgQWBBRTG2COGA2F\n" +
  "bcVmz0jfvLo+Qi5BHzAfBgNVHSMEGDAWgBTvaZUC1nynKyyec+FzPAA8H41ZgjAN\n" +
  "BgkqhkiG9w0BAQsFAAOCAQEAEwGBS9p7Ks0mhRV17iRT+4L3xz3jzZsnxL3t6cSR\n" +
  "ayxz+Vx+tgM/fds27iqqhFIZef/7Cqosbmbdw3y2Elo2xZBiv7zGFxbSUInT9ld/\n" +
  "+tg39gzCZCZpeyauYz8At0S8i9475hnY0rvOJ9p+ylbScEnImrV0qLnO+ESCqZGN\n" +
  "5FPKJDtwFj0vY4CPJwm6MvoN7unL1dl0v3+pcmgxE69aH91Pv4MtggXqZ7Z7lmBK\n" +
  "p1ADOt0hoK0LxvERZu3kA1Sez4izSskIhQLt2z7I6JZBIlepWoQx5Ux1m43zVcM8\n" +
  "5uzR7awPOzgjMrNXHW94I2jmLO15hCTz2RQ9Qu6sKHdECg==\n" +
  "-----END CERTIFICATE-----\n" +
  "--START INTERMEDIATE CERT--\n" +
  "-----BEGIN CERTIFICATE-----\n" +
  "MIID+TCCAuGgAwIBAgIUbiM6Rg/gvbK8LsLsIkmJe4GNMj8wDQYJKoZIhvcNAQEL\n" +
  "BQAwgYsxCzAJBgNVBAYTAklOMRIwEAYDVQQIDAlSYWphc3RoYW4xFDASBgNVBAoM\n" +
  "C1Jlc3RvT1MgUE9TMRQwEgYDVQQLDAtSZXN0b09TIFBPUzEYMBYGA1UEAwwPUmVz\n" +
  "dG9PUyBSb290IENBMSIwIAYJKoZIhvcNAQkBFhNhZG1pbkByZXN0b29zLmxvY2Fs\n" +
  "MB4XDTI2MDUwODAwMjc1OFoXDTM2MDUwNTAwMjc1OFowgYsxCzAJBgNVBAYTAklO\n" +
  "MRIwEAYDVQQIDAlSYWphc3RoYW4xFDASBgNVBAoMC1Jlc3RvT1MgUE9TMRQwEgYD\n" +
  "VQQLDAtSZXN0b09TIFBPUzEYMBYGA1UEAwwPUmVzdG9PUyBSb290IENBMSIwIAYJ\n" +
  "KoZIhvcNAQkBFhNhZG1pbkByZXN0b29zLmxvY2FsMIIBIjANBgkqhkiG9w0BAQEF\n" +
  "AAOCAQ8AMIIBCgKCAQEAhh4RZwd8kJqQERvcDj3UmxFxBrfoCWPyVAF7L/G6T/6h\n" +
  "GhjzApuHEf4SjhxcNqFU4qB5J/iymRqCvhocxsw+/hCclodYYaNvTGyfd8GBE5W0\n" +
  "81KzTVjwoWWsUdIMjelkfC8au18B8o8O8/MnpJRwG8NqrumdJFHRMvoZ063Ua+Yl\n" +
  "+uxYUl6VQ67uwVFRkQEd4VFGA8zFknp9FtF5tm1BQThXCk8HmGudksM4dEVVcSUx\n" +
  "ZWRQEcKzzbjA1AU1XmkDbSyssWvRBmvIdiD46a29YVc9kSzO2By3W8SpkKbGmjxP\n" +
  "fLAFxyg1D8vzXXPOfkwVyT2g1Y/AmannR77fIkpMgwIDAQABo1MwUTAdBgNVHQ4E\n" +
  "FgQU72mVAtZ8pyssnnPhczwAPB+NWYIwHwYDVR0jBBgwFoAU72mVAtZ8pyssnnPh\n" +
  "czwAPB+NWYIwDwYDVR0TAQH/BAUwAwEB/zANBgkqhkiG9w0BAQsFAAOCAQEAMZ4R\n" +
  "yUZMe+APLkI0JP44TW+mQqSnD95dpQzeqN1YRXTtY9PvKeLWWfNZ+QpjsdOdYRgz\n" +
  "dr3ypMdktJf0BuuVCO+wEhjERyNAtzqXBsSPIT8wJDAANDkdM4RE+oj8U+zzkJGG\n" +
  "tBjOksEPrEAyd3xdr/eVdoJopBVI6M62hvem7+Fotn0//78AtUYhauDokm1oSgCb\n" +
  "p0kgFTupcy2NL/5qMVijLNODemFgnmNHbo96lLsEdLWpi5tWVe8UT/hSEu7ObJmV\n" +
  "B5d50v8nCqgE7MebdhzpMcXSr6uPrvbIVHtBP7KMNUSgF3kFpJtxcHkr3GuZnrpZ\n" +
  "3sl1gKhr6EWwmI3BXw==\n" +
  "-----END CERTIFICATE-----";

// Private key for signing (PKCS#8 PEM format)
const QZ_PRIVATE_KEY =
  "-----BEGIN PRIVATE KEY-----\n" +
  "MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC5NE6zgp5Ua3hL\n" +
  "KitxAjxKpFukhS8A/aAzciJhaJy/dBDz2V602Kb8hCA8oCgp8tgAr83xlXCom5OP\n" +
  "d64oxLnSFn+F2LO7wKzCE2Mqx/aNzsCquyhAXXKUu3dHM85QmLzb+qekthoGHxs5\n" +
  "RSzSbCoVa04DZC/oeBe6dmRPFGx48IqbsIBBe/iZGf2GXhP7CMEx+Vi1GnrtZjkL\n" +
  "SC/igFu0mgzZxv7Uay3Hs5lCIFqwzBOcI0iqmcZnY9tN8xW+oqUU3WotVLazzLPH\n" +
  "jFAiU1ekhr/AtIAmkM5Wf+aGjK8zc4BqC+jHIO4efTSij/NxxWNEjnGK06miQIKa\n" +
  "J3gfvlzNAgMBAAECggEACv5vkY5hEbJ+JeVvRg++PnwP3e3zWAQLkiI7UjxLLxOX\n" +
  "vLHxl5tTcPfy5fESkUg+Hu77Xao4/CPyws3K7oFHD+aP/q+vc6drWetGtA/CCLGg\n" +
  "6Zb0kRA7BgM0KxYzMBZGV79DBlmyT8dhmVO25m15+Lgxna1BKXPqN1e3JU6ZZdBf\n" +
  "pSRIjBSZsseZ+N/xPm5ycUkIczBt1DW/RCzbEiFhSPJjASJJCT4sRLOOBsfw2usj\n" +
  "IB9ADjJ4xJqnbdUadYPhjGqmFDeHsfI+NlzQVPh9rbBpKvwrE+OJfdhsUJJIRPJ+\n" +
  "SXgWLSTF1yXG7VfpKDHaAc4s9cp+nDOM5yni8IQLLQKBgQDuSqUeVA3RIuN+KXoQ\n" +
  "WEu3v7S7t9d8Ryb7PDzNvBT6PQl8n1yPcZlwx8RvgI1UOu0FbCCn7a/bYDxOUBSG\n" +
  "2VF8zfC0r9RzQgtwjQ9tL00z/dbd4urSlijcvro+Wu3yDcZGidK+9afIS+GTxM/V\n" +
  "aaFn977LsJHY2+AP1FW92Q6NHwKBgQDG97WHUvpw8KH40++cH4X9M9UdVivJXy89\n" +
  "25VFTo1fx0wK5Y2hDijUTXwtZauHP5VaFiV+DTnUGecgVseSyAijEeU9j2GxN9nz\n" +
  "XkL6IGWI0vej3+/tkNkfrKjYmkNpx7lXLuDmRCEaVYoY/qQpV9nJAR/VrCRww8cj\n" +
  "yGClvZ4skwKBgF3TnHJ1rD8V2reZg0ueSKogXPyxJbL0nT+9dz+W+DeUAwFECoEc\n" +
  "vMswjYNN/dgVn7BL5AvbRiw+F2DKnVp/hVt8B3RN63w6nCCEGnfmcSKwp4MUz1t9\n" +
  "7rcEjnbw/NIbZF/v8sBoH9l5L2gszZz9i6VRYpn3e2YFJZN2CxDGv7kHAoGBAIwe\n" +
  "XCeNxzMMM3Txg/eVt52GCBpd2f45WyKb5fZmCGegCaxO1rvKJfTFEKNDy1U28O39\n" +
  "VK/9jnERQNRkaK2002hLrP36YJkWNRYPlulhMT/3GlC83tGVxWJqDIplsP3omlyM\n" +
  "dfOTnSBXhyZtBZzb8lJ8yTeHwC3toetQLMfrzl2jAoGBAJSx+Eys1eFdjK9X83kn\n" +
  "Y/X9VHT/Mq0eVXmsvSx70wP1P8DfOqOT1+sVb4/bSRy9KYVyr/myg/lRGDTPmRUv\n" +
  "jsHRu6+4SGHhiNlQKv9K9LLa5THwfUCTN27uHANr0mNOldRPStxBWHWZr0XHo/fZ\n" +
  "i4b9CLsMKBKdESWUvqbXD1Uo\n" +
  "-----END PRIVATE KEY-----";

/** Lazy-load qz-tray and configure certificate-based security */
async function getQZ() {
  if (qz) return qz;
  try {
    const mod = await import('qz-tray');
    qz = mod.default ?? mod;

    // ── Security ─────────────────────────────────────────────────────────────
    // Uses a self-signed certificate chain with client-side RSA signing via
    // jsrsasign. The matching override.crt (Root CA) MUST be installed in
    // the QZ Tray installation directory:
    //   macOS:   /Applications/QZ Tray.app/Contents/Resources/override.crt
    //   Windows: C:\Program Files\QZ Tray\override.crt
    //   Linux:   /opt/qz-tray/override.crt
    //
    // This ensures QZ Tray trusts our certificate and prints silently
    // (no "Allow/Deny" popups after first authorization).

    // Provide the site certificate + intermediate (root) chain
    qz.security.setCertificatePromise(
      (resolve: (v: string) => void) => {
        resolve(QZ_CERTIFICATE);
      }
    );

    // Sign each API call using the private key with jsrsasign (client-side)
    qz.security.setSignatureAlgorithm('SHA512');
    qz.security.setSignaturePromise(
      (toSign: string) =>
        (resolve: (v: string) => void, reject: (v: unknown) => void) => {
          try {
            // Dynamically import jsrsasign for signing
            import('jsrsasign').then((jsrsasign) => {
              const pk = jsrsasign.KEYUTIL.getKey(QZ_PRIVATE_KEY);
              const sig = new jsrsasign.KJUR.crypto.Signature({ alg: 'SHA512withRSA' });
              sig.init(pk);
              sig.updateString(toSign);
              const hex = sig.sign();
              resolve(jsrsasign.stob64(jsrsasign.hextorstr(hex)));
            }).catch(reject);
          } catch (err) {
            reject(err);
          }
        }
    );

    return qz;
  } catch {
    return null;
  }
}

/** Connect to QZ Tray WebSocket if not already connected */
async function ensureConnected(): Promise<boolean> {
  try {
    const q = await getQZ();
    if (!q) return false;
    if (q.websocket.isActive()) return true;
    await q.websocket.connect({ retries: 1, delay: 300 });
    return q.websocket.isActive();
  } catch {
    return false;
  }
}

/** Returns true if QZ Tray WebSocket is currently active */
export async function isQZConnected(): Promise<boolean> {
  try {
    const q = await getQZ();
    if (!q) return false;
    if (q.websocket.isActive()) return true;
    await q.websocket.connect({ retries: 0, delay: 0 });
    return q.websocket.isActive();
  } catch {
    return false;
  }
}

/**
 * List all printers available via QZ Tray.
 * Returns [] if QZ Tray is not running or no printers found.
 */
export async function listPrinters(): Promise<string[]> {
  try {
    const connected = await ensureConnected();
    if (!connected) return [];
    const q = await getQZ();
    const printers: string[] = await q.printers.find();
    return Array.isArray(printers) ? printers.filter(Boolean) : [];
  } catch {
    return [];
  }
}

// ─── ESC/POS builder ────────────────────────────────────────────────────────

const ESC  = '\x1B';
const GS   = '\x1D';
const LF   = '\x0A';

const INIT        = ESC + '@';          // Initialize / reset
const ALIGN_C     = ESC + 'a\x01';     // Centre
const ALIGN_L     = ESC + 'a\x00';     // Left
const BOLD_ON     = ESC + 'E\x01';
const BOLD_OFF    = ESC + 'E\x00';
const DSIZE_ON    = ESC + '!\x30';     // Double height + double width
const DSIZE_OFF   = ESC + '!\x00';
const FEED3       = ESC + 'd\x03';     // Feed 3 lines
const CUT         = GS  + 'V\x41\x00'; // Full cut

function line(txt = ''): string { return txt + LF; }

function dashes(char = '-', len = 32): string {
  return line(char.repeat(len));
}

/** Pad left-align + right-align within `width` chars */
function cols(left: string, right: string, width = 32): string {
  const pad = width - left.length - right.length;
  return line(left + ' '.repeat(Math.max(pad, 1)) + right);
}

/** Build a complete ESC/POS string for a thermal receipt */
export interface ReceiptData {
  restaurantName: string;
  address: string;
  gstin: string;
  fssai: string;
  upiId?: string;
  invoiceNumber: string;
  tableNumber: string;
  waiterName: string;
  paymentMode: string;
  date: string;
  time: string;
  items: { name: string; variantName?: string; quantity: number; unitPrice: number; lineTotal: number; gstSlab: number }[];
  subtotal: number;
  discountFlat: number;
  roundOff: number;
  grandTotal: number;
  gstBreakup: { slab: number; taxableAmount: number; cgst: number; sgst: number }[];
  totalGST: number;
  amountInWords: string;
  // Booking-specific extras
  customerName?: string;
  customerPhone?: string;
  depositPaid?: number;
  balanceDue?: number;
  bookingNote?: string;
}

export function buildESCPOS(r: ReceiptData): string {
  let s = '';

  s += INIT;

  // ── Header ────────────────────────────────────────────────────────────────
  s += ALIGN_C;
  s += BOLD_ON + DSIZE_ON;
  s += line(r.restaurantName.toUpperCase());
  s += DSIZE_OFF + BOLD_OFF;
  if (r.address)  s += line(r.address);
  if (r.gstin)    s += line(`GSTIN: ${r.gstin}`);
  if (r.fssai)    s += line(`FSSAI: ${r.fssai}`);

  s += ALIGN_L;
  s += dashes();

  // ── Meta ──────────────────────────────────────────────────────────────────
  s += cols(`INV: ${r.invoiceNumber}`, r.date);
  s += cols(`FOR: ${r.tableNumber || 'Takeaway'}`, r.time);
  s += cols(`USR: ${r.waiterName || 'Staff'}`, `[${r.paymentMode}]`);

  // ── Customer block (booking receipts) ─────────────────────────────────────
  if (r.customerName) {
    s += dashes('-');
    s += BOLD_ON + line(`CUST: ${r.customerName}`) + BOLD_OFF;
    if (r.customerPhone) s += line(`MOB:  ${r.customerPhone}`);
  }
  s += dashes();

  // ── Column headers ────────────────────────────────────────────────────────
  s += BOLD_ON;
  s += line('ITEM                    QTY  RATE    AMT');
  s += BOLD_OFF;
  s += dashes('-');

  // ── Line items ────────────────────────────────────────────────────────────
  for (const item of r.items) {
    const name = item.variantName && item.variantName !== 'Regular'
      ? `${item.name}(${item.variantName})`
      : item.name;

    // Truncate to 24 chars for the name column
    const nameTrunc = name.length > 24 ? name.substring(0, 22) + '..' : name.padEnd(24);
    const qty  = String(item.quantity).padStart(3);
    const rate = String(item.unitPrice).padStart(5);
    const amt  = String(item.lineTotal.toFixed(2)).padStart(7);
    s += line(`${nameTrunc}${qty}${rate}${amt}`);
    s += line(`  GST@${item.gstSlab}%`);
  }

  s += dashes();

  // ── Totals ────────────────────────────────────────────────────────────────
  s += cols('Sub-total', `Rs.${r.subtotal.toFixed(2)}`);
  if (r.discountFlat > 0) s += cols('Discount', `-Rs.${r.discountFlat.toFixed(2)}`);
  if (r.roundOff !== 0)   s += cols('Round-off', `${r.roundOff > 0 ? '+' : ''}Rs.${Math.abs(r.roundOff).toFixed(2)}`);
  s += dashes('-');
  s += BOLD_ON;
  s += cols('TOTAL PAYABLE', `Rs.${r.grandTotal}`);
  s += BOLD_OFF;

  // ── Deposit / Balance (booking-specific) ──────────────────────────────────
  if (r.depositPaid !== undefined && r.depositPaid > 0) {
    s += dashes('-');
    s += cols('Advance Paid', `Rs.${r.depositPaid.toFixed(2)}`);
    const bal = r.balanceDue ?? (r.grandTotal - r.depositPaid);
    s += BOLD_ON + cols('BALANCE DUE', `Rs.${Math.max(0, bal).toFixed(2)}`) + BOLD_OFF;
  }
  s += dashes();

  // ── GST Breakup (only when GST data exists) ──────────────────────────────
  if (r.gstBreakup.length > 0) {
    s += ALIGN_C + BOLD_ON + line('TAX SUMMARY') + BOLD_OFF + ALIGN_L;
    s += line('Slab  Taxable   CGST   SGST   Total');
    s += dashes('-');
    for (const g of r.gstBreakup) {
      const row = `${String(g.slab + '%').padEnd(6)}${String(g.taxableAmount.toFixed(2)).padEnd(10)}${String(g.cgst.toFixed(2)).padEnd(7)}${String(g.sgst.toFixed(2)).padEnd(7)}${(g.cgst + g.sgst).toFixed(2)}`;
      s += line(row);
    }
    s += cols('Total GST', `Rs.${r.totalGST.toFixed(2)}`);
    s += dashes();
  }

  // ── Booking note (special requests) ──────────────────────────────────────
  if (r.bookingNote) {
    s += ALIGN_L + line(`NOTE: ${r.bookingNote}`);
    s += dashes('-');
  }

  // ── Amount in words ───────────────────────────────────────────────────────
  s += ALIGN_C;
  s += line(r.amountInWords);

  // ── UPI QR (ESC/POS model-2 QR command) ──────────────────────────────────
  if (r.upiId) {
    // If deposit was paid, QR should be for balance due only
    const qrAmount = (r.depositPaid && r.depositPaid > 0)
      ? Math.max(0, r.grandTotal - r.depositPaid)
      : r.grandTotal;
    const upiString = `upi://pay?pa=${r.upiId}&pn=${encodeURIComponent(r.restaurantName)}&am=${qrAmount}&cu=INR`;
    const upiLen = upiString.length;
    const pL = upiLen & 0xFF;
    const pH = (upiLen >> 8) & 0xFF;

    s += LF;
    // Select model 2
    s += GS + '(k\x04\x00\x31\x41\x32\x00';
    // Set module size (4 = good for 80mm paper)
    s += GS + '(k\x03\x00\x31\x43\x04';
    // Error correction level M
    s += GS + '(k\x03\x00\x31\x45\x31';
    // Store data
    s += GS + '(k' + String.fromCharCode(pL + 3) + String.fromCharCode(pH) + '\x31\x50\x30' + upiString;
    // Print QR
    s += GS + '(k\x03\x00\x31\x51\x30';

    s += LF + ALIGN_C;
    s += BOLD_ON + line('Scan to Pay via UPI') + BOLD_OFF;
    s += line(r.upiId);
    if (qrAmount > 0) s += BOLD_ON + line(`Pay: Rs.${qrAmount.toFixed(2)}`) + BOLD_OFF;
    s += dashes();
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  s += ALIGN_C;
  s += BOLD_ON + line('THANK YOU!') + BOLD_OFF;
  s += line('Dhanyavaad, Phir Padharen!');
  s += line('~ Powered by RestoOS ~');

  s += FEED3;
  s += CUT;

  return s;
}

// ─── KOT Slip builder ───────────────────────────────────────────────────────

export interface KOTData {
  kotNumber?: string;
  tableNumber: string | number;
  waiterName?: string;
  isOnlineOrder?: boolean;
  deliveryPlatform?: string;
  customerName?: string;
  items: { name: string; variantName?: string; quantity: number; notes?: string; station?: string }[];
  time: string;
}

/**
 * Build a compact ESC/POS string for a KOT (Kitchen Order Ticket).
 * Designed for 80 mm thermal paper; no GST / no logo.
 */
export function buildKOTSlip(k: KOTData): string {
  let s = '';

  s += INIT;

  // ── Header ────────────────────────────────────────────────────────────────
  s += ALIGN_C + BOLD_ON + DSIZE_ON;
  s += line('* KOT *');
  s += DSIZE_OFF;
  if (k.kotNumber) s += line(`#${k.kotNumber}`);
  s += BOLD_OFF;
  s += dashes();

  // ── Meta ──────────────────────────────────────────────────────────────────
  s += ALIGN_L;
  const table = k.isOnlineOrder
    ? `${k.deliveryPlatform || 'ONLINE'} - ${k.customerName || 'Customer'}`
    : `Table: ${k.tableNumber}`;
  s += BOLD_ON + line(table) + BOLD_OFF;
  if (!k.isOnlineOrder && k.waiterName) s += line(`Waiter: ${k.waiterName}`);
  s += line(`Time:   ${k.time}`);
  s += dashes();

  // ── Items ─────────────────────────────────────────────────────────────────
  s += BOLD_ON;
  s += line('QTY  ITEM');
  s += BOLD_OFF;
  s += dashes('-');

  for (const item of k.items) {
    const qty = String(item.quantity).padStart(3);
    const name = item.variantName && item.variantName !== 'Regular'
      ? `${item.name} (${item.variantName})`
      : item.name;
    s += line(`${qty}  ${name}`);
    if (item.notes) {
      s += line(`     * ${item.notes}`);
    }
    if (item.station && item.station !== 'General') {
      s += line(`     [${item.station}]`);
    }
  }

  s += dashes();
  s += ALIGN_C + line('-- Chef Copy --');

  s += FEED3;
  s += CUT;

  return s;
}

// ─── Final Bill builder (full detailed invoice) ──────────────────────────────
// Used when marking a booking as DELIVERED/COMPLETED.
// More comprehensive than the short booking receipt.

export function buildFinalBillESCPOS(r: ReceiptData): string {
  const DB  = '=';   // double-line separator char
  const SB  = '-';   // single-line separator char

  function dbl(len = 32)   { return line(DB.repeat(len)); }
  function sgl(len = 32)   { return line(SB.repeat(len)); }

  let s = '';
  s += INIT;

  // ══ Header ════════════════════════════════════════════════════════════════
  s += ALIGN_C;
  s += BOLD_ON + DSIZE_ON + line(r.restaurantName.toUpperCase()) + DSIZE_OFF + BOLD_OFF;
  if (r.address) s += line(r.address);
  if (r.gstin)   s += line(`GSTIN: ${r.gstin}`);
  if (r.fssai)   s += line(`FSSAI: ${r.fssai}`);
  s += LF;
  s += dbl();

  // ══ FINAL BILL title ══════════════════════════════════════════════════════
  s += ALIGN_C + BOLD_ON + DSIZE_ON + line('** FINAL BILL **') + DSIZE_OFF + BOLD_OFF;
  s += dbl();

  // ── Bill meta ─────────────────────────────────────────────────────────────
  s += ALIGN_L;
  s += cols(`Bill No : ${r.invoiceNumber}`, r.date);
  s += cols(`Time    : ${r.time}`,          `[${r.paymentMode}]`);
  s += sgl();

  // ── Customer ──────────────────────────────────────────────────────────────
  if (r.customerName) {
    s += BOLD_ON + line('CUSTOMER') + BOLD_OFF;
    s += sgl();
    s += line(`Name  : ${r.customerName}`);
    if (r.customerPhone) s += line(`Mobile: ${r.customerPhone}`);
    s += sgl();
  }

  // ── Booking details ───────────────────────────────────────────────────────
  s += BOLD_ON + line('ORDER DETAILS') + BOLD_OFF;
  s += sgl();
  s += line(`Category   : ${r.tableNumber}`);
  s += sgl();

  // ── Items ─────────────────────────────────────────────────────────────────
  s += BOLD_ON + line('ITEMS') + BOLD_OFF;
  s += sgl();
  s += BOLD_ON + line('ITEM                    QTY   RATE     AMT') + BOLD_OFF;
  s += sgl();

  for (const item of r.items) {
    const name = item.variantName && item.variantName !== 'Regular'
      ? `${item.name} (${item.variantName})`
      : item.name;
    const nameTrunc = name.length > 24 ? name.substring(0, 22) + '..' : name.padEnd(24);
    const qty  = String(item.quantity).padStart(3);
    const rate = String(item.unitPrice.toFixed(0)).padStart(6);
    const amt  = String(item.lineTotal.toFixed(2)).padStart(8);
    s += line(`${nameTrunc}${qty}${rate}${amt}`);
  }

  s += dbl();

  // ── Financials ────────────────────────────────────────────────────────────
  s += cols('Sub-Total', `Rs. ${r.subtotal.toFixed(2)}`);
  if (r.discountFlat > 0) {
    s += cols('Discount', `-Rs. ${r.discountFlat.toFixed(2)}`);
  }
  if (r.roundOff !== 0) {
    s += cols('Round-off', `${r.roundOff > 0 ? '+' : ''}Rs. ${Math.abs(r.roundOff).toFixed(2)}`);
  }
  s += sgl();
  s += BOLD_ON + DSIZE_ON;
  s += cols('TOTAL', `Rs.${r.grandTotal.toFixed(2)}`);
  s += DSIZE_OFF + BOLD_OFF;
  s += dbl();

  // ── Advance / Balance ─────────────────────────────────────────────────────
  if (r.depositPaid && r.depositPaid > 0) {
    const bal = r.balanceDue ?? Math.max(0, r.grandTotal - r.depositPaid);
    s += cols('Advance Paid', `Rs. ${r.depositPaid.toFixed(2)}`);
    s += sgl();
    s += BOLD_ON;
    s += cols('BALANCE DUE', `Rs. ${bal.toFixed(2)}`);
    s += BOLD_OFF;
    s += dbl();
  }

  // ── GST summary ───────────────────────────────────────────────────────────
  if (r.gstBreakup.length > 0) {
    s += ALIGN_C + BOLD_ON + line('GST SUMMARY') + BOLD_OFF + ALIGN_L;
    s += sgl();
    s += line('Slab  Taxable     CGST    SGST    Total');
    s += sgl();
    for (const g of r.gstBreakup) {
      const row = `${String(g.slab + '%').padEnd(6)}${String(g.taxableAmount.toFixed(2)).padEnd(11)}${String(g.cgst.toFixed(2)).padEnd(8)}${String(g.sgst.toFixed(2)).padEnd(8)}${(g.cgst + g.sgst).toFixed(2)}`;
      s += line(row);
    }
    s += cols('Total GST', `Rs. ${r.totalGST.toFixed(2)}`);
    s += dbl();
  }

  // ── Special note ──────────────────────────────────────────────────────────
  if (r.bookingNote) {
    s += ALIGN_L + BOLD_ON + line('SPECIAL NOTE') + BOLD_OFF;
    s += line(r.bookingNote);
    s += sgl();
  }

  // ── Amount in words ───────────────────────────────────────────────────────
  s += ALIGN_C;
  s += line(r.amountInWords);
  s += LF;

  // ── UPI QR ────────────────────────────────────────────────────────────────
  if (r.upiId) {
    const qrAmount = (r.depositPaid && r.depositPaid > 0)
      ? Math.max(0, r.grandTotal - r.depositPaid)
      : r.grandTotal;
    const upiString = `upi://pay?pa=${r.upiId}&pn=${encodeURIComponent(r.restaurantName)}&am=${qrAmount}&cu=INR`;
    const upiLen = upiString.length;
    const pL = upiLen & 0xFF;
    const pH = (upiLen >> 8) & 0xFF;

    s += LF;
    s += GS + '(k\x04\x00\x31\x41\x32\x00';
    s += GS + '(k\x03\x00\x31\x43\x05';   // module size 5 for final bill QR
    s += GS + '(k\x03\x00\x31\x45\x31';
    s += GS + '(k' + String.fromCharCode(pL + 3) + String.fromCharCode(pH) + '\x31\x50\x30' + upiString;
    s += GS + '(k\x03\x00\x31\x51\x30';

    s += LF;
    s += BOLD_ON + line('SCAN & PAY') + BOLD_OFF;
    s += line(r.upiId);
    if (qrAmount > 0) s += BOLD_ON + line(`Amount: Rs. ${qrAmount.toFixed(2)}`) + BOLD_OFF;
    s += dbl();
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  s += ALIGN_C;
  s += BOLD_ON + DSIZE_ON + line('THANK YOU!') + DSIZE_OFF + BOLD_OFF;
  s += line('Dhanyavaad! Phir Padharen');
  s += LF;
  s += line('~ Powered by RestoOS ~');

  s += FEED3;
  s += CUT;

  return s;
}

// ─── Main printReceipt function ─────────────────────────────────────────────

export interface PrintReceiptOptions {
  receiptData?: ReceiptData;           // if provided → try QZ Tray ESC/POS
  receiptContainerRef?: HTMLElement | null; // fallback DOM node for popup
  printerName?: string;               // stored in localStorage from Settings
}

export async function printReceipt(options: PrintReceiptOptions | HTMLElement | null) {
  // Legacy call: printReceipt(domNode) — no-op, popup disabled
  if (options === null || options instanceof HTMLElement) {
    throw new Error('QZ Tray is required for printing. Browser popup is disabled.');
  }

  const { receiptData, printerName } = options;

  if (!receiptData) {
    throw new Error('No receipt data provided.');
  }

  const connected = await ensureConnected();
  if (!connected) {
    throw new Error('QZ Tray is not running. Please start QZ Tray and try again.');
  }

  try {
    await _printESCPOS(buildESCPOS(receiptData), printerName || null);
    console.log('[thermalPrint] Printed receipt via QZ Tray ✅');
  } catch (err) {
    console.error('[thermalPrint] QZ Tray print failed:', err);
    throw err;
  }
}

/**
 * Print a full detailed Final Bill via QZ Tray.
 * Uses buildFinalBillESCPOS for a comprehensive invoice layout.
 */
export async function printFinalBill(receiptData: ReceiptData, printerName?: string): Promise<void> {
  const connected = await ensureConnected();
  if (!connected) {
    throw new Error('QZ Tray is not running. Please start QZ Tray and try again.');
  }
  try {
    await _printESCPOS(buildFinalBillESCPOS(receiptData), printerName || null);
    console.log('[thermalPrint] Final bill printed via QZ Tray ✅');
  } catch (err) {
    console.error('[thermalPrint] Final bill print failed:', err);
    throw err;
  }
}

/**
 * Print a KOT slip directly to the kitchen printer via QZ Tray.
 * Falls back silently (no popup) if QZ Tray is unavailable.
 */
export async function printKOT(kotData: KOTData, printerName: string): Promise<boolean> {
  if (!printerName) return false;
  try {
    const connected = await ensureConnected();
    if (!connected) return false;
    await _printESCPOS(buildKOTSlip(kotData), printerName);
    console.log('[thermalPrint] KOT printed via QZ Tray ✅');
    return true;
  } catch (err) {
    console.warn('[thermalPrint] KOT print failed:', err);
    return false;
  }
}

/**
 * Print a test receipt to verify live connectivity with the printer.
 */
export async function printTestReceipt(printerName: string | null): Promise<void> {
  const connected = await ensureConnected();
  if (!connected) {
    throw new Error('QZ Tray is not connected.');
  }
  
  // Basic ESC/POS initialization + center align + bold + print test + cut
  const testData = '\x1b\x40\x1b\x61\x01\x1b\x45\x01\n*** QZ TRAY CONNECTION SUCCESSFUL ***\n\n\x1b\x45\x00Printer is live and ready!\n\n\x1b\x64\x05\x1d\x56\x41\x00';
  await _printESCPOS(testData, printerName);
}

/** Internal: send raw ESC/POS string to a named printer via QZ Tray */
async function _printESCPOS(escpos: string, printerName: string | null) {
  const q = await getQZ();
  if (!q) throw new Error('QZ module unavailable');

  let targetPrinter = printerName;
  // If no printer is explicitly selected in settings, get the OS default printer
  if (!targetPrinter) {
    try {
      targetPrinter = await q.printers.getDefault();
    } catch (e) {
      throw new Error('Could not get default printer from QZ Tray: ' + e);
    }
  }

  if (!targetPrinter) {
    throw new Error('No printer specified and no default printer found');
  }

  const config = q.configs.create(targetPrinter, { encoding: 'UTF-8' });
  await q.print(config, [
    { type: 'raw', format: 'plain', data: escpos },
  ]);
}

function popupPrint(receiptEl: HTMLElement | null) {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Receipt</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; background: #fff; font-family: "Courier New", Courier, monospace; font-size: 12px; width: 80mm; }
    #rr > div { box-shadow: none !important; border: none !important; border-radius: 0 !important; width: 80mm !important; }
  </style>
</head>
<body>
  <div id="rr">${receiptEl?.outerHTML ?? '<p>No receipt data</p>'}</div>
  <script>
    window.onload = function () {
      window.print();
      setTimeout(function () { window.close(); }, 1200);
    };
  <\/script>
</body>
</html>`;

  const popup = window.open('', '_blank', 'width=340,height=600,toolbar=0,menubar=0,location=0,status=0');
  if (!popup) { window.print(); return; }
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
}

// ─── Number-to-words helper (for ESC/POS "amount in words") ─────────────────
const ones_en = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
const tens_en = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
function twoEn(n: number): string { if (!n) return ''; if (n < 20) return ones_en[n]; return tens_en[Math.floor(n/10)] + (n%10 ? ' '+ones_en[n%10] : ''); }
function threeEn(n: number): string { const h = Math.floor(n/100), r = n%100; return (h ? ones_en[h]+' Hundred ' : '') + twoEn(r); }
export function toWordsEN(n: number): string {
  n = Math.round(n); if (!n) return 'Zero Rupees Only';
  let r = '';
  if (n >= 1e7) { r += threeEn(Math.floor(n/1e7))+' Crore '; n %= 1e7; }
  if (n >= 1e5) { r += threeEn(Math.floor(n/1e5))+' Lakh '; n %= 1e5; }
  if (n >= 1e3) { r += threeEn(Math.floor(n/1e3))+' Thousand '; n %= 1e3; }
  return (r + threeEn(n)).trim() + ' Rupees Only';
}
