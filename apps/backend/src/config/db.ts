import mongoose from 'mongoose';

export const connectDB = async () => {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant_db';
  const MAX_RETRIES = 10;
  const RETRY_DELAY_MS = 5000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 20000, // Allow 20s for Atlas DNS/TLS handshake
        socketTimeoutMS: 45000,
        connectTimeoutMS: 20000,
        maxPoolSize: 10,
      });
      console.log('MongoDB Connected successfully.');
      return;
    } catch (err: any) {
      const remaining = MAX_RETRIES - attempt;
      console.error(
        `MongoDB connection unsuccessful (attempt ${attempt}/${MAX_RETRIES}):`,
        err?.message ?? err
      );

      if (remaining === 0) {
        // Log but do NOT process.exit — keep server alive so it can serve
        // non-DB routes and reconnect automatically via Mongoose's built-in
        // reconnect logic once the network recovers.
        console.error('MongoDB: all initial connection attempts exhausted. Server staying alive — Mongoose will retry automatically.');
        return;
      }

      await new Promise(res => setTimeout(res, RETRY_DELAY_MS));
    }
  }
};
