import { Request, Response } from 'express';
import QRCode from 'qrcode';
import { Table } from '../models/Table';

// Generate raw SVG string
export const generateTableQrCodeSVG = async (req: Request, res: Response) => {
    try {
        const { tableId } = req.params;
        const table = await Table.findById(tableId);

        if (!table) {
            return res.status(404).json({ error: 'Table not found' });
        }

        const baseUrl = process.env.CUSTOMER_APP_URL || 'http://localhost:3001';
        const orderUrl = `${baseUrl}/table/${table.restaurantId}/${tableId}`;

        // Generate high resolution SVG
        const svgString = await QRCode.toString(orderUrl, {
            type: 'svg',
            color: {
                dark: '#000000',  // Dark pixels
                light: '#ffffff' // Light pixels
            },
            margin: 1,
        });

        res.setHeader('Content-Type', 'image/svg+xml');
        res.status(200).send(svgString);
    } catch (error) {
        console.error('QR Generate Error:', error);
        res.status(500).json({ error: 'Failed to generate QR code' });
    }
};

// Generate a full PDF grid of all tables for a restaurant
export const downloadAllTableQRsPDF = async (req: Request, res: Response) => {
    try {
        // PDFKit requires importing dynamically or having an active stream.
        // We already have pdfkit in dependencies from earlier.
        const PDFDocument = require('pdfkit');
        const { restaurantId } = req.params;

        const tables = await Table.find({ restaurantId }).sort({ number: 1 });

        if (tables.length === 0) {
            return res.status(404).json({ error: 'No tables found for this restaurant' });
        }

        const doc = new PDFDocument({ margin: 30, size: 'A4' });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Table-QRs-${restaurantId}.pdf"`);

        doc.pipe(res);

        // Simple Grid PDF Layout (A4 size approx 595 x 842 points)
        const margin = 30;
        const qrSize = 150;
        const spacing = 30;
        const startX = margin;
        const startY = margin;

        let x = startX;
        let y = startY;
        const baseUrl = process.env.CUSTOMER_APP_URL || 'http://localhost:3001';

        for (let i = 0; i < tables.length; i++) {
            const table = tables[i];
            const url = `${baseUrl}/table/${table.restaurantId}/${table._id}`;

            // Use toDataURL for image embedded inside PDF
            const qrDataUrl = await QRCode.toDataURL(url, { margin: 1, width: qrSize });

            // Draw Border
            doc.rect(x - 10, y - 10, qrSize + 20, qrSize + 60).stroke();

            // Logo/Header placeholder
            doc.fontSize(14).text('Scan to Order', x, y + qrSize + 10, { width: qrSize, align: 'center' });
            doc.fontSize(18).text(`Table ${table.number}`, x, y + qrSize + 30, { width: qrSize, align: 'center' });

            // Embed Image
            doc.image(qrDataUrl, x, y, { width: qrSize });

            x += qrSize + spacing + 20;

            // Wrap to next row
            if (x + qrSize > 595 - margin) {
                x = startX;
                y += qrSize + spacing + 60;
            }

            // New page if out of space
            if (y + qrSize + 60 > 842 - margin) {
                doc.addPage();
                x = startX;
                y = startY;
            }
        }

        doc.end();

    } catch (error) {
        console.error('PDF Generate Error:', error);
        // Already piped response means we can't easily send JSON if it fails mid-way,
        // but if it fails before piping we can.
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to generate PDF' });
        }
    }
};
