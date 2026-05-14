const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/restaurant-pos').then(async () => {
  const rest = await mongoose.connection.db.collection('restaurants').findOne();
  console.log(rest ? rest._id.toString() : "No restaurant");
  process.exit(0);
});
