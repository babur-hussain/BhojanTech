const mongoose = require('mongoose');
async function test() {
  await mongoose.connect('mongodb+srv://admin:1B4d7s9A2c5M8x6K@cluster0.bhojantech.mongodb.net/restaurant_os?retryWrites=true&w=majority');
  const CustomerSchema = new mongoose.Schema({
    phone: String,
    dob: Date,
    name: String,
  }, { collection: 'customers' });
  const Cust = mongoose.models.Customer || mongoose.model('Customer', CustomerSchema);
  const c = await Cust.findOne({ phone: '6264134364' });
  console.log("Customer:", c);
  process.exit(0);
}
test();
