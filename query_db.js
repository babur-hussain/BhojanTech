const { MongoClient } = require("mongodb");
const uri = "mongodb+srv://bhojantech:8E5uPZfB0h0t3t32@cluster0.pifc9.mongodb.net/bhojantech?retryWrites=true&w=majority";
async function run() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  const branches = await db.collection("branches").find({}).toArray();
  console.log("Branches:", JSON.stringify(branches, null, 2));
  
  const tables = await db.collection("tables").find({}).toArray();
  console.log("Tables:", JSON.stringify(tables, null, 2));

  process.exit(0);
}
run();
