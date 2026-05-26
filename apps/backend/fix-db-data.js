const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const Branch = mongoose.model('Branch', new mongoose.Schema({
    restaurantId: mongoose.Schema.Types.ObjectId,
  }, { strict: false }));

  const collectionsToFix = ['MenuCategory', 'MenuItem', 'Order', 'Table'];
  
  for (const collName of collectionsToFix) {
    const Model = mongoose.model(collName, new mongoose.Schema({
      restaurantId: mongoose.Schema.Types.ObjectId,
      branchId: mongoose.Schema.Types.ObjectId,
    }, { strict: false }));

    const records = await Model.find({ branchId: { $exists: true, $ne: null } });
    let fixed = 0;
    
    for (const record of records) {
      if (!record.restaurantId || !record.branchId) continue;
      
      const branch = await Branch.findById(record.branchId);
      if (branch && branch.restaurantId.toString() !== record.restaurantId.toString()) {
        // The branchId does NOT belong to the restaurantId!
        // Find a valid branch for this restaurantId
        const validBranch = await Branch.findOne({ restaurantId: record.restaurantId });
        if (validBranch) {
          await Model.findByIdAndUpdate(record._id, { branchId: validBranch._id });
          fixed++;
        } else {
          // No valid branch found, remove the invalid branchId
          await Model.findByIdAndUpdate(record._id, { $unset: { branchId: 1 } });
          fixed++;
        }
      } else if (!branch) {
         // Branch doesn't even exist!
         const validBranch = await Branch.findOne({ restaurantId: record.restaurantId });
         if (validBranch) {
           await Model.findByIdAndUpdate(record._id, { branchId: validBranch._id });
           fixed++;
         } else {
           await Model.findByIdAndUpdate(record._id, { $unset: { branchId: 1 } });
           fixed++;
         }
      }
    }
    console.log(`Fixed ${fixed} records in ${collName}`);
  }

  process.exit(0);
}
run();
