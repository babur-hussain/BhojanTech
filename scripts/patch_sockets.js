const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, '../apps/backend/src/controllers');
const files = fs.readdirSync(controllersDir).filter(f => f.endsWith('.ts'));

let updatedFiles = 0;

for (const file of files) {
    const filePath = path.join(controllersDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    let originalContent = content;

    // Replacements
    content = content.replace(/io\.to\(\`restaurant_\$\{req\.user!\.restaurantId\}\`\)/g, "io.to(`restaurant_${req.user!.restaurantId}_branch_${req.user!.branchId}`)");

    content = content.replace(/io\.to\(\`restaurant_\$\{order\.restaurantId\}\`\)/g, "io.to(`restaurant_${order.restaurantId}_branch_${order.branchId}`)");

    content = content.replace(/io\.to\(\`restaurant_\$\{restaurantId\}\`\)/g, "io.to(`restaurant_${restaurantId}_branch_${req.user!.branchId}`)");

    content = content.replace(/io\.to\(\`restaurant_\$\{kot\.restaurantId\}\`\)/g, "io.to(`restaurant_${kot.restaurantId}_branch_${kot.branchId}`)");

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        console.log(`Updated sockets in ${file}`);
        updatedFiles++;
    }
}

// Special case for billing.controller.ts -> Invoice prefixing logic
const billingPath = path.join(controllersDir, 'billing.controller.ts');
let billingCode = fs.readFileSync(billingPath, 'utf-8');

if (!billingCode.includes('import { Branch }')) {
    billingCode = billingCode.replace("import { Invoice } from '../models/Invoice';", "import { Invoice } from '../models/Invoice';\nimport { Branch } from '../models/Branch';");
}

if (!billingCode.includes('const branch = await Branch.findById')) {
    billingCode = billingCode.replace(
        /const sequence = await \(Invoice as any\)\.todaySequence\(restaurantId\);[\s\S]*?const invoiceNumber = \`INV-\$\{dateStr\}-\$\{sequence.toString\(\)\.padStart\(3, '0'\)\}\`;/,
        `const sequence = await (Invoice as any).todaySequence(restaurantId, order.branchId);
    const branch = await Branch.findById(order.branchId);
    let prefix = branch && branch.invoicePrefix ? branch.invoicePrefix : 'INV';
    const invoiceNumber = \`\${prefix}-\${dateStr}-\${sequence.toString().padStart(3, '0')}\`;`
    );
    fs.writeFileSync(billingPath, billingCode);
    console.log('Updated invoice numbering prefix in billing.controller.ts');
}

console.log('Completed patching controllers.');
