import mongoose from 'mongoose';
import { Customer } from './src/models/Customer';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
    await mongoose.connect(process.env.MONGODB_URI as string);
    const customers = await Customer.find().limit(2);
    
    console.log("Raw documents:");
    console.log(customers.map(c => ({ phone: c.phone, __enc_phone: (c as any).__enc_phone })));

    customers.forEach((c: any) => {
        if (c.decryptFieldsSync) c.decryptFieldsSync();
    });

    console.log("After manual decrypt:");
    console.log(customers.map(c => ({ phone: c.phone, __enc_phone: (c as any).__enc_phone })));
    
    console.log("After toJSON():");
    console.log(customers.map(c => c.toJSON()));
    
    process.exit(0);
}
run();
