const { appendRow } = require("@config/google");

async function addUserLog({
  userId,
  displayName,
  text
}) {

  await appendRow("UserList", [
    new Date().toISOString(),
    userId,
    displayName,
    text
  ]);

}

module.exports = {
  addUserLog
};