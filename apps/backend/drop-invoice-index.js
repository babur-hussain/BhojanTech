const mongoose = require('mongoose');
require('dotenv').config();

async function main() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('MONGODB_URI not found in environment');
        return;
    }
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    
    // Check if index exists
    const indexes = await db.collection('invoices').indexes();
    const hasIndex = indexes.some(idx => idx.name === 'invoiceNumber_1');
    
    if (hasIndex) {
      console.log('Dropping invoiceNumber_1 index...');
      await db.collection('invoices').dropIndex('invoiceNumber_1');
      console.log('Index dropped successfully.');
    } else {
      console.log('Index invoiceNumber_1 does not exist.');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

main();
