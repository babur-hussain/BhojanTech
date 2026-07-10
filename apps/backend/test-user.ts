import mongoose from 'mongoose';
import { User } from './src/models/User';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant-os');
  const user = await User.findOne({ name: /paras lokhande/i }).lean();
  console.log("paras lokhande:");
  console.log(JSON.stringify(user, null, 2));
  process.exit(0);
}
run();
