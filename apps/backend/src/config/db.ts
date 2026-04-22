import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant_db';

export const connectDB = async (retries = 5) => {
  while (retries) {
    try {
      await mongoose.connect(MONGODB_URI);
      console.log('MongoDB Connected successfully.');
      break;
    } catch (err) {
      console.error('MongoDB connection unsuccessful, retry after 5 seconds.', retries, 'retries left.');
      retries -= 1;
      await new Promise(res => setTimeout(res, 5000));
      if (retries === 0) {
        console.error('MongoDB connection failed after all retries.');
        process.exit(1);
      }
    }
  }
};
