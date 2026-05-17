const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb+srv://thebaburhussain:4gGwMDAMoCfHDACf@bhojantech.fdzfmmh.mongodb.net/?appName=BhojanTech', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  
  const db = mongoose.connection.db;
  const categories = await db.collection('menucategories').find().toArray();
  const items = await db.collection('menuitems').find().toArray();
  
  console.log("Categories:");
  categories.forEach(c => console.log(c._id, c.name));
  
  console.log("\nItems:");
  items.forEach(i => console.log(i._id, i.name, "catId:", i.categoryId));
  
  process.exit(0);
}
run();
