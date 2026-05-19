const cacheStore = {};

function setCache(key, data, ttl = 60000) {
  cacheStore[key] = {
    data,
    expire: Date.now() + ttl
  };
}

function getCache(key) {

  const item = cacheStore[key];

  if (!item) return null;

  if (Date.now() > item.expire) {
    delete cacheStore[key];
    return null;
  }

  return item.data;
}

module.exports = {
  setCache,
  getCache
};