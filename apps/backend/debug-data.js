const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const MenuCategory = mongoose.model('MenuCategory', new mongoose.Schema({
    restaurantId: mongoose.Schema.Types.ObjectId,
    branchId: mongoose.Schema.Types.ObjectId,
  }, { strict: false }));

  const Order = mongoose.model('Order', new mongoose.Schema({
    restaurantId: mongoose.Schema.Types.ObjectId,
    branchId: mongoose.Schema.Types.ObjectId,
  }, { strict: false }));
  
  // Find all categories
  const categories = await MenuCategory.find().limit(50);
  console.log("Categories breakdown:");
  categories.forEach(c => console.log(`Category ID: ${c._id}, RestID: ${c.restaurantId}, BranchID: ${c.branchId}`));

  const orders = await Order.find().limit(50);
  console.log("\nOrders breakdown:");
  orders.forEach(o => console.log(`Order ID: ${o._id}, RestID: ${o.restaurantId}, BranchID: ${o.branchId}`));

  process.exit(0);
}
run();
