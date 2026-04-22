import { GSTSlabBreakup, InvoiceLineItem, OrderItem } from '@restaurant/types';

const HSN_RESTAURANT = '9963';

/**
 * Build line items from order items (prices already stored at order time).
 * The GST slab per item is fetched from the MenuItem model (passed in).
 */
export function buildLineItems(
  orderItems: Array<OrderItem & { gstSlab: 5 | 12 | 18; hindiName?: string }>
): InvoiceLineItem[] {
  return orderItems.map(i => ({
    name: i.name,
    hindiName: i.hindiName,
    variantName: i.variantName,
    quantity: i.quantity,
    unitPrice: i.priceAtOrderTime,
    gstSlab: i.gstSlab,
    lineTotal: +(i.priceAtOrderTime * i.quantity).toFixed(2),
    hsnCode: HSN_RESTAURANT,
  }));
}

/**
 * Indian GST for dine-in: prices are GST-inclusive (5% = CGST 2.5% + SGST 2.5%).
 * Extract taxable amount and split.
 *
 * Formula (reverse calculation from inclusive price):
 *   taxable = lineTotal / (1 + slab/100)
 *   cgst = sgst = taxable × (slab/2) / 100
 */
export function computeGSTBreakup(
  lineItems: InvoiceLineItem[],
  discountFlat = 0
): GSTSlabBreakup[] {
  const slabMap = new Map<number, { taxable: number; cgst: number; sgst: number }>();

  const totalBeforeDiscount = lineItems.reduce((s, i) => s + i.lineTotal, 0);
  const discountRatio = totalBeforeDiscount > 0
    ? discountFlat / totalBeforeDiscount
    : 0;

  for (const item of lineItems) {
    const effectiveLine = item.lineTotal * (1 - discountRatio);
    const rate = item.gstSlab / 100;
    const taxable = +(effectiveLine / (1 + rate)).toFixed(2);
    const half = +(taxable * rate / 2).toFixed(2);

    const existing = slabMap.get(item.gstSlab) ?? { taxable: 0, cgst: 0, sgst: 0 };
    slabMap.set(item.gstSlab, {
      taxable: +(existing.taxable + taxable).toFixed(2),
      cgst:    +(existing.cgst + half).toFixed(2),
      sgst:    +(existing.sgst + half).toFixed(2),
    });
  }

  return Array.from(slabMap.entries()).map(([slab, v]) => ({
    slab: slab as 5 | 12 | 18,
    taxableAmount: v.taxable,
    cgst: v.cgst,
    sgst: v.sgst,
    total: +(v.taxable + v.cgst + v.sgst).toFixed(2),
  }));
}

/**
 * Generate invoice number: INV-YYYYMMDD-XXXX
 * XXXX is the daily sequence, padded to 4 digits.
 */
export function generateInvoiceNumber(sequence: number): string {
  const d = new Date();
  const datePart = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `INV-${datePart}-${String(sequence).padStart(4, '0')}`;
}
