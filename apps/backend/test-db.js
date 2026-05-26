const mongoose = require('mongoose');
const { MenuCategory } = require('./apps/backend/src/models/MenuCategory');
const { MenuItem } = require('./apps/backend/src/models/MenuItem');
const Restaurant = require('./apps/backend/src/models/Restaurant').Restaurant;

async function run() {
  await mongoose.connect('mongodb+srv://thebaburhussain:4gGwMDAMoCfHDACf@bhojantech.fdzfmmh.mongodb.net/?appName=BhojanTech');
  const rest = await Restaurant.findOne({});
  console.log("Restaurant:", rest._id, rest.name);
  const items = await MenuItem.find({ restaurantId: rest._id });
  console.log("Items count:", items.length);
  if (items.length > 0) {
    console.log("Sample item:", items[0].name, "branchId:", items[0].branchId);
  }
  process.exit(0);
}
run();
