const { getSheets } = require("../../config/google");

const DB = process.env.INVENTORY_SPREADSHEET_ID;
const SHEET_MASTER = process.env.SHEET_INVENTORY_MASTER;
const SHEET_MOVEMENT = process.env.SHEET_INVENTORY_MOVEMENT;

/* ===============================
   MASTER
================================ */
async function getMasterRows() {
  const sheets = await getSheets();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: DB,
    range: `${SHEET_MASTER}!A2:E`
  });

  return res.data.values || [];
}

async function writeMaster(values) {
  const sheets = await getSheets();

  await sheets.spreadsheets.values.update({
    spreadsheetId: DB,
    range: `${SHEET_MASTER}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values }
  });
}

/* ===============================
   MOVEMENT
================================ */
async function getMovementRows() {
  const sheets = await getSheets();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: DB,
    range: `${SHEET_MOVEMENT}!A2:K`
  });

  return res.data.values || [];
}

async function writeMovement(values) {
  const sheets = await getSheets();

  await sheets.spreadsheets.values.update({
    spreadsheetId: DB,
    range: `${SHEET_MOVEMENT}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values }
  });
}

/* ===============================
   DAILY CHECK (FIXED)
================================ */
async function appendDailyCheck(data) {
  const sheets = await getSheets();

  await sheets.spreadsheets.values.append({
    spreadsheetId: DB,
    range: `${SHEET_MOVEMENT}!A:D`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
        data.date,
        data.itemId,
        data.count,
        data.provider
      ]]
    }
  });

  return true;
}

module.exports = {
  getMasterRows,
  writeMaster,
  getMovementRows,
  writeMovement,
  appendDailyCheck
};