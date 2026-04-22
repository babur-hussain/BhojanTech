const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, '../apps/backend/src/models');
const files = fs.readdirSync(modelsDir).filter(f => f.endsWith('.ts'));

let updatedCount = 0;

for (const file of files) {
    if (['User.ts', 'Branch.ts', 'MenuItem.ts', 'StaffMember.ts'].includes(file)) continue;

    const filePath = path.join(modelsDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');

    // If already modified, skip
    if (content.includes('branchId:')) continue;

    // Append branchId logic for mongoose ObjectId correctly
    // 1. Interface (looking for restaurantId: mongoose.Types.ObjectId)
    if (content.match(/restaurantId:\s*mongoose\.Types\.ObjectId;/)) {
        content = content.replace(
            /restaurantId:\s*mongoose\.Types\.ObjectId;/,
            "restaurantId: mongoose.Types.ObjectId;\n  branchId: mongoose.Types.ObjectId;"
        );
    }

    // 2. Schema
    if (content.match(/restaurantId:\s*\{\s*type:\s*Schema\.Types\.ObjectId.*?\},/)) {
        content = content.replace(
            /restaurantId:\s*(.*?)(required:\s*true.*?)\},/,
            "restaurantId: $1$2},\n    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },"
        );
    }

    // 3. Index & Export
    const schemaVarMatch = content.match(/const\s+(\w+Schema)\s*=/);
    if (schemaVarMatch) {
        const schemaName = schemaVarMatch[1];
        if (content.match(/\nexport const /)) {
            content = content.replace(/\nexport const /, `\n${schemaName}.index({ restaurantId: 1, branchId: 1, createdAt: -1 });\n\nexport const `);
        }
    }

    fs.writeFileSync(filePath, content);
    updatedCount++;
}

console.log(`Successfully added branchId to ${updatedCount} model schemas.`);
