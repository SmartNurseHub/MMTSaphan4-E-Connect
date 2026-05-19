/******************************************************************
 * GOOGLE SHEET SERVICE (FINAL PRO VERSION)
 ******************************************************************/

const { google } = require("googleapis");

/* =========================================================
   GLOBAL CACHE
========================================================= */

let sheetsInstance = null;
let sheetIdCache = {};

/* =========================================================
   INIT SHEETS
========================================================= */

async function getSheets() {

  if (sheetsInstance) return sheetsInstance;

  if (!process.env.GOOGLE_CREDENTIAL_BASE64)
    throw new Error("❌ GOOGLE_CREDENTIAL_BASE64 missing");

  if (!process.env.SPREADSHEET_ID)
    throw new Error("❌ SPREADSHEET_ID missing");

  const credentials = JSON.parse(
    Buffer.from(
      process.env.GOOGLE_CREDENTIAL_BASE64.replace(/\s/g, ""),
      "base64"
    ).toString("utf8")
  );

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  sheetsInstance = google.sheets({ version: "v4", auth });

  console.log("✅ Google Sheets connected");

  return sheetsInstance;
}

/* =========================================================
   SAFE EXEC (retry + timeout)
========================================================= */

async function safeExec(fn, label = "GoogleAPI") {

  for (let i = 0; i < 2; i++) {

    try {

      return await Promise.race([
        fn(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 8000)
        )
      ]);

    } catch (err) {

      console.error(`❌ ${label} attempt ${i + 1}:`, err.message);

      if (i === 1) throw err;

      await new Promise(r => setTimeout(r, 300));
    }
  }
}

/* =========================================================
   READ
========================================================= */

async function readRows(sheetName) {

  const sheets = await getSheets();

  console.log("📖 READ:", sheetName);

  try {

    const res = await safeExec(() =>
      sheets.spreadsheets.values.get({
        spreadsheetId: process.env.SPREADSHEET_ID,
        range: sheetName,
      }),
      "readRows"
    );

    console.log("✅ READ SUCCESS:", sheetName);

    return res.data.values || [];

  } catch (err) {

    console.error("💥 READ FAIL:", sheetName, err);

    throw err;
  }
}

/* =========================================================
   APPEND (🔥 สำคัญสุด)
========================================================= */

async function appendRow(sheetName, row) {

  const sheets = await getSheets();

  console.log("➕ APPEND:", sheetName, "DATA:", JSON.stringify(row));

  try {

    const res = await safeExec(() =>
      sheets.spreadsheets.values.append({
        spreadsheetId: process.env.SPREADSHEET_ID,
        range: sheetName,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [row]
        }
      }),
      "appendRow"
    );

    console.log("✅ APPEND SUCCESS:", sheetName);

    return res;

  } catch (err) {

    console.error("💥 APPEND FAIL:", sheetName, err);

    throw err; // 🔥 สำคัญมาก
  }
}

/* =========================================================
   UPDATE
========================================================= */

async function updateRow(sheetName, rowNumber, values) {

  const sheets = await getSheets();

  const endColumn = getColumnLetter(values.length);

  console.log("✏️ UPDATE:", sheetName, rowNumber);

  return safeExec(() =>
    sheets.spreadsheets.values.update({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: `${sheetName}!A${rowNumber}:${endColumn}${rowNumber}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [values] },
    }),
    "updateRow"
  );
}

/* =========================================================
   DELETE
========================================================= */

async function deleteRow(sheetName, rowNumber) {

  const sheets = await getSheets();

  let sheetId = sheetIdCache[sheetName];

  if (!sheetId) {

    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
    });

    const sheet = spreadsheet.data.sheets.find(
      s => s.properties.title === sheetName
    );

    if (!sheet) throw new Error("Sheet not found");

    sheetId = sheet.properties.sheetId;
    sheetIdCache[sheetName] = sheetId;
  }

  console.log("🗑 DELETE:", sheetName, rowNumber);

  return safeExec(() =>
    sheets.spreadsheets.batchUpdate({
      spreadsheetId: process.env.SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: "ROWS",
                startIndex: rowNumber - 1,
                endIndex: rowNumber,
              },
            },
          },
        ],
      },
    }),
    "deleteRow"
  );
}

/* =========================================================
   FIND
========================================================= */

async function findRowByCID(sheetName, cid) {

  const rows = await readRows(sheetName);

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][1] === cid) return i + 1;
  }

  return null;
}

/* =========================================================
   UTIL
========================================================= */

function getColumnLetter(col) {

  let letter = "";

  while (col > 0) {
    let temp = (col - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    col = (col - temp - 1) / 26;
  }

  return letter;
}

async function readRowsById(sheetId, sheetName) {

  const sheets = await getSheets();

  const res = await safeExec(() =>
    sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: sheetName,
    }),
    "readRowsById"
  );

  return res.data.values || [];
}

async function appendRowById(sheetId, sheetName, row) {

  const sheets = await getSheets();

  return safeExec(() =>
    sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: sheetName,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [row]
      }
    }),
    "appendRowById"
  );
}
async function clearSheetById(spreadsheetId, sheetName){

  const sheets = await getSheets(); // ⭐ สำคัญมาก

  return safeExec(() =>
    sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: sheetName
    }),
    "clearSheetById"
  );
}

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  getSheets,
  readRows,
  appendRow,
  updateRow,
  deleteRow,
  findRowByCID,


  // 🔥 NEW
  readRowsById,
  appendRowById,
  clearSheetById
};