import mongoose from 'mongoose';
import { Invoice } from './src/models/Invoice';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant-os');
  
  const restaurantId = new mongoose.Types.ObjectId("6a351977501d96817fc58175");
  const branchId = new mongoose.Types.ObjectId("6a351977501d96817fc58177");

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

  const queryAll = { restaurantId, createdAt: { $gte: todayStart, $lte: todayEnd } };
  const queryBranch = { restaurantId, branchId, createdAt: { $gte: todayStart, $lte: todayEnd } };

  const invoicesAll = await Invoice.find(queryAll).lean();
  const invoicesBranch = await Invoice.find(queryBranch).lean();

  const revAll = invoicesAll.reduce((acc, inv) => acc + (inv.grandTotalINR || 0), 0);
  const revBranch = invoicesBranch.reduce((acc, inv) => acc + (inv.grandTotalINR || 0), 0);

  console.log({ revAll, revBranch });
  process.exit(0);
}
run();
