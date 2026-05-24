const mongoose = require('mongoose');
const { MenuCategory } = require('./src/models/MenuCategory');
const { MenuItem } = require('./src/models/MenuItem');
const { Restaurant } = require('./src/models/Restaurant');

async function run() {
  await mongoose.connect('mongodb+srv://thebaburhussain:4gGwMDAMoCfHDACf@bhojantech.fdzfmmh.mongodb.net/?appName=BhojanTech');
  const restaurants = await Restaurant.find({});
  for (const rest of restaurants) {
     const count = await MenuItem.countDocuments({ restaurantId: rest._id });
     console.log(`Restaurant ${rest.name} (${rest._id}) has ${count} items.`);
     if (count > 0) {
        const item = await MenuItem.findOne({ restaurantId: rest._id });
        console.log(`  Sample item isAvailable: ${item.isAvailable}, categoryId: ${item.categoryId}`);
     }
  }
  process.exit(0);
}
run();
