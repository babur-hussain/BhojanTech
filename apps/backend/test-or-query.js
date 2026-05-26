const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const MenuCategory = mongoose.model('MenuCategory', new mongoose.Schema({
    restaurantId: mongoose.Schema.Types.ObjectId,
    branchId: mongoose.Schema.Types.ObjectId,
  }, { strict: false }));
  
  // Try with string
  const stringBranchId = '6a064f226d039db9c478b4dc';
  const restId = '6a064f226d039db9c478b4da';
  
  console.log("Running standard query...");
  const standard = await MenuCategory.find({ restaurantId: restId, branchId: stringBranchId });
  console.log("Standard returned:", standard.length);
  
  console.log("Running $or query with string...");
  const orQuery = await MenuCategory.find({ 
    restaurantId: restId, 
    $or: [
      { branchId: stringBranchId },
      { branchId: { $exists: false } },
      { branchId: null }
    ] 
  });
  console.log("$or string returned:", orQuery.length);

  process.exit(0);
}
run();
