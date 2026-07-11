import mongoose from 'mongoose';
import { Customer } from './src/models/Customer';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('Connected');

  const phone = '1234567890';
  const restaurantId = new mongoose.Types.ObjectId();

  try {
    console.log('Creating customer...');
    await Customer.create({
      restaurantId,
      phone,
      name: 'Test',
      firstVisitDate: new Date(),
      lastVisitDate: new Date(),
      referralCode: 'TESTREF' + Date.now()
    });

    console.log('Customer created. Finding with dummy encryption...');
    
    // Create a dummy document just to encrypt the phone
    const dummy = new Customer({ phone });
    dummy.encryptFieldsSync();
    const encryptedPhone = dummy.phone;
    console.log('Encrypted phone via dummy:', encryptedPhone);

    const found = await Customer.findOne({ restaurantId, phone: encryptedPhone });
    console.log('Found?', !!found);
    if (!found) {
        console.log('WARNING: findOne returned null even with manual encryption.');
    } else {
        console.log('SUCCESS: findOne works with dummy.phone.');
    }

    // Cleanup
    await Customer.deleteOne({ restaurantId, phone });
  } catch (error: any) {
    console.error('Error:', error.message);
  }

  process.exit(0);
}

run();
