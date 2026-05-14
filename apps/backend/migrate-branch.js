/**
 * One-off migration: ensure existing restaurants have at least one branch,
 * and the owner user has branchId set.
 */
const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;
  
  // Find all restaurants
  const restaurants = await db.collection('restaurants').find({}).toArray();
  console.log(`Found ${restaurants.length} restaurant(s)`);
  
  for (const rest of restaurants) {
    const existingBranch = await db.collection('branches').findOne({ restaurantId: rest._id });
    
    if (existingBranch) {
      console.log(`Restaurant "${rest.name}" already has branch "${existingBranch.name}" (${existingBranch._id})`);
      
      // Ensure the owner has this branchId
      const result = await db.collection('users').updateMany(
        { restaurantId: rest._id, branchId: { $exists: false } },
        { $set: { branchId: existingBranch._id } }
      );
      if (result.modifiedCount > 0) {
        console.log(`  → Assigned branchId to ${result.modifiedCount} user(s)`);
      }
    } else {
      console.log(`Restaurant "${rest.name}" has NO branches — creating Main Branch...`);
      const branch = {
        restaurantId: rest._id,
        name: 'Main Branch',
        address: rest.address || 'Main Location',
        city: 'City',
        pincode: '000000',
        phone: '0000000000',
        gstin: rest.gstin,
        fssaiNumber: rest.fssaiNumber,
        invoicePrefix: 'INV',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const inserted = await db.collection('branches').insertOne(branch);
      console.log(`  → Created branch: ${inserted.insertedId}`);
      
      // Assign to all users of this restaurant
      const result = await db.collection('users').updateMany(
        { restaurantId: rest._id },
        { $set: { branchId: inserted.insertedId } }
      );
      console.log(`  → Assigned branchId to ${result.modifiedCount} user(s)`);
    }
  }
  
  await mongoose.disconnect();
  console.log('\nMigration complete!');
}

run().catch(err => { console.error(err); process.exit(1); });
