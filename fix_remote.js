const mongoose = require("mongoose");
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  const result = await db.collection("tables").updateOne(
    { _id: new mongoose.Types.ObjectId("6a14c7bbcd6b8106fae0c9af") },
    { $set: { branchId: new mongoose.Types.ObjectId("6a132769845db0ca9a6688de") } }
  );
  console.log("Fixed:", result);
  process.exit(0);
});
