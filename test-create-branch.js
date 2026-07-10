const { z } = require('zod');
const createBranchSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(200),
    address: z.string().max(500).optional(),
    city: z.string().max(100).optional(),
    phone: z.string().max(15).optional(),
    gstNumber: z.string().max(20).optional(),
    invoicePrefix: z.string().max(10).optional(),
    managerId: z.string().optional(),
  }),
});

const reqBody = {
    name: 'Test Branch',
    address: '123 Test St',
    city: 'Test City',
    pincode: '123456',
    phone: '1234567890',
    managerId: '',
    invoicePrefix: 'TS',
    isActive: true
};

try {
    createBranchSchema.parse({ body: reqBody });
    console.log("Validation passed!");
} catch (e) {
    console.log("Validation failed:", e.errors);
}
