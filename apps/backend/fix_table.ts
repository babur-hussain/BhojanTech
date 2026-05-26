import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb+srv://bhojantech:8E5uPZfB0h0t3t32@cluster0.pifc9.mongodb.net/bhojantech?retryWrites=true&w=majority';

async function fix() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to DB');
  const db = mongoose.connection.db;
  
  const result = await db?.collection('tables').updateOne(
    { _id: new mongoose.Types.ObjectId('6a14c7bbcd6b8106fae0c9af') },
    { $set: { branchId: new mongoose.Types.ObjectId('6a132769845db0ca9a6688de') } }
  );
  
  console.log('Fixed:', result);
  process.exit(0);
}

fix().catch(console.error);
