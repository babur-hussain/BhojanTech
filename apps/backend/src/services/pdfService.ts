import PDFDocument from 'pdfkit';
import { IInvoice } from '../models/Invoice';
import { IRestaurant } from '../models/Restaurant';

export const generateInvoicePDF = (invoice: IInvoice, restaurant: IRestaurant): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
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
            doc.font('Helvetica-Bold').fontSize(26).fillColor('#000000');
            // Mocking Zudio style lowercase logo using restaurant name with character spacing
            doc.text(restaurant.name.toLowerCase(), 50, 48, { width: 250, align: 'left', characterSpacing: 1.5 });

            doc.font('Helvetica-Bold').fontSize(10);
            doc.text(`${restaurant.name} - ${invoice.branchId ? 'Branch' : 'HQ'}`, 300, 50, { width: width - 250, align: 'right' });
            doc.font('Helvetica').fontSize(9).fillColor('#00BCD4');
            doc.text('Store Details >', 300, 65, { width: width - 250, align: 'right' });

            // --- Black Banner ---
            doc.moveDown(1.5);
            const bannerY = doc.y;
            doc.rect(50, bannerY, width, 60).fill('#000000');
            doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(11);
            doc.text('WE ARE NEVER HAPPY, TILL YOU ARE HAPPY.', 50, bannerY + 15, { align: 'center', width: width });
            doc.text('TELL US HOW WE DID.', 50, bannerY + 28, { align: 'center', width: width });
            doc.font('Helvetica').fontSize(9);
            doc.text('TAP TO GIVE FEEDBACK', 50, bannerY + 42, { align: 'center', width: width });
            
            // --- Title & Store Info ---
            doc.y = bannerY + 80;
            doc.fillColor('#000000').font('Helvetica-Bold').fontSize(11);
            doc.text('TAX INVOICE', 50, doc.y, { align: 'center', width: width });
            
            doc.moveDown(1);
            doc.fontSize(9).font('Helvetica');
            doc.text(`Store Contact Number : ${restaurant.contactNumber || 'NA'}`, 50, doc.y, { align: 'center', width: width });

            doc.moveDown(0.5);
            doc.text(`Place Of Supply : ${restaurant.address || 'NA'}`, 50, doc.y, { align: 'center', width: width });

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
            
            doc.text('Item Code', 50, headerY + 15);
            doc.text('Total Amt', 350, headerY + 15, { width: 145, align: 'right' });
            
            doc.text('HSN Code', 50, headerY + 30);
            doc.text('Taxable Amount', 350, headerY + 30, { width: 145, align: 'right' });
            
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
                
                // item code (mocked with SKU or NA)
                doc.text(item.variantName || 'NA', 50, currentY + 15);
                doc.text(`Rs. ${item.lineTotal.toFixed(2)}`, 350, currentY + 15, { width: 145, align: 'right' });
                
                // hsn code & taxable amount
                const taxableAmt = item.lineTotal / (1 + (item.gstSlab / 100));
                doc.text(item.hsnCode || 'NA', 50, currentY + 30);
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

            // --- Footer (Tax Breakdown) ---
            checkPageBreak(60);
            doc.y = paymentY + 20;
            const taxBoxY = doc.y;
            
            // Draw dashed box
            // Note: saving and restoring graphics state prevents dash affecting other elements if we draw later
            doc.save();
            doc.rect(50, taxBoxY, width, 40).dash(3, { space: 3 }).stroke();
            doc.restore();

            doc.font('Helvetica-Bold').fontSize(8);
            doc.text('HSN Code', 60, taxBoxY + 15);
            
            // CGST Header
            doc.text('CGST', 200, taxBoxY + 5, { width: 100, align: 'center' });
            doc.text('Rate', 180, taxBoxY + 25);
            doc.text('Amt', 260, taxBoxY + 25);
            // SGST Header
            doc.text('SGST', 350, taxBoxY + 5, { width: 100, align: 'center' });
            doc.text('Rate', 330, taxBoxY + 25);
            doc.text('Amt', 410, taxBoxY + 25);
            
            // Draw internal dashed lines for the table structure inside the box
            doc.save();
            // Vertical separators
            doc.moveTo(160, taxBoxY).lineTo(160, taxBoxY + 40).dash(3, {space:3}).stroke();
            doc.moveTo(310, taxBoxY).lineTo(310, taxBoxY + 40).dash(3, {space:3}).stroke();
            // Horizontal separator under CGST/SGST
            doc.moveTo(160, taxBoxY + 20).lineTo(310, taxBoxY + 20).dash(3, {space:3}).stroke();
            doc.moveTo(310, taxBoxY + 20).lineTo(460, taxBoxY + 20).dash(3, {space:3}).stroke();
            // Vertical sub-separators
            doc.moveTo(235, taxBoxY + 20).lineTo(235, taxBoxY + 40).dash(3, {space:3}).stroke();
            doc.moveTo(385, taxBoxY + 20).lineTo(385, taxBoxY + 40).dash(3, {space:3}).stroke();
            doc.restore();

            // Populate Tax Rows
            let taxRowY = taxBoxY + 40;
            if (invoice.gstBreakup && invoice.gstBreakup.length > 0) {
                invoice.gstBreakup.forEach(tax => {
                    doc.save();
                    // Extend the box
                    doc.rect(50, taxBoxY, width, (taxRowY - taxBoxY) + 20).dash(3, { space: 3 }).stroke();
                    // Draw vertical separators down
                    doc.moveTo(160, taxRowY).lineTo(160, taxRowY + 20).dash(3, {space:3}).stroke();
                    doc.moveTo(310, taxRowY).lineTo(310, taxRowY + 20).dash(3, {space:3}).stroke();
                    doc.moveTo(235, taxRowY).lineTo(235, taxRowY + 20).dash(3, {space:3}).stroke();
                    doc.moveTo(385, taxRowY).lineTo(385, taxRowY + 20).dash(3, {space:3}).stroke();
                    doc.restore();
                    
                    doc.font('Helvetica').fontSize(8);
                    // Use a fallback HSN if we don't have it on the breakup level.
                    // Ideally, GST breakup should group by HSN, but our model just has slab.
                    doc.text('MULTIPLE', 60, taxRowY + 5); 
                    
                    const cgstRate = (tax.slab / 2).toFixed(2) + '%';
                    const sgstRate = (tax.slab / 2).toFixed(2) + '%';
                    
                    doc.text(cgstRate, 180, taxRowY + 5);
                    doc.text(`Rs. ${tax.cgst.toFixed(2)}`, 260, taxRowY + 5);
                    
                    doc.text(sgstRate, 330, taxRowY + 5);
                    doc.text(`Rs. ${tax.sgst.toFixed(2)}`, 410, taxRowY + 5);
                    
                    taxRowY += 20;
                });
            } else {
                 doc.save();
                 doc.rect(50, taxBoxY, width, 60).dash(3, { space: 3 }).stroke();
                 doc.moveTo(160, taxRowY).lineTo(160, taxRowY + 20).dash(3, {space:3}).stroke();
                 doc.moveTo(310, taxRowY).lineTo(310, taxRowY + 20).dash(3, {space:3}).stroke();
                 doc.moveTo(235, taxRowY).lineTo(235, taxRowY + 20).dash(3, {space:3}).stroke();
                 doc.moveTo(385, taxRowY).lineTo(385, taxRowY + 20).dash(3, {space:3}).stroke();
                 doc.restore();
                 doc.font('Helvetica').fontSize(8);
                 doc.text('NA', 60, taxRowY + 5);
                 doc.text('0.00%', 180, taxRowY + 5);
                 doc.text('Rs. 0.00', 260, taxRowY + 5);
                 doc.text('0.00%', 330, taxRowY + 5);
                 doc.text('Rs. 0.00', 410, taxRowY + 5);
            }

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};
