const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');
    
    // Find open or billed orders
    const Order = mongoose.connection.collection('orders');
    
    const count = await Order.countDocuments({ status: { $in: ['OPEN', 'BILLED'] } });
    console.log(`Found ${count} open/billed orders. Updating them to CANCELLED...`);
    
    const res = await Order.updateMany(
      { status: { $in: ['OPEN', 'BILLED'] } },
      { $set: { status: 'CANCELLED', paymentStatus: 'FAILED', notes: 'Auto-closed stale order' } }
    );
    
    console.log(`Modified ${res.modifiedCount} orders.`);

    // Also free up all tables just in case
    const Table = mongoose.connection.collection('tables');
    const tableRes = await Table.updateMany(
      {},
      { $set: { status: 'AVAILABLE', currentOrderId: null, seatedAt: null } }
    );
    console.log(`Freed up ${tableRes.modifiedCount} tables.`);

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected');
  }
}

run();
