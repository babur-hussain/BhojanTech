const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to DB");
  
  const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }));
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const Branch = mongoose.model('Branch', new mongoose.Schema({}, { strict: false }));
  
  const users = await User.find({ role: { $in: ['OWNER', 'SUPER_OWNER', 'BRANCH_MANAGER'] } }).limit(5);
  console.log("Found users:", users.map(u => ({ id: u._id, role: u.role, restId: u.restaurantId, branchId: u.branchId, selected: u.selectedBranchId })));

  const orders = await Order.find({ status: { $in: ['OPEN', 'BILLED'] } }).limit(5);
  console.log("Active orders count:", orders.length);
  if (orders.length > 0) {
    console.log("Sample order branchId:", orders[0].branchId);
  }

  process.exit(0);
}
run();
