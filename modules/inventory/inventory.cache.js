let MASTER_CACHE = null;
let MOVEMENT_CACHE = null;
let LAST_FETCH = {
  master: 0,
  movement: 0
};

const TTL = 60 * 1000; // 1 นาที

function isExpired(type) {
  return Date.now() - LAST_FETCH[type] > TTL;
}

module.exports = {
  getMaster() {
    if (!MASTER_CACHE || isExpired("master")) return null;
    return MASTER_CACHE;
  },

  setMaster(data) {
    MASTER_CACHE = data;
    LAST_FETCH.master = Date.now();
  },

  

  getMovement() {
    if (!MOVEMENT_CACHE || isExpired("movement")) return null;
    return MOVEMENT_CACHE;
  },

  setMovement(data) {
    MOVEMENT_CACHE = data;
    LAST_FETCH.movement = Date.now();
  },

  clear() {
    MASTER_CACHE = null;
    MOVEMENT_CACHE = null;
  }
};

