const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, '../apps/backend/src/controllers');
const files = fs.readdirSync(controllersDir).filter(f => f.endsWith('.ts'));

let updatedFiles = 0;

for (const file of files) {
    const filePath = path.join(controllersDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    let originalContent = content;

    // Replace { restaurantId: req.user!.restaurantId } inside queries with branchId spread
    const regex = /\{\s*restaurantId:\s*(req\.user!\.restaurantId|restaurantId)\s*\}/g;

    content = content.replace(regex, (match, idStr) => {
        return `{ restaurantId: ${idStr}, ...(req.query.branchId && typeof req.query.branchId === 'string' ? { branchId: req.query.branchId } : {}) }`;
    });

    // Also replace some cases where there's other params: { restaurantId: ..., status: ... }
    // Only where restaurantId is the first param
    const compRegex = /\{\s*restaurantId:\s*(req\.user!\.restaurantId|restaurantId)\s*,/g;
    content = content.replace(compRegex, (match, idStr) => {
        return `{ restaurantId: ${idStr}, ...(req.query.branchId && typeof req.query.branchId === 'string' ? { branchId: req.query.branchId } : {}),`;
    });

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        console.log(`Patched queries in ${file}`);
        updatedFiles++;
    }
}

console.log(`Successfully patched db queries in ${updatedFiles} files.`);
