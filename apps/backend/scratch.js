const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/restaurant_os_db', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    const db = mongoose.connection.db;
    const orders = await db.collection('orders').find({ isOnlineOrder: true }).toArray();
    let updated = 0;
    for (const order of orders) {
      let changed = false;
      order.items.forEach(item => {
        if (!item.sentToKitchen) {
          item.sentToKitchen = true;
          changed = true;
        }
      });
      if (changed) {
        await db.collection('orders').updateOne({ _id: order._id }, { $set: { items: order.items } });
        updated++;
      }
    }
    console.log(`Updated ${updated} orders`);
    process.exit(0);
  });
