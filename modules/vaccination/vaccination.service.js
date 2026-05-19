/*****************************************************************
 * vaccination.service.js
 * AUTO VACCINATION SCHEDULING SYSTEM (CLEAN FIXED VERSION)
 *****************************************************************/

/* =========================================================
   IMPORT
========================================================= */
const { getSheets } = require("../../config/google");
const lineService = require("../lineOA/lineOA.service");
const AdmZip = require("adm-zip");
const iconv = require("iconv-lite");

/* =========================================================
   MEMORY SYSTEM (REPLACE REDIS)
========================================================= */
const _locks = new Map();
const _idempotency = new Set();
const cacheStore = {};
const sentCache = new Map();

/* =========================================================
   LOCK SYSTEM
========================================================= */
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

/* =========================================================
   CACHE
========================================================= */
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

/* =========================================================
   ID CHECK
========================================================= */
function isDuplicate(key) {
  return _idempotency.has(key);
}

function markDone(key) {
  _idempotency.add(key);
  if (_idempotency.size > 7000) _idempotency.clear();
}

/* =========================================================
   UTIL
========================================================= */
function logInfo(tag, data) {
  console.log(`[INFO][${tag}]`, JSON.stringify(data, null, 2));
}

function logError(tag, err) {
  console.error(`[ERROR][${tag}]`, err);
}

/* =========================================================
   DATE UTIL
========================================================= */
function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + Number(days || 0));
  return d;
}

function toISO(date) {
  const d = new Date(date);
  if (isNaN(d)) return "";
  return d.toISOString().split("T")[0];
}

/* =========================================================
   SHEET CONST
========================================================= */
const SHEET_RECORD = "VaccinationRecords";
const SHEET_APPOINT = "VaccinationAppointments";
const SHEET_PATIENT = "Patients";
const SHEET_SCHEDULE = "Vaccine_Schedule";
const SHEET_REMINDER = "Reminder";
const SHEET_MASTER = "VaccineMaster";

/* =========================================================
   VCN GENERATOR (FIXED SINGLE VERSION)
========================================================= */
async function getNextVCN() {
  return await lock("VCN", async () => {
    const sheets = await getSheets();
    const spreadsheetId = process.env.SPREADSHEET_ID;

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET_RECORD}!A2:A`
    });

    const rows = res.data.values || [];

    const now = new Date();
    const prefix = `VCN${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-`;

    const filtered = rows
      .map(r => String(r[0] || ""))
      .filter(v => v.startsWith(prefix));

    if (!filtered.length) return `${prefix}00001`;

    const last = filtered[filtered.length - 1];
    const num = parseInt(last.split("-")[1] || "0");

    return `${prefix}${String(num + 1).padStart(5, "0")}`;
  });
}

/* =========================================================
   PATIENT
========================================================= */
async function getPatient(cid) {
  const cacheKey = `patient_${cid}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: `${SHEET_PATIENT}!A2:K`
  });

  const rows = res.data.values || [];

  for (const r of rows) {
    if (String(r[0]) === String(cid)) {
      const patient = {
        cid: r[0],
        prename: r[1],
        firstName: r[2],
        lastName: r[3],
        hn: r[4],
        birthDate: r[6],
        phone: r[8]
      };

      setCache(cacheKey, patient, 60000);
      return patient;
    }
  }

  return null;
}

/* =========================================================
   REMINDER
========================================================= */
async function createReminder(patient, vaccineCode, doseNo, appointmentDate, apid) {
  const sheets = await getSheets();

  const base = Date.now();

  const rows = [
    [base + "-1", apid, patient.cid, vaccineCode, doseNo, toISO(addDays(appointmentDate, -30)), "PENDING"],
    [base + "-2", apid, patient.cid, vaccineCode, doseNo, toISO(addDays(appointmentDate, -7)), "PENDING"],
    [base + "-3", apid, patient.cid, vaccineCode, doseNo, toISO(addDays(appointmentDate, -1)), "PENDING"]
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: `${SHEET_REMINDER}!A2`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: rows }
  });
}

/* =========================================================
   SAVE VACCINATION
========================================================= */
async function saveVaccination(data) {
  const sheets = await getSheets();

  const patient = await getPatient(data.cid);
  if (!patient) throw new Error("Patient not found");

  const vcn = await getNextVCN();

  const row = [
    vcn,
    data.cid,
    patient.hn,
    data.vaccineCode,
    data.doseNo,
    data.dateService,
    "COMPLETED"
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: `${SHEET_RECORD}!A2`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] }
  });

  return { success: true, vcn };
}

/* =========================================================
   LINE SEND (FIXED CLOSE FUNCTION)
========================================================= */
async function sendLineVaccine(vcn) {
  const lockKey = `line:${vcn}`;

  const locked = await lock(lockKey, async () => {
    const record = await getVaccinationByVCN(vcn);
    if (!record) throw new Error("not found");

    const patient = await getPatient(record.cid);
    if (!patient) throw new Error("no patient");

    const lineUID = patient.lineUID;
    if (!lineUID) return;

    const message = {
      type: "text",
      text: `วัคซีนของคุณถูกบันทึกแล้ว VCN: ${vcn}`
    };

    await lineService.pushMessage(lineUID, message);

    return true;
  });

  return { success: true, locked };
}

/* =========================================================
   GET RECORD BY VCN
========================================================= */
async function getVaccinationByVCN(vcn) {
  const sheets = await getSheets();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: `${SHEET_RECORD}!A2:N`
  });

  const rows = res.data.values || [];

  const r = rows.find(x => x[0] === vcn);
  if (!r) return null;

  return {
    vcn: r[0],
    cid: r[1],
    vaccineCode: r[3],
    doseNo: r[4],
    dateService: r[5]
  };
}

/* =========================================================
   EXPORT
========================================================= */
module.exports = {
  getPatient,
  saveVaccination,
  getNextVCN,
  sendLineVaccine
};