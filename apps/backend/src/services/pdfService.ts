import PDFDocument from 'pdfkit';
import { IInvoice } from '../models/Invoice';
import { IRestaurant } from '../models/Restaurant';
import path from 'path';

export const generateInvoicePDF = (invoice: IInvoice, restaurant: IRestaurant): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const buffers: Buffer[] = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);

            // --- Header ---
            doc.fontSize(20).text(restaurant.name || 'Restaurant Invoice', { align: 'center' });
            if (restaurant.address) {
                doc.fontSize(10).text(restaurant.address, { align: 'center' });
            }
            if (restaurant.contactNumber) {
                doc.text(`Phone: ${restaurant.contactNumber}`, { align: 'center' });
            }
            if (restaurant.gstin) {
                doc.text(`GSTIN: ${restaurant.gstin}`, { align: 'center' });
            }
            if (restaurant.fssaiNumber) {
                doc.text(`FSSAI: ${restaurant.fssaiNumber}`, { align: 'center' });
            }

            doc.moveDown(2);

            // --- Invoice Details ---
            doc.fontSize(12).text(`Invoice No: ${invoice.invoiceNumber}`);
            doc.text(`Date: ${invoice.createdAt ? new Date(invoice.createdAt).toLocaleString() : new Date().toLocaleString()}`);
            if (invoice.customerName) {
                doc.text(`Customer Name: ${invoice.customerName}`);
            }
            if (invoice.customerPhone) {
                doc.text(`Customer Phone: ${invoice.customerPhone}`);
            }
            
            doc.text(`Order Type: ${invoice.orderType || 'DINE_IN'}`);
            if (invoice.tableNumber) {
                doc.text(`Table: ${invoice.tableNumber}`);
            }

            doc.moveDown(1);

            // --- Table Header ---
            const startY = doc.y;
            doc.font('Helvetica-Bold');
            doc.text('Item', 50, startY);
            doc.text('Qty', 300, startY, { width: 50, align: 'center' });
            doc.text('Price', 350, startY, { width: 70, align: 'right' });
            doc.text('Total', 420, startY, { width: 70, align: 'right' });
            doc.font('Helvetica');

            let currentY = startY + 20;

            // --- Line Items ---
            invoice.lineItems.forEach((item) => {
                doc.text(item.name || 'Item', 50, currentY, { width: 250 });
                doc.text(item.quantity.toString(), 300, currentY, { width: 50, align: 'center' });
                doc.text(item.unitPrice.toFixed(2), 350, currentY, { width: 70, align: 'right' });
                doc.text(item.lineTotal.toFixed(2), 420, currentY, { width: 70, align: 'right' });
                currentY = Math.max(doc.y, currentY + 15);
                if (currentY > 750) { // Add new page if overflowing
                    doc.addPage();
                    currentY = 50;
                }
            });

            // --- Summary ---
            doc.moveDown(2);
            let summaryY = Math.max(currentY + 20, doc.y);
            const summaryX = 350;

            doc.text('Subtotal:', summaryX, summaryY);
            doc.text(invoice.subtotalINR.toFixed(2), summaryX + 70, summaryY, { width: 70, align: 'right' });
            summaryY += 15;

            if (invoice.discount && invoice.discount.flatAmount > 0) {
                doc.text('Discount:', summaryX, summaryY);
                doc.text(`-${invoice.discount.flatAmount.toFixed(2)}`, summaryX + 70, summaryY, { width: 70, align: 'right' });
                summaryY += 15;
            }

            if (invoice.totalGSTINR > 0) {
                doc.text('Total GST:', summaryX, summaryY);
                doc.text(invoice.totalGSTINR.toFixed(2), summaryX + 70, summaryY, { width: 70, align: 'right' });
                summaryY += 15;
            }

            if (invoice.roundOff !== 0) {
                doc.text('Round Off:', summaryX, summaryY);
                doc.text(invoice.roundOff.toFixed(2), summaryX + 70, summaryY, { width: 70, align: 'right' });
                summaryY += 15;
            }

            doc.font('Helvetica-Bold');
            doc.text('Grand Total:', summaryX, summaryY);
            doc.text(invoice.grandTotalINR.toFixed(2), summaryX + 70, summaryY, { width: 70, align: 'right' });
            doc.font('Helvetica');
            summaryY += 25;

            // --- Footer ---
            doc.moveDown(2);
            doc.text('Thank you for your visit!', { align: 'center' });

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
};
