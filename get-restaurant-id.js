const mongoose = require('mongoose');
const Restaurant = require('./src/models/Restaurant').Restaurant;
async function run() {
  await mongoose.connect('mongodb+srv://thebaburhussain:4gGwMDAMoCfHDACf@bhojantech.fdzfmmh.mongodb.net/?appName=BhojanTech');
  const rest = await Restaurant.findOne({});
  console.log(rest._id.toString());
  process.exit(0);
}
run();
