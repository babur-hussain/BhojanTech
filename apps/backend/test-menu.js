const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const MenuCategory = mongoose.model('MenuCategory', new mongoose.Schema({
    restaurantId: mongoose.Schema.Types.ObjectId,
    branchId: mongoose.Schema.Types.ObjectId,
  }, { strict: false }));

  const MenuItem = mongoose.model('MenuItem', new mongoose.Schema({
    restaurantId: mongoose.Schema.Types.ObjectId,
    branchId: mongoose.Schema.Types.ObjectId,
  }, { strict: false }));
  
  const restIdStr = '6a132769845db0ca9a6688dc'; // User 4's restaurant
  const branchIdStr = '6a132769845db0ca9a6688de'; // User 4's branch
  
  const restId = new mongoose.Types.ObjectId(restIdStr);
  const branchId = new mongoose.Types.ObjectId(branchIdStr);

  const query = {
    restaurantId: restId,
    $or: [
      { branchId: branchId },
      { branchId: { $exists: false } },
      { branchId: null }
    ]
  };

  const cats = await MenuCategory.find(query).lean();
  console.log(`Found ${cats.length} categories for User 4`);
  
  const items = await MenuItem.find(query).lean();
  console.log(`Found ${items.length} items for User 4`);

  process.exit(0);
}
run();
