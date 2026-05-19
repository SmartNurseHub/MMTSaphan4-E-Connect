const Redis = require("ioredis");

const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true
});

async function acquireLock(key, ttl = 14000) {
  const res = await redis.set(key, "1", "PX", ttl, "NX");
  return res === "OK";
}

async function releaseLock(key) {
  await redis.del(key);
}

async function isExists(key) {
  return (await redis.exists(key)) === 1;
}

async function setKey(key, ttl) {
  await redis.set(key, "1", "PX", ttl);
}

module.exports = {
  redis,
  acquireLock,
  releaseLock,
  isExists,
  setKey
};