const Redis = require('ioredis');
require('dotenv').config();

async function run() {
  const redis = new Redis(process.env.REDIS_URL || process.env.REDIS_URI);
  console.log("Connected to Redis");
  await redis.flushall();
  console.log("Flushed entire Redis cache.");
  process.exit(0);
}
run();
