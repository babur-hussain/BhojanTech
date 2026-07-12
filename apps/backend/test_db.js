const mongoose = require('mongoose');
const { MenuCategory } = require('./src/models/MenuCategory.ts');
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI).then(async () => {
    // Assuming ts-node or similar is needed, but this is a ts file.
    // Let's just query raw
    const cats = await mongoose.connection.collection('menucategories').find({}).toArray();
    console.log(cats.map(c => ({ id: c._id, name: c.name, branchId: c.branchId, resId: c.restaurantId })));
    process.exit(0);
});
