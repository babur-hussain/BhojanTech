const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/restaurant-pos').then(async () => {
  const table = await mongoose.connection.db.collection('tables').findOne();
  console.log("Table ID:", table._id.toString());
  console.log("Restaurant ID:", table.restaurantId.toString());
  process.exit(0);
});
