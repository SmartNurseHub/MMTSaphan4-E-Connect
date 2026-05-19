const _locks = new Map();
const _idempotency = new Set();

async function lock(key, fn) {

  while (_locks.get(key)) {
    await new Promise(r => setTimeout(r, 20));
  }

  _locks.set(key, true);

  try {
    return await fn();
  } finally {
    _locks.delete(key);
  }
}

function isDuplicate(key) {
  return _idempotency.has(key);
}

function markDone(key) {
  _idempotency.add(key);

  if (_idempotency.size > 4000) {
    _idempotency.clear();
  }
}

module.exports = {
  lock,
  isDuplicate,
  markDone
};