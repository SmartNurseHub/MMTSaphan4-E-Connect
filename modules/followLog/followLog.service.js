const { appendRow } = require("@config/google");

async function addFollowLog({
  userId,
  displayName,
  pictureUrl,
  status = "NEW",
  event = "FOLLOW"
}) {

  await appendRow("FollowList", [
    new Date().toISOString(),
    userId,
    displayName,
    pictureUrl,
    status,
    event
  ]);

}

module.exports = {
  addFollowLog
};