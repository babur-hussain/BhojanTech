const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb+srv://thebaburhussain:4gGwMDAMoCfHDACf@bhojantech.fdzfmmh.mongodb.net/?appName=BhojanTech', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  
  const db = mongoose.connection.db;
  const items = await db.collection('menuitems').find().toArray();
  
  items.forEach(i => {
    console.log("name:", i.name);
    console.log("restaurantId type:", typeof i.restaurantId, i.restaurantId.constructor.name);
    console.log("branchId type:", typeof i.branchId, i.branchId ? i.branchId.constructor.name : 'null');
  });
  
  process.exit(0);
}
run();
