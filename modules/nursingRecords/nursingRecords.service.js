/******************************************************************
 * modules/nursingRecords/nursingRecords.service.js
 * PRODUCTION STABLE VERSION (RE-STRUCTURED)
 *
 * ===============================================================
 * MODULE OVERVIEW
 * ===============================================================
 * โมดูลนี้ใช้สำหรับจัดการ Nursing Records ผ่าน Google Sheets
 *
 * ฟังก์ชันหลัก:
 * - getAll()                  → ดึงข้อมูลทั้งหมด
 * - getByNSR(nsr)             → ดึงข้อมูลตาม NSR
 * - save(data)                → บันทึกข้อมูลใหม่
 * - updateByNSR(nsr, data)    → อัปเดตข้อมูล
 * - softDeleteByNSR()         → ลบแบบ Soft Delete
 * - markLineSent()            → mark ว่าส่ง LINE แล้ว
 * - markResultConfirmed()     → mark ยืนยันผลแล้ว
 * - getNextNSR()              → generate เลข NSR
 *
 * แนวคิด:
 * - ใช้ Google Sheets เป็น Database
 * - Mapping column ด้วย NURSING_COLUMNS
 * - ใช้ NSR เป็น Primary Key
 *
 ******************************************************************/

/* =========================================================
   IMPORTS
========================================================= */
const { getSheets } = require("@config/google")

/* =========================================================
   ENV CONFIG
========================================================= */
const SHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_NAME = process.env.SHEET_NURSING;

/* =========================================================
   COLUMN DEFINITION (MASTER STRUCTURE)
========================================================= */
const NURSING_COLUMNS = [
  "NSR","Stamp","CID","HN","PRENAME","NAME","LNAME","TELEPHONE","BIRTH",
  "DateService","Activity","Objective","HealthInform","HealthAdvice",
  "fileURL",

  "Follow1Date","Follow1Time","Follow1Route","Provider1","Response1",
  "Follow2Date","Follow2Time","Follow2Route","Provider2","Response2",
  "Follow3Date","Follow3Time","Follow3Route","Provider3","Response3",

  "Deleted","DeletedBy","DeletedAt","status","remark",

  "LineSent",
  "LineSentAt",
  "ResultConfirmed",
  "ConfirmedAt"
];

/* =========================================================
   DATA NORMALIZATION MODULE
   → ปรับชื่อ field ให้รองรับหลาย format input
========================================================= */
function normalizeData(raw = {}) {
  return {
    ...raw,

    Follow1Date: raw.Follow1Date || raw.DateFollow1 || "",
    Follow1Time: raw.Follow1Time || raw.TimeFollow1 || "",
    Follow1Route: raw.Follow1Route || raw.RouteFollow1 || "",

    Follow2Date: raw.Follow2Date || raw.DateFollow2 || "",
    Follow2Time: raw.Follow2Time || raw.TimeFollow2 || "",
    Follow2Route: raw.Follow2Route || raw.RouteFollow2 || "",

    Follow3Date: raw.Follow3Date || raw.DateFollow3 || "",
    Follow3Time: raw.Follow3Time || raw.TimeFollow3 || "",
    Follow3Route: raw.Follow3Route || raw.RouteFollow3 || ""
  };
}

/* =========================================================
   DATA TRANSFORMATION MODULE
========================================================= */

/* เติม column ให้ครบ */
function padRow(row = []) {
  while (row.length < NURSING_COLUMNS.length) {
    row.push("");
  }
  return row;
}

/* แปลง array → object */
function rowArrayToObject(row = []) {
  row = padRow(row);

  const obj = {};
  NURSING_COLUMNS.forEach((col, i) => {
    obj[col] = row[i] || "";
  });

  return obj;
}

/* =========================================================
   COLUMN UTILS MODULE
========================================================= */

/* แปลงเลข column → ตัวอักษร (A, B, C...) */
function columnToLetter(column) {
  let temp;
  let letter = "";

  while (column > 0) {
    temp = (column - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    column = (column - temp - 1) / 26;
  }

  return letter;
}

/* column สุดท้าย */
function getLastColumnLetter() {
  return columnToLetter(NURSING_COLUMNS.length);
}

/* =========================================================
   CORE SERVICE: READ MODULE
========================================================= */

/* ดึงข้อมูลทั้งหมด */
exports.getAll = async () => {
  const sheets = await getSheets();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!A2:${getLastColumnLetter()}`
  });

  const rows = res.data.values || [];
  return rows.map(rowArrayToObject);
};

/* ดึงข้อมูลตาม NSR */
exports.getByNSR = async (nsr) => {
  const sheets = await getSheets();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!A2:${getLastColumnLetter()}`
  });

  const rows = res.data.values || [];

  const index = rows.findIndex(r =>
    String(r[0]).trim() === String(nsr).trim()
  );

  if (index === -1) {
    throw new Error(`NSR not found: ${nsr}`);
  }

  return rowArrayToObject(rows[index]);
};

/* =========================================================
   CORE SERVICE: CREATE MODULE
========================================================= */

/* บันทึกข้อมูลใหม่ */
exports.save = async rawData => {
  const sheets = await getSheets();

  const now = new Date().toISOString();
  const data = normalizeData(rawData);

  const row = NURSING_COLUMNS.map(col => {

    if (col === "Stamp") return data.Stamp || now;
    if (col === "status") return "ACTIVE";

    if (col === "TELEPHONE" && data[col]) {
      return `'${data[col]}`;
    }

    return data[col] || "";
  });

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!A2`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] }
  });
};

/* =========================================================
   CORE SERVICE: UPDATE MODULE
========================================================= */

/* อัปเดตข้อมูลตาม NSR */
exports.updateByNSR = async (nsr, data) => {

  console.log("Updating NSR:", nsr);

  const sheets = await getSheets();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!A2:${getLastColumnLetter()}`
  });

  const rows = res.data.values || [];

  const index = rows.findIndex(r =>
    r && String(r[0]).trim() === String(nsr).trim()
  );

  console.log("Row index:", index);

  if (index === -1) {
    throw new Error(`NSR not found: ${nsr}`);
  }

  const rowNumber = index + 2;
  const updates = [];

  for (const key of Object.keys(data)) {

    const colIndex = NURSING_COLUMNS.indexOf(key);
    if (colIndex === -1) continue;

    const colLetter = columnToLetter(colIndex + 1);

    updates.push({
      range: `${SHEET_NAME}!${colLetter}${rowNumber}`,
      values: [[data[key]]]
    });
  }

  if (updates.length === 0) return;

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      valueInputOption: "USER_ENTERED",
      data: updates
    }
  });
};

/* =========================================================
   CORE SERVICE: STATUS / ACTION MODULE
========================================================= */

/* mark ส่ง LINE แล้ว */
exports.markLineSent = async (nsr) => {
  await exports.updateByNSR(nsr, {
    LineSent: "YES",
    LineSentAt: new Date().toISOString()
  });
};

/* mark ยืนยันผล */
exports.markResultConfirmed = async (nsr) => {

  const record = await exports.getByNSR(nsr);

  if (!record) {
    console.log("NSR not found:", nsr);
    return;
  }

  if (record.ResultConfirmed === "YES") {
    console.log("Already confirmed:", nsr);
    return;
  }

  await exports.updateByNSR(nsr, {
    ResultConfirmed: "YES",
    ConfirmedAt: new Date().toISOString()
  });

  console.log("✅ Result confirmed:", nsr);
};

/* =========================================================
   CORE SERVICE: DELETE MODULE
========================================================= */

/* Soft Delete */
exports.softDeleteByNSR = async (nsr, user) => {
  await exports.updateByNSR(nsr, {
    Deleted: "YES",
    DeletedBy: user,
    DeletedAt: new Date().toISOString(),
    status: "DELETED"
  });
};

/* =========================================================
   CORE SERVICE: GENERATOR MODULE
========================================================= */

/* สร้างเลข NSR ใหม่ */
exports.getNextNSR = async () => {

  const sheets = await getSheets();

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");

  const prefix = `NSR${yyyy}${mm}`;
  const yearPrefix = `NSR${yyyy}`;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!A2:A`
  });

  const rows = res.data.values || [];

  const sameYear = rows
    .map(r => r[0])
    .filter(v => v && v.startsWith(yearPrefix));

  let nextNo = 1;

  if (sameYear.length) {

    const last = sameYear
      .map(v => parseInt(v.split("-")[1], 10))
      .filter(n => !isNaN(n))
      .sort((a, b) => b - a)[0];

    nextNo = last + 1;
  }

  return `${prefix}-${String(nextNo).padStart(5, "0")}`;
};