const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb+srv://thebaburhussain:4gGwMDAMoCfHDACf@bhojantech.fdzfmmh.mongodb.net/?appName=BhojanTech', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  
  const db = mongoose.connection.db;
  const items = await db.collection('menuitems').find().toArray();
  
  console.log(JSON.stringify(items[0], null, 2));
  
  process.exit(0);
}
run();
