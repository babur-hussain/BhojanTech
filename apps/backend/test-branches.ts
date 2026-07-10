import mongoose from 'mongoose';
import { Branch } from './src/models/Branch';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant-os');
  
  const restaurantId = new mongoose.Types.ObjectId("6a351977501d96817fc58175");
  const branches = await Branch.find({ restaurantId }).lean();

  console.log(branches);
  process.exit(0);
}
run();
