import { Request, Response } from 'express';
import { Invoice } from '../models/Invoice';
import { Restaurant } from '../models/Restaurant';
import { generateInvoicePDF } from '../services/pdfService';

/**
 * Public route to download an invoice as a PDF.
 * This is used so that Meta / LoomiFlow can fetch the document to send via WhatsApp.
 */
export const downloadInvoicePDF = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ error: 'Invalid invoice ID' });
        }

        const invoice = await Invoice.findById(id);
        if (!invoice) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        const restaurant = await Restaurant.findById(invoice.restaurantId);
        if (!restaurant) {
            return res.status(404).json({ error: 'Restaurant not found' });
        }

        const pdfBuffer = await generateInvoicePDF(invoice, restaurant);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="Invoice-${invoice.invoiceNumber}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        
        return res.send(pdfBuffer);
    } catch (error) {
        console.error('Error generating PDF:', error);
        return res.status(500).json({ error: 'Server error while generating PDF' });
    }
};
