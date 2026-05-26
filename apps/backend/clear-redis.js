const Redis = require('ioredis');
require('dotenv').config();

async function run() {
  const redis = new Redis(process.env.REDIS_URL || process.env.REDIS_URI);
  console.log("Connected to Redis");
  const keys = await redis.keys('menu_*');
  if (keys.length > 0) {
    await redis.del(...keys);
    console.log(`Cleared ${keys.length} menu cache keys.`);
  } else {
    console.log("No menu cache keys found.");
  }
  process.exit(0);
}
run();
