/******************************************************************
 * MODULE      : Patients Service
 * PURPOSE     : Handle Google Sheets operations for patients
 *              - Import / Upsert patients (CID-based)
 *              - Search patients (autocomplete)
 *              - Get all patients for select lists
 *              - Create single patient (manual entry)
 * SCOPE       : Backend (Node.js / Google Sheets API)
 ******************************************************************/

const { google } = require("googleapis");

/* =========================================================
   GOOGLE SHEETS CLIENT (SAFE INIT)
========================================================= */
let sheets = null;
async function getSheets() {
  if (sheets) return sheets;

  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(
      Buffer.from(process.env.GOOGLE_CREDENTIAL_BASE64, "base64").toString("utf8")
    ),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const authClient = await auth.getClient();

  sheets = google.sheets({ version: "v4", auth: authClient });

  console.log("📄 Google Sheets client initialized");
  return sheets;
}

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_PATIENTS = process.env.SHEET_PATIENTS;

/* =========================================================
   HELPERS
   - normalizeCID: ทำ CID ให้เป็นมาตรฐาน 13 หลัก
   - safeLower: ป้องกัน undefined / null
========================================================= */
function normalizeCID(cid) {
  if (cid === null || cid === undefined) return "";

  cid = String(cid);

  if (cid.includes("E") || cid.includes("e")) {
    cid = Number(cid).toFixed(0);
  }

  return cid
    .replace(/'/g, "")
    .replace(/\D/g, "")
    .padStart(13, "0");
}

function safeLower(v) {
  return String(v ?? "").toLowerCase();
}

/* =========================================================
   IMPORT / UPSERT PATIENTS (CID-BASED)
   - รับ array ของ patients
   - ตรวจซ้ำกับ Google Sheet
   - แยก insert / update
========================================================= */
async function importPatientsService(rows) {
  const sheets = await getSheets();

  /* ---------- Load existing CID ---------- */
  const existingRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_PATIENTS}!A2:A`,
    valueRenderOption: "UNFORMATTED_VALUE",
  });

  const cidMap = {};
  (existingRes.data.values || []).forEach((r, i) => {
    const cid = normalizeCID(r[0]);
    if (cid) cidMap[cid] = i + 2;
  });

  /* ---------- Deduplicate input ---------- */
  const uniqueRows = {};
  for (const r of rows) {
    const cid = normalizeCID(r.CID);
    if (!cid) continue;
    uniqueRows[cid] = { ...r, CID: cid };
  }

  /* ---------- Prepare upsert ---------- */
  const updates = [];
  const inserts = [];

  for (const cid of Object.keys(uniqueRows)) {
    const r = uniqueRows[cid];

    const rowValues = [
      `'${cid}`,           // A
      r.PRENAME ?? "",     // B
      r.NAME ?? "",        // C
      r.LNAME ?? "",       // D
      r.HN ?? "",          // E
      r.SEX ?? "",         // F
      r.BIRTH ?? "",       // G
      r.BIRTH_THAI ?? "",  // H
      r.TELEPHONE ?? "",   // I
      r.MOBILE ?? "",      // J
    ];

    if (cidMap[cid]) {
      updates.push({
        range: `${SHEET_PATIENTS}!A${cidMap[cid]}:J${cidMap[cid]}`,
        values: [rowValues],
      });
    } else {
      inserts.push(rowValues);
    }
  }

  /* ---------- Execute update ---------- */
  if (updates.length) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        valueInputOption: "USER_ENTERED",
        data: updates,
      },
    });
  }

  /* ---------- Execute insert ---------- */
  if (inserts.length) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_PATIENTS}!A:J`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: inserts },
    });
  }

  return { updated: updates.length, inserted: inserts.length };
}

/* =========================================================
   SEARCH PATIENTS (AUTOCOMPLETE)
   - ใช้สำหรับ frontend autocomplete / search
   - จำกัดผลลัพธ์ 10 รายการ
========================================================= */
async function searchPatients(keyword) {
  if (!keyword) return [];

  const sheets = await getSheets();
  const qRaw = String(keyword).trim();
  const q = safeLower(qRaw);
  const qCID = normalizeCID(qRaw);

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_PATIENTS}!A2:J`,
    valueRenderOption: "UNFORMATTED_VALUE",
  });

  const rows = res.data.values || [];
  if (!rows.length) return [];

  const mapped = rows.map(r => ({
    CID: normalizeCID(r[0]),
    PRENAME: r[1] ?? "",
    NAME: r[2] ?? "",
    LNAME: r[3] ?? "",
    HN: String(r[4] ?? ""),
    SEX: r[5] ?? "",
    BIRTH: r[6] ?? "",
    BIRTH_THAI: r[7] ?? "",
    TELEPHONE: r[8] ?? "",
    MOBILE: r[9] ?? "",
  }));

  return mapped
    .filter(r =>
      (qCID && r.CID.includes(qCID)) ||
      safeLower(r.HN).includes(q) ||
      safeLower(r.NAME).includes(q) ||
      safeLower(r.LNAME).includes(q)
    )
    .slice(0, 10);
}

/* =========================================================
   GET ALL PATIENTS (FOR SELECT LIST)
========================================================= */
async function getAllPatients() {
  const sheets = await getSheets();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_PATIENTS}!A2:J`,
    valueRenderOption: "UNFORMATTED_VALUE",
  });

  const rows = res.data.values || [];

  return rows.map(r => ({
    CID: normalizeCID(r[0]),
    PRENAME: r[1] ?? "",
    NAME: r[2] ?? "",
    LNAME: r[3] ?? "",
    HN: r[4] ?? "",
    SEX: r[5] ?? "",
    BIRTH: r[6] ?? "",
    BIRTH_THAI: r[7] ?? "",
    TELEPHONE: r[8] ?? "",
    MOBILE: r[9] ?? "",
    fullName: `${r[1] ?? ""}${r[2] ?? ""} ${r[3] ?? ""}`.trim()
  }));
}

/* =========================================================
   CREATE PATIENT (MANUAL ENTRY)
   - ตรวจซ้ำ CID ก่อน insert
========================================================= */
async function createPatientService(data) {
  const sheets = await getSheets();

  const CID = normalizeCID(data.CID);
  if (!CID || CID.length !== 13) throw new Error("Citizen ID ไม่ถูกต้อง");

  /* ---------- ตรวจซ้ำ ---------- */
  const existingRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_PATIENTS}!A2:A`,
    valueRenderOption: "UNFORMATTED_VALUE",
  });

  const existingCID = (existingRes.data.values || []).map(r => normalizeCID(r[0]));
  if (existingCID.includes(CID)) throw new Error("มี Citizen ID นี้แล้วในระบบ");

  /* ---------- เตรียมแถวข้อมูล ---------- */
  const rowValues = [
    `'${CID}`,             // A
    data.PRENAME ?? "",    // B
    data.NAME ?? "",       // C
    data.LNAME ?? "",      // D
    "",                    // E (HN)
    "",                    // F (SEX)
    data.BIRTH ?? "",      // G
    "",                    // H (BIRTH_THAI)
    "",                    // I (TELEPHONE)
    data.MOBILE ?? "",     // J
  ];

  /* ---------- Insert ---------- */
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_PATIENTS}!A:J`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [rowValues] },
  });

  return { inserted: 1, CID };
}

/* =========================================================
   GET PATIENT BY CID
========================================================= */
async function getPatientByCID(cid) {

  const searchCID = normalizeCID(cid);

  const patients = await getAllPatients();

  return patients.find(p => normalizeCID(p.CID) === searchCID) || null;

}

/* =========================================================
   EXPORTS
========================================================= */
module.exports = {
  importPatientsService,
  searchPatients,
  getAllPatients,
  createPatientService,
  getPatientByCID
};