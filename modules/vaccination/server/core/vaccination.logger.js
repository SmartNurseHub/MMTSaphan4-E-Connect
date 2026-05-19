function logInfo(tag, data) {
  console.log(`[INFO][${tag}]`, JSON.stringify(data, null, 2));
}

function logError(tag, err) {
  console.error(`[ERROR][${tag}]`, err);
}

module.exports = {
  logInfo,
  logError
};