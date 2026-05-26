import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { Customer } from './src/models/Customer';

async function test() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://bhojantech:8gqK28uT7Z7N9VDE@cluster0.z5i6k.mongodb.net/test');
  
  const all = await Customer.find({});
  for(let c of all) {
    if (c.phone === '6264134364') {
        console.log('Found unencrypted 6264134364!');
    }
  }

  const c = await Customer.findOne({ name: 'Babur' });
  if (c) {
    console.log('Customer phone raw:', c.phone);
    if (c.decryptFieldsSync) c.decryptFieldsSync();
    console.log('Customer phone after decrypt:', c.phone);
    const obj = c.toJSON ? c.toJSON() : c;
    console.log('Customer phone in toJSON:', obj.phone);
  } else {
    console.log('Babur not found');
  }
  process.exit(0);
}
test();
