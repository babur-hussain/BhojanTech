import mongoose from 'mongoose';
import { Invoice } from './src/models/Invoice';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant-os');
  
  const restaurantId = new mongoose.Types.ObjectId("6a351977501d96817fc58175");
  const branchId = new mongoose.Types.ObjectId("6a351977501d96817fc58177");

  const queryAll = { restaurantId };
  const queryBranch = { restaurantId, branchId };

  const invoicesAll = await Invoice.countDocuments(queryAll);
  const invoicesBranch = await Invoice.countDocuments(queryBranch);

  console.log({ invoicesAll, invoicesBranch });
  process.exit(0);
}
run();
