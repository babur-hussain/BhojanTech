require('dotenv').config();
const mongoose = require('mongoose');
const { Customer } = require('./src/models/Customer');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://bhojantech:8gqK28uT7Z7N9VDE@cluster0.z5i6k.mongodb.net/test');
  
  // Find a customer directly
  const c = await Customer.findOne({ name: 'Babur' });
  if (c) {
    console.log('Customer phone raw:', c.phone);
    if (c.decryptFieldsSync) c.decryptFieldsSync();
    console.log('Customer phone after decrypt:', c.phone);
    const obj = c.toJSON();
    console.log('Customer phone in toJSON:', obj.phone);
  } else {
    console.log('Babur not found');
  }
  process.exit(0);
}
test();
