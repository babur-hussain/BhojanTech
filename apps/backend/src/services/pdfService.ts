import PDFDocument from 'pdfkit';
import axios from 'axios';
import { IInvoice } from '../models/Invoice';
import { IRestaurant } from '../models/Restaurant';

export const generateInvoicePDF = (invoice: IInvoice, restaurant: IRestaurant): Promise<Buffer> => {
    return new Promise(async (resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
            const buffers: Buffer[] = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);

            const pageWidth = 595.28;
            const rightMargin = 50;
            const width = pageWidth - 100; // 495.28

            // helper for page breaks
            const checkPageBreak = (requiredHeight: number) => {
                if (doc.y + requiredHeight > 780) {
                    doc.addPage();
                    doc.y = 50;
                }
            };

            // --- Header Section ---
            let startY = 50;
            let logoBuffer: Buffer | null = null;
            
            if (restaurant.logoUrl) {
                try {
                    const response = await axios.get(restaurant.logoUrl, { responseType: 'arraybuffer', timeout: 5000 });
                    logoBuffer = Buffer.from(response.data, 'binary');
                } catch (e) {
                    console.error("Failed to load logo for PDF:", e);
                }
            }

            if (logoBuffer) {
                // center the logo
                doc.image(logoBuffer, 50, startY, { fit: [width, 60], align: 'center' });
                doc.y = startY + 75;
            } else {
                doc.y = startY;
                doc.font('Helvetica-Bold').fontSize(24).fillColor('#111827');
                doc.text(restaurant.name.toUpperCase(), 50, doc.y, { align: 'center', characterSpacing: 2 });
                doc.moveDown(0.5);
            }

            doc.font('Helvetica-Bold').fontSize(12).fillColor('#374151');
            doc.text(`${restaurant.name} - ${invoice.branchId ? 'Branch' : 'HQ'}`, 50, doc.y, { align: 'center' });
            doc.moveDown(0.2);
            doc.font('Helvetica').fontSize(9).fillColor('#6B7280');
            doc.text(restaurant.address || 'Address Not Available', 50, doc.y, { align: 'center' });
            doc.moveDown(0.2);
            doc.text(`Contact: ${restaurant.contactNumber || 'NA'}`, 50, doc.y, { align: 'center' });

            // --- Black Banner ---
            doc.moveDown(1.5);
            const bannerY = doc.y;
            doc.rect(50, bannerY, width, 60).fill('#000000');
            doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(11);
            doc.text('WE ARE NEVER HAPPY, TILL YOU ARE HAPPY.', 50, bannerY + 15, { align: 'center', width: width });
            doc.text('TELL US HOW WE DID.', 50, bannerY + 28, { align: 'center', width: width });
            doc.font('Helvetica').fontSize(9);
            doc.text('TAP TO GIVE FEEDBACK', 50, bannerY + 42, { align: 'center', width: width });
            
            // --- Title ---
            doc.y = bannerY + 80;
            doc.fillColor('#000000').font('Helvetica-Bold').fontSize(11);
            doc.text('TAX INVOICE', 50, doc.y, { align: 'center', width: width });

            // --- Metadata Columns ---
            doc.moveDown(2);
            const metaY = doc.y;
            
            // Left Column
            // Left Column
            doc.font('Helvetica-Bold').fontSize(9);
            const dateStr = invoice.createdAt ? new Date(invoice.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'short', timeStyle: 'medium' }) : 'NA';
            
            doc.text('Date & Time : ', 50, metaY);
            doc.font('Helvetica').text(dateStr, 120, metaY);
            
            doc.font('Helvetica-Bold').text('Bill : ', 50, metaY + 15);
            doc.font('Helvetica').text(invoice.invoiceNumber, 80, metaY + 15);
            
            doc.font('Helvetica-Bold').text('Cashier : ', 50, metaY + 30);
            doc.font('Helvetica').text(invoice.waiterName || 'NA', 95, metaY + 30);

            doc.moveDown(1.5);
            const customerY = doc.y;
            doc.font('Helvetica-Bold').text('Customer ID : ', 50, customerY);
            doc.font('Helvetica').text(invoice.customerName ? invoice.customerName.toUpperCase() : 'WALK-IN', 120, customerY);
            
            doc.font('Helvetica-Bold').text('Mobile No : ', 50, customerY + 15);
            doc.font('Helvetica');
            const mobileX = 105;
            const mobileText = invoice.customerPhone || 'NA';
            doc.text(mobileText, mobileX, customerY + 15);
            doc.underline(mobileX, customerY + 15, doc.widthOfString(mobileText), 9);

            // Right Column
            doc.font('Helvetica-Bold').text('POS : ', 400, metaY);
            doc.font('Helvetica').text(invoice.tableNumber || '1', 435, metaY);

            // --- Line Items Table Header ---
            doc.y = customerY + 45;
            const headerY = doc.y;
            doc.font('Helvetica-Bold').fontSize(9);
            doc.text('Description', 50, headerY);
            doc.text('QTY', 250, headerY);
            doc.text('Unit Amt', 350, headerY, { width: 145, align: 'right' });
            
            doc.text('Item Code | HSN', 50, headerY + 15);
            doc.text('Total Amt', 350, headerY + 15, { width: 145, align: 'right' });
            
            doc.text('Tax (CGST & SGST)', 50, headerY + 30);
            doc.text('Taxable Amt', 350, headerY + 30, { width: 145, align: 'right' });
            
            doc.y = headerY + 55;

            // --- Line Items ---
            let totalQty = 0;
            invoice.lineItems.forEach((item) => {
                checkPageBreak(50);
                const currentY = doc.y;
                totalQty += item.quantity;
                
                doc.font('Helvetica').fontSize(9);
                doc.text(item.name.toUpperCase(), 50, currentY, { width: 180 });
                doc.text(`${item.quantity} PC`, 250, currentY);
                doc.text(`Rs. ${item.unitPrice.toFixed(2)}`, 350, currentY, { width: 145, align: 'right' });
                
                // item code & hsn
                const itemCode = item.variantName || 'NA';
                const hsnCode = item.hsnCode || 'NA';
                doc.text(`${itemCode} | HSN: ${hsnCode}`, 50, currentY + 15);
                doc.text(`Rs. ${item.lineTotal.toFixed(2)}`, 350, currentY + 15, { width: 145, align: 'right' });
                
                // taxes & taxable amount
                const taxableAmt = item.lineTotal / (1 + (item.gstSlab / 100));
                const totalTax = item.lineTotal - taxableAmt;
                const halfSlab = (item.gstSlab / 2).toFixed(1);
                const halfTax = (totalTax / 2).toFixed(2);
                
                doc.font('Helvetica').fontSize(8.5).fillColor('#4B5563');
                doc.text(`CGST: ${halfSlab}% (Rs. ${halfTax}) | SGST: ${halfSlab}% (Rs. ${halfTax})`, 50, currentY + 30);
                doc.font('Helvetica').fontSize(9).fillColor('#000000');
                doc.text(`Rs. ${taxableAmt.toFixed(2)}`, 350, currentY + 30, { width: 145, align: 'right' });
                
                doc.y = currentY + 55;
            });

            // --- Totals Section ---
            checkPageBreak(80);
            doc.moveDown(1);
            let summaryY = doc.y;
            doc.font('Helvetica-Bold').fontSize(9);
            
            doc.text(`Total QTY : ${totalQty}`, 50, summaryY);
            doc.text(`Total Items : ${invoice.lineItems.length}`, 200, summaryY);
            doc.text(`Grand Total : Rs. ${invoice.grandTotalINR.toFixed(2)}`, 350, summaryY, { width: 145, align: 'right' });

            summaryY += 20;
            doc.font('Helvetica-Bold');
            doc.text('Total Discount', 50, summaryY);
            doc.font('Helvetica').text(`Rs. ${(invoice.discount?.flatAmount || 0).toFixed(2)}`, 350, summaryY, { width: 145, align: 'right' });
            
            summaryY += 15;
            doc.font('Helvetica-Bold');
            doc.text('Net Payable', 50, summaryY);
            doc.text(`Rs. ${invoice.grandTotalINR.toFixed(2)}`, 350, summaryY, { width: 145, align: 'right' });

            // --- Payment Methods ---
            checkPageBreak(50);
            summaryY += 25;
            doc.font('Helvetica-Bold').text('Payment Methods', 50, summaryY);
            
            let paymentY = summaryY + 15;
            doc.font('Helvetica');
            if (invoice.payments && invoice.payments.length > 0) {
                invoice.payments.forEach(p => {
                    doc.text(p.mode, 50, paymentY);
                    if (p.mode === 'CARD') {
                        doc.text('************9999', 200, paymentY);
                    }
                    doc.text(`Rs. ${p.amountINR.toFixed(2)}`, 350, paymentY, { width: 145, align: 'right' });
                    paymentY += 15;
                });
            } else {
                doc.text(invoice.paymentMode, 50, paymentY);
                if (invoice.paymentMode === 'CARD') {
                    doc.text('************9999', 200, paymentY);
                }
                doc.text(`Rs. ${invoice.amountPaidINR.toFixed(2)}`, 350, paymentY, { width: 145, align: 'right' });
                paymentY += 15;
            }

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};
