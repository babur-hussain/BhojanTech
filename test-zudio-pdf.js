const { generateInvoicePDF } = require('./apps/backend/dist/services/pdfService.js');
const fs = require('fs');

const mockInvoice = {
    invoiceNumber: 'Z549-100102465',
    createdAt: new Date('2024-04-21T20:08:30.000Z'),
    waiterName: 'EMP000001',
    customerName: 'WALK-IN',
    customerPhone: '7249492581',
    tableNumber: '6',
    orderType: 'DINE_IN',
    lineItems: [
        {
            name: 'STMC01 ST R11 647 LS WCT SB',
            variantName: '300971205002',
            hsnCode: '61091000',
            quantity: 1,
            unitPrice: 799.00,
            lineTotal: 799.00,
            gstSlab: 5
        }
    ],
    subtotalINR: 760.96,
    discount: { flatAmount: 0 },
    roundOff: 0,
    totalGSTINR: 38.04,
    grandTotalINR: 799.00,
    payments: [{ mode: 'CREDIT CARD', amountINR: 799.00 }],
    paymentMode: 'CREDIT CARD',
    amountPaidINR: 799.00,
    gstBreakup: [
        { slab: 5, taxableAmount: 760.96, cgst: 19.02, sgst: 19.02, total: 38.04 }
    ]
};

const mockRestaurant = {
    name: 'Zudio',
    address: 'Zudio - Koregaon Park Northern Gate Pune Northern Gates, Meera Nagar, Koregaon Park, 412202 (Regd. Office - Bombay House 24 Home Modi Street, Mumbai - 400001)',
    contactNumber: 'NA',
};

async function test() {
    try {
        const buffer = await generateInvoicePDF(mockInvoice, mockRestaurant);
        fs.writeFileSync('/Users/baburhussain/.gemini/antigravity-ide/brain/ea4da8f0-0a9e-461f-8e26-98191c74c2f1/zudio_test.pdf', buffer);
        console.log('PDF generated at /Users/baburhussain/.gemini/antigravity-ide/brain/ea4da8f0-0a9e-461f-8e26-98191c74c2f1/zudio_test.pdf');
    } catch (e) {
        console.error(e);
    }
}

test();
