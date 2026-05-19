/*****************************************************************
 * vaccination.service.js
 * AUTO VACCINATION SCHEDULING SYSTEM
 *****************************************************************/

/* =========================================================
   1️⃣ IMPORT
========================================================= */
const { getSheets } = require("../../../../config/google");
const lineService = require('../../lineOA/lineOA.service')
/* =========================================================
   🔒 ENTERPRISE SAFETY LAYER (ADD ONLY - DO NOT MODIFY OLD CODE)
========================================================= */
const _locks = new Map();
const _idempotency = new Set();
const AdmZip = require("adm-zip");
const iconv = require("iconv-lite");


function normalizeVaccination({
  cid,
  vaccineCode,
  refInvid,
  doseNo,
  dateService,
  providerRole,
  providerName,
  locationType,
  locationDetail,
  lotNumber
}) {
  return {
    cid,
    vaccineCode,
    refInvid,
    doseNo: Number(doseNo || 0),
    dateService,
    providerRole,
    providerName,
    locationType,
    locationDetail,
    lotNumber,
    createdAt: new Date().toISOString()
  };
}
/* ---------- LOCK ---------- */
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

/* ---------- IDEMPOTENCY ---------- */
function isDuplicate(key) {
  return _idempotency.has(key);
}

function markDone(key) {
  _idempotency.add(key);

  if (_idempotency.size > 4000) _idempotency.clear();
}
/* =========================================================
   CACHE SYSTEM (ลด Google API)
========================================================= */

const cacheStore = {};

function setCache(key,data,ttl=60000){

  cacheStore[key] = {
    data,
    expire: Date.now() + ttl
  };

}

function getCache(key){

  const item = cacheStore[key];

  if(!item) return null;

  if(Date.now() > item.expire){
    delete cacheStore[key];
    return null;
  }

  return item.data;

}

function convertProviderRole(role){

  if(!role) return "-";

  const map = {
    "พยาบาลวิชาชีพ":"RN",
    "แพทย์":"MD",
    "เภสัชกร":"PHARM",
    "เจ้าหน้าที่สาธารณสุข":"PH",
    "ทันตแพทย์":"DDS"
  };

  return map[role] || role;

}
/* =========================================================
   STANDARD LOGGER
========================================================= */

function logInfo(tag,data){

  console.log(`[INFO][${tag}]`,JSON.stringify(data,null,2));

}

function logError(tag,err){

  console.error(`[ERROR][${tag}]`,err);

}


/* =========================================================
   LINE RETRY SYSTEM
========================================================= */

async function pushLineRetry(lineUID,message,retry=3){

  for(let i=0;i<retry;i++){

    try{

      await lineService.pushMessage(lineUID,message);

      logInfo("LINE_SENT",{lineUID});

      return true;

    }catch(err){

      logError("LINE_RETRY",{try:i+1,error:err.message});

      if(i === retry-1){
        throw err;
      }

      await new Promise(r=>setTimeout(r,1000));

    }

  }

}


/* =========================================================
   2️⃣ SHEET CONSTANT
========================================================= */

const SHEET_MASTER = "VaccineMaster";
const SHEET_RECORD = "VaccinationRecords";
const SHEET_APPOINT = "VaccinationAppointments";
const SHEET_PATIENT = "Patients";
const SHEET_SCHEDULE = "Vaccine_Schedule";
const SHEET_REMINDER = "Reminder";


/* =========================================================
   3️⃣ UTIL FUNCTIONS
========================================================= */

function addDays(date, days) {
  const d = new Date(date);
  if (isNaN(d)) throw new Error("Invalid dateService");
  d.setDate(d.getDate() + Number(days || 0));
  return d;
}

function addMonths(date, months) {
  const d = new Date(date);
  if (isNaN(d)) throw new Error("Invalid dateService");
  d.setMonth(d.getMonth() + Number(months || 0));
  return d;
}

function calculateDueDate(dateService, intervalType, intervalValue) {
  if (intervalType === "months") return addMonths(dateService, intervalValue);
  return addDays(dateService, intervalValue);
}

function toISO(date) {
  const d = new Date(date);
  if (isNaN(d)) return "";
  return d.toISOString().split("T")[0];
}

function calculateAge(birth) {

  if (!birth) return "-";

  if (typeof birth === "string" && birth.length === 6) {
    const d = birth.substring(0, 2);
    const m = birth.substring(2, 4);
    const y = Number(birth.substring(4, 6)) + 2500 - 543;
    birth = `${y}-${m}-${d}`;
  }

  const b = new Date(birth);
  const t = new Date();

  let age = t.getFullYear() - b.getFullYear();

  if (
    t.getMonth() < b.getMonth() ||
    (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())
  ) {
    age--;
  }

  return age;
}

function formatThaiDate(date){

  if(!date) return "";

  const d = new Date(date);
  if(isNaN(d)) return date;

  const months = [
    "ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.",
    "ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."
  ];

  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear()+543;

  return `${day} ${month} ${year}`;
}

/* =========================================================
   4️⃣ ID GENERATORS
========================================================= */
let vcnLock = false;

async function getNextVCN() {
  return await lock("VCN_GENERATE", async () => {
    return await genVCN();
  });
}

async function genVCN() {

  const sheets = await getSheets();
  const spreadsheetId = process.env.SPREADSHEET_ID;

  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");

  const prefix = `VCN${y}${m}`;
  const yearPrefix = `VCN${y}`;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_RECORD}!A2:A`
  });

  const rows = res.data.values || [];

  let max = 0;

  rows.forEach(r => {
    if (!r[0]) return;

    if (r[0].startsWith(yearPrefix)) {
      const parts = r[0].split("-");
      if (parts.length === 2) {
        const num = parseInt(parts[1], 10);
        if (!isNaN(num) && num > max) {
          max = num;
        }
      }
    }
  });

  const next = max + 1;

  return `${prefix}-${String(next).padStart(5, "0")}`;
}

async function genAPID() {

  const sheets = await getSheets();
  const spreadsheetId = process.env.SPREADSHEET_ID;

  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");

  const prefix = `VAP${y}${m}`;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_APPOINT}!A2:A`
  });

  const rows = res.data.values || [];

  const count = rows.filter(r => r[0] && r[0].startsWith(prefix)).length + 1;

  return `${prefix}-${String(count).padStart(5, "0")}`;
}

async function genREMID() {

  const sheets = await getSheets();
  const spreadsheetId = process.env.SPREADSHEET_ID;

  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");

  const prefix = `REM${y}${m}`;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_REMINDER}!A2:A`
  });

  const rows = res.data.values || [];

  const count = rows.filter(r => r[0] && r[0].startsWith(prefix)).length + 1;

  return `${prefix}-${String(count).padStart(5, "0")}`;
}

/* =========================================================
   GET NEXT VCN
========================================================= */

async function getNextVCN(){

  const vcn = await getNextVCN();

  return { vcn };

}
/* =========================================================
   5️⃣ MASTER DATA
========================================================= */

async function getVaccineMaster(){

  const cacheKey = "VaccineMaster";

  const cached = getCache(cacheKey);
  if(cached) return cached;

  const sheets = await getSheets();
  const spreadsheetId = process.env.SPREADSHEET_ID;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range:`${SHEET_MASTER}!A2:F`
  });

  const rows = res?.data?.values || [];

  const data = rows.map(r=>({
    code:r[0],
    name:r[1],
    totalDose:Number(r[2]||0),
    allowBooster:r[3]==="TRUE",
    active:r[4]==="TRUE",
    TH_Name:r[5] || r[1]
  }));

  setCache(cacheKey,data,300000); 
  // cache 5 นาที
  logInfo("VaccineMaster_LOADED",{count:data.length});

  return data;
}

async function getVaccineSchedule(vaccineCode) {

  const sheets = await getSheets();
  const spreadsheetId = process.env.SPREADSHEET_ID;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_SCHEDULE}!A2:D`
  });

  const rows = res.data.values || [];

  return rows
    .filter(r => r[0] === vaccineCode)
    .map(r => ({
      vaccineCode: r[0],
      doseNo: Number(r[1] || 0),
      intervalType: r[2] || "days",
      intervalValue: Number(r[3] || 0)
    }))
    .sort((a, b) => a.doseNo - b.doseNo);
}


/* =========================================================
   6️⃣ PATIENT DATA
========================================================= */

async function getPatient(cid){

  const cacheKey = `patient_${cid}`;

  const cached = getCache(cacheKey);

  if(cached){
    logInfo("CACHE_PATIENT",{cid});
    return cached;
  }

  const sheets = await getSheets();
  const spreadsheetId = process.env.SPREADSHEET_ID;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_PATIENT}!A2:K`
  });

  const rows = res.data.values || [];

  for (let r of rows) {

    if (String(r[0]) === String(cid)) {

      let lineUID = r[10] || "";

if(!lineUID){
  lineUID = await getLineUIDByCID(r[0]);
}

const patient = {
  cid: r[0],
  prename: r[1] || "",
  firstName: r[2] || "",
  lastName: r[3] || "",
  hn: r[4] || "",
  sex: r[5] || "",
  birthDate: r[7] || r[6],
  age: calculateAge(r[7] || r[6]),
  telephone: r[8] || "",
  phone: r[9] || r[8] || "",
  lineUID: lineUID || ""
};

      setCache(cacheKey,patient,60000);

      return patient;

    }

  }

  return null;

}


/* =========================================================
   7️⃣ APPOINTMENT QUERY
========================================================= */

async function getAppointmentsByVaccine(cid, vaccineCode) {

  const sheets = await getSheets();
  const spreadsheetId = process.env.SPREADSHEET_ID;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_APPOINT}!A2:N`
  });

  const rows = res.data.values || [];

  return rows.filter(r =>
  String(r[1]) === String(cid) &&
  r[3] === vaccineCode
);

}


/* =========================================================
   8️⃣ REMINDER SYSTEM
========================================================= */

async function createReminder(patient, vaccineCode, doseNo, appointmentDate, apid) {

  if (!appointmentDate) return;

  const sheets = await getSheets();
  const spreadsheetId = process.env.SPREADSHEET_ID;

  const notify30 = addDays(appointmentDate, -30);
  const notify7 = addDays(appointmentDate, -7);
  const notify1 = addDays(appointmentDate, -1);
  const notify0 = new Date(appointmentDate);

  const base = await genREMID();

  const rows = [
    [base+"-1", apid, patient.cid, patient.hn || "", vaccineCode, doseNo, toISO(appointmentDate), toISO(notify30),"BEFORE_30_DAY","LINE","PENDING",new Date().toISOString()],
    [base+"-2", apid, patient.cid, patient.hn || "", vaccineCode, doseNo, toISO(appointmentDate), toISO(notify7),"BEFORE_7_DAY","LINE","PENDING",new Date().toISOString()],
    [base+"-3", apid, patient.cid, patient.hn || "", vaccineCode, doseNo, toISO(appointmentDate), toISO(notify1),"BEFORE_1_DAY","LINE","PENDING",new Date().toISOString()],
    [base+"-4", apid, patient.cid, patient.hn || "", vaccineCode, doseNo, toISO(appointmentDate), toISO(notify0),"DAY_OF_APPOINTMENT","LINE","PENDING",new Date().toISOString()]
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${SHEET_REMINDER}!A2`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: rows }
  });
  await new Promise(r => setTimeout(r, 300));

}


/* =========================================================
   9️⃣ CREATE APPOINTMENTS
========================================================= */

async function createVaccinationAppointments(
  patient,
  vaccineCode,
  dateService,
  doseNo,
  vcn
) {
  const sheets = await getSheets();
  const spreadsheetId = process.env.SPREADSHEET_ID;

  const createdAppointments = [];

  try {
    /*************************************************
     * 1. LOAD SCHEDULE
     *************************************************/
    const schedules = await getVaccineSchedule(vaccineCode);

    if (!Array.isArray(schedules) || schedules.length === 0) {
      return [];
    }

    const baseDate = new Date(dateService);
    if (isNaN(baseDate)) {
      throw new Error("Invalid dateService");
    }

    /*************************************************
     * 2. BUILD NEXT APPOINTMENTS
     *************************************************/
    for (const s of schedules) {
      const nextDose = Number(s.doseNo || 0);

      // skip current & past dose
      if (nextDose <= Number(doseNo)) continue;

      /*************************************************
       * 3. CALCULATE DATE
       *************************************************/
      const apptDate = calculateDueDate(
        baseDate,
        s.intervalType,
        s.intervalValue
      );

      const apptISO = toISO(apptDate);

      /*************************************************
       * 4. BUILD ROW (FIXED SCHEMA)
       * VCN | CID | HN | VaccineCode | DoseNo |
       * AppointmentDate | Status | CreatedAt | CompletedAt
       *************************************************/
      const row = [
        vcn,                        // A VCN
        patient.cid,               // B CID
        patient.hn || "",          // C HN
        vaccineCode,               // D VaccineCode
        nextDose,                  // E DoseNo
        apptISO,                   // F AppointmentDate
        "PENDING",                 // G Status
        new Date().toISOString(),  // H CreatedAt
        ""                         // I CompletedAt
      ];

      /*************************************************
       * 5. SAVE TO SHEET
       *************************************************/
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${SHEET_APPOINT}!A2`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [row]
        }
      });

      /*************************************************
       * 6. RETURN RESULT
       *************************************************/
      createdAppointments.push({
        vcn,
        cid: patient.cid,
        vaccineCode,
        doseNo: nextDose,
        appointmentDate: apptISO,
        status: "PENDING"
      });
    }

    return createdAppointments;
  } catch (err) {
    console.error("❌ createVaccinationAppointments ERROR:", err);
    throw err;
  }
}


/* =========================================================
   🔟 SAVE VACCINATION
========================================================= */

async function saveVaccination(data) {

const d = normalizeVaccination(data);

const {
  cid,
  vaccineCode,
  refInvid,
  doseNo,
  dateService,
  providerRole,
  providerName,
  locationType,
  locationDetail,
  lotNumber
} = d;
  if (!d.cid) throw new Error("CID required");
  if (!d.vaccineCode) throw new Error("vaccineCode required");
  if (!d.refInvid) throw new Error("refInvid required");
  if (d.doseNo === undefined || d.doseNo === null || d.doseNo === "")
  throw new Error("doseNo required");
  if (!d.dateService) throw new Error("dateService required");


  const sheets = await getSheets();

  const spreadsheetId =
    process.env.SPREADSHEET_ID;

  /*********************************************************
   * PATIENT
   *********************************************************/
  const patient = await getPatient(d.cid);

  if (!patient) {
    throw new Error("Patient not found");
  }

  /*********************************************************
   * GENERATE VCN
   *********************************************************/
  const vcn =
    await getNextVCN();

  /*********************************************************
   * SAVE: VaccinationRecords
   *********************************************************/
const recordRow = [
  vcn,
  d.cid || "",
  patient.hn || "",
  d.vaccineCode || "",
  Number(d.doseNo || 0),
  d.dateService || "",
  d.providerRole || "",
  d.providerName || "",
  d.locationType || "",
  d.locationDetail || "",
  d.lotNumber || "",
  "COMPLETED",
  new Date().toISOString(),
  d.refInvid || ""
];

  await sheets.spreadsheets.values.append({

    spreadsheetId,

    range:
      `VaccinationRecords!A2`,

    valueInputOption:
      "USER_ENTERED",

    requestBody: {
      values: [recordRow]
    }

  });

  /*********************************************************
   * SAVE: VaccineMovement
   *********************************************************/
  const moveId =
    `MOV${Date.now()}`;

  const movementRow = [

    // A MOVEID
    moveId,

    // B Date
    new Date().toISOString(),

    // C Code
    vaccineCode,

    // D Type
    "OUT",

    // E Qty
    1,

    // F Balance
    "",

    // G Lot
    d.lotNumber || "",

    // H Ref
    vcn

  ];

  await sheets.spreadsheets.values.append({

    spreadsheetId,

    range:
      `VaccineMovement!A2`,

    valueInputOption:
      "USER_ENTERED",

    requestBody: {
      values: [movementRow]
    }

  });

  /*********************************************************
   * COMPLETE OLD APPOINTMENT
   *********************************************************/
  await completeAppointment(
  d.cid,
  d.vaccineCode,
  d.doseNo
);

  /*********************************************************
   * CREATE NEXT APPOINTMENTS
   *********************************************************/
  const appointments =
    await createVaccinationAppointments(

      patient,
      vaccineCode,
      dateService,
      doseNo,
      vcn

    );

  /*********************************************************
   * CREATE REMINDER
   *********************************************************/
  for (const appt of appointments) {

    const reminderId =
      `REM${Date.now()}${Math.floor(Math.random()*1000)}`;

    const notifyDate =
      appt.AppointmentDate;

    const reminderRow = [

      // A ReminderID
      reminderId,

      // B VCN
      vcn,

      // C CID
      cid,

      // D HN
      patient.hn || "",

      // E VaccineCode
      vaccineCode,

      // F DoseNo
      appt.DoseNo || "",

      // G AppointmentDate
      appt.AppointmentDate || "",

      // H NotifyDate
      notifyDate,

      // I NotifyType
      "BEFORE_1_DAY",

      // J Channel
      "LINE",

      // K Status
      "PENDING",

      // L CreatedAt
      new Date().toISOString()

    ];

    await sheets.spreadsheets.values.append({

      spreadsheetId,

      range:
        `Reminder!A2`,

      valueInputOption:
        "USER_ENTERED",

      requestBody: {
        values: [reminderRow]
      }

    });

  }

  return {
    success: true,
    vcn
  };

}




async function sendLineByButton(vcn) {

  const key = `BTN_LINE_${vcn}`;

  if (isDuplicate(key)) {
    return { success: false, message: "duplicate click blocked" };
  }

  markDone(key);

  return await sendLineVaccine(vcn);
}

/* =========================================================
   11 RECORD QUERY
========================================================= */

async function getVaccinationRecords(cid){

  const sheets = await getSheets();
  const spreadsheetId = process.env.SPREADSHEET_ID;

  const vaccines = await getVaccineMaster(); // โหลด master

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_RECORD}!A2:N`
  });

  const rows = res.data.values || [];

  return rows
    .filter(r => String(r[1]) === String(cid))
    .map(r => {

      const code = r[3];

      const vaccine = vaccines.find(v => v.code === code) || {};

      return {
        vcn: r[0],
        cid: r[1],
        hn: r[2],
        vaccineCode: code,
        TH_Name: vaccine.TH_Name || code,
        name: vaccine.name || code,
        doseNo: Number(r[4] || 0),
        dateService: r[5],
        providerRole: r[6],
        providerName: r[7],
        locationType: r[8],
        locationDetail: r[9],
        lotNumber: r[10],
        nextDueDate: r[11],
        status: r[12],
        createdAt: r[13]
      };

    });

}


/* =========================================================
   12 TIMELINE / HISTORY
========================================================= */

async function getVaccinationTimeline(cid) {
  const records = await getVaccinationRecords(cid);
  records.sort((a,b)=>new Date(a.dateService)-new Date(b.dateService));
  return records;
}

async function getLatestVaccines(cid) {

  const records = await getVaccinationRecords(cid);
  const map = {};

  records.forEach(r => {
    if(!map[r.vaccineCode]){
      map[r.vaccineCode] = r;
    }else{
      if(new Date(r.dateService) > new Date(map[r.vaccineCode].dateService)){
        map[r.vaccineCode] = r;
      }
    }
  });

  return Object.values(map);
}

async function getVaccinationHistory(cid) {
  const records = await getVaccinationRecords(cid);
  records.sort((a,b)=>new Date(b.dateService)-new Date(a.dateService));
  return records;
}


/* =========================================================
   13 APPOINTMENT MANAGEMENT
========================================================= */

async function getAppointments(cid){

  const sheets = await getSheets();
  const spreadsheetId = process.env.SPREADSHEET_ID;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_APPOINT}!A2:N`
  });

  const rows = res.data.values || [];

  return rows
    .filter(r => String(r[1]) === String(cid))
    .map(r => ({
      apid:r[0],
      cid:r[1],
      hn:r[2],
      vaccineCode:r[3],
      doseNo:Number(r[4]||0),
      appointmentDate:r[5],
      status:r[6]
    }))
    .sort((a,b)=>new Date(a.appointmentDate)-new Date(b.appointmentDate));

}
function isProcessed(key){
  return _idempotency.has(key);
}

function markProcessed(key){
  _idempotency.add(key);
}
async function completeAppointment(cid, vaccineCode, doseNo){

  const sheets = await getSheets();
  const spreadsheetId = process.env.SPREADSHEET_ID;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range:`${SHEET_APPOINT}!A2:N`
  });

  const rows = res.data.values || [];

  const index = rows.findIndex(r =>
    String(r[1]) === String(cid) &&
    String(r[3]) === String(vaccineCode) &&
    Number(r[4]) === Number(doseNo) &&
    String(r[6]).trim().toUpperCase() === "PENDING"
  );

  if(index === -1) return;

  rows[index][6] = "DONE";
  rows[index][8] = new Date().toISOString();

  const rowNumber = index + 2;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range:`${SHEET_APPOINT}!A${rowNumber}:N${rowNumber}`,
    valueInputOption:"USER_ENTERED",
    requestBody:{ values:[rows[index]] }
  });
}

/* =========================================================
   14 DELETE RECORD
========================================================= */

async function deleteVaccination(vcn){

  const sheets = await getSheets();
  const spreadsheetId = process.env.SPREADSHEET_ID;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range:`${SHEET_RECORD}!A2:A`
  });

  const rows = res.data.values || [];

  const index = rows.findIndex(r => r[0] === vcn);

  if(index === -1){
    throw new Error("Vaccination record not found");
  }

  const startIndex = index + 1;
  const endIndex = startIndex + 1;

  const meta = await sheets.spreadsheets.get({ spreadsheetId });

  const sheet = meta.data.sheets.find(
    s => s.properties.title === SHEET_RECORD
  );

  const sheetId = sheet.properties.sheetId;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody:{
      requests:[
        {
          deleteDimension:{
            range:{
              sheetId,
              dimension:"ROWS",
              startIndex,
              endIndex
            }
          }
        }
      ]
    }
  });

  return { success:true };

}

const Redis = require("ioredis");

const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true
});
// ================= REDIS LOCK =================
async function acquireLock(key, ttl = 14000) {
  const res = await redis.set(key, "1", "PX", ttl, "NX");
  return res === "OK";
}

async function releaseLock(key) {
  await redis.del(key);
}

// ================= IDEMPOTENCY =================
async function isExists(key) {
  return (await redis.exists(key)) === 1;
}

async function setKey(key, ttl) {
  await redis.set(key, "1", "PX", ttl);
}

async function sendLineVaccine(vcn) {

  const lockKey = `lock:line:${vcn}`;
  const sendingKey = `sending:line:${vcn}`;
  const sentKey = `sent:line:${vcn}`;

  // 🔒 กันยิงพร้อมกันทุก instance
  const locked = await acquireLock(lockKey, 14000);

  if (!locked) {
    logInfo("[SKIP_LOCKED]", { vcn });
    return { success: true, skipped: "LOCKED" };
  }

  try {

    logInfo("[SEND_LINE_VACCINE_START]", { vcn });

    // ✅ เคยส่งแล้ว → ไม่ต้องส่งอีก
    if (await isExists(sentKey)) {
      logInfo("[SKIP_DUPLICATE_SENT]", { vcn });
      return { success: true, skipped: "ALREADY_SENT" };
    }

    // ⛔ กำลังส่งอยู่ → skip
    if (await isExists(sendingKey)) {
      logInfo("[SKIP_SENDING]", { vcn });
      return { success: true, skipped: "SENDING" };
    }

    // 🔥 mark ว่ากำลังส่ง
    await setKey(sendingKey, 30000);

    /* ================= GET RECORD ================= */
    const record = await getVaccinationByVCN(vcn);
    if (!record) throw new Error("Vaccination record not found");

    /* ================= GET PATIENT ================= */
    const patient = await getPatient(record.cid);
    if (!patient) throw new Error("Patient not found");

    /* ================= LINE UID ================= */
    let lineUID = String(patient.lineUID || "").trim();

    if (!lineUID) {
      logInfo("[LINE_UID_CACHE_MISS]", { cid: record.cid });
      lineUID = await getLineUIDByCID(record.cid);
    }

    if (!lineUID) {
      logError("[LINE_UID_NOT_FOUND]", { cid: record.cid });
      return { success: false, error: "LINE UID not found" };
    }

    logInfo("[LINE_UID_FOUND]", { lineUID });

    /* ================= VACCINE MASTER ================= */
    const vaccines = await getVaccineMaster();

    const code = String(record.vaccineCode || "").trim().toUpperCase();

    const vaccine = vaccines.find(v =>
      String(v.code || "").trim().toUpperCase() === code
    ) || {};

    const vaccineNameTH = vaccine.TH_Name || "-";
    const vaccineNameEN = vaccine.name || "-";
    const totalDose = vaccine.totalDose ?? "-";

    /* ================= FLEX MESSAGE ================= */
    // ❗ ใช้ Flex เดิมของคุณ 그대로 (ไม่แก้ ไม่ตัด)

    const flex = {
      type: "flex",
      altText: "Vaccination Record",
      contents: {
        type: "bubble",
        size: "mega",
        hero: {
          type: "image",
          url: "https://drive.google.com/uc?export=view&id=1O366lb3XphBKeVv51F5nNHIOEvdEh-jI",
          size: "full",
          aspectRatio: "20:13",
          aspectMode: "cover"
        },
        body: {
          type: "box",
          layout: "vertical",
          spacing: "lg",
          contents: [
            {
              type: "text",
              text: "บันทึกการได้รับวัคซีน",
              weight: "bold",
              size: "xl",
              align: "center",
              color: "#006666"
            },
            {
              type: "text",
              text: "VACCINATION RECORD",
              size: "sm",
              align: "center",
              color: "#9E9E9E"
            },
            { type: "separator" },
            {
              type: "text",
              text: `${patient.firstName} ${patient.lastName}`,
              size: "xl",
              weight: "bold",
              align: "center",
              color: "#fba003fd"
            },
            { type: "separator" },
            {
              type: "text",
              text: "📅 วันที่รับบริการ",
              weight: "bold",
              color: "#0277BD"
            },
            {
              type: "text",
              text: record.dateService || "-",
              size: "md"
            },
            { type: "separator" },
            {
              type: "text",
              text: "📋 รายละเอียดวัคซีน",
              weight: "bold",
              color: "#0277BD"
            },
            {
              type: "box",
              layout: "vertical",
              spacing: "sm",
              margin: "md",
              contents: [
                {
                  type: "text",
                  text: vaccineNameTH,
                  weight: "bold",
                  size: "md",
                  wrap: true
                },
                {
                  type: "text",
                  text: `(${vaccineNameEN})`,
                  size: "xs",
                  color: "#757575"
                },
                {
                  type: "text",
                  text: `Lot: ${record.lotNumber || "-"} | Dose ${record.doseNo}/${totalDose}`,
                  size: "xs",
                  color: "#757575"
                }
              ]
            }
          ]
        },
        footer: {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          contents: [
            {
              type: "button",
              style: "primary",
              color: "#6A1B9A",
              action: {
                type: "uri",
                label: "💉 ประวัติวัคซีน",
                uri: `https://liff.line.me/2007902507-SCwT4XsP/vaccine-history.html?cid=${record.cid}`
              }
            }
          ]
        }
      }
    };

    /* ================= PUSH WITH RETRY ================= */

    let pushSuccess = false;
    let lastError = null;

    for (let i = 1; i <= 3; i++) {
      try {
        await lineService.pushMessage(lineUID, flex);
        pushSuccess = true;
        logInfo("[LINE_PUSH_SUCCESS]", { vcn, lineUID, try: i });
        break;
      } catch (err) {
        lastError = err;
        logError("[LINE_RETRY_FAIL]", { try: i, error: err.message });
        await new Promise(r => setTimeout(r, 500 * i));
      }
    }

    if (!pushSuccess) {
      logError("[LINE_PUSH_FAILED_FINAL]", lastError?.message);
      return { success: false, error: lastError?.message };
    }

    // ✅ mark ว่าส่งสำเร็จแล้ว
    await setKey(sentKey, 86400000); // 24 ชม.

    logInfo("[SEND_LINE_SUCCESS]", { vcn, lineUID });

    return { success: true };

  } catch (err) {

    logError("[SEND_LINE_ERROR]", err.message);

    return { success: false, error: err.message };

  } finally {

    // 🔓 ปล่อย lock เสมอ
    await releaseLock(lockKey);

    // ❗ ลบ sendingKey เพื่อให้ retry ได้
    await redis.del(sendingKey);

    logInfo("[SEND_LINE_FINISH]", { vcn });

  }
}

async function getVaccinationByVCN(vcn){

  const sheets = await getSheets();
  const spreadsheetId = process.env.SPREADSHEET_ID;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_RECORD}!A2:N`
  });

  const rows = res?.data?.values || [];

  const r = rows.find(x => x[0] === vcn);

  if(!r) return null;

  return {
  vcn:r[0],
  cid:r[1],
  hn:r[2],
  vaccineCode:r[3],
  doseNo:Number(r[4]||0),
  dateService:r[5],
  providerRole:r[6],
  providerName:r[7],
  locationType:r[8],
  locationDetail:r[9],
  lotNumber:r[10]
};

}

async function getLineUIDByCID(cid) {

  if (!cid) return null;

  const normalizedCID = String(cid).trim();

  const cacheKey = `lineuid_${normalizedCID}`;
  const cached = getCache(cacheKey);
  if (cached) {
    console.log("⚡ cache hit:", normalizedCID);
    return cached;
  }

  try {

    const sheets = await getSheets();
    const spreadsheetId = process.env.SPREADSHEET_ID;

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "LineUID!A2:I"
    });

    const rows = res.data.values || [];

    for (const r of rows) {

      const sheetCID = String(r[1] || "").trim();

      if (sheetCID === normalizedCID) {

        const lineUID = String(r[4] || "").trim();

        if (lineUID) {

          setCache(cacheKey, lineUID, 300000); // 5 นาที

          console.log("✅ FOUND LINE UID:", normalizedCID);

          return lineUID;

        }

      }

    }

    console.warn("⚠️ ไม่พบ LINE UID:", normalizedCID);

    return null;

  } catch (err) {

    console.error("❌ getLineUIDByCID error:", err.message);

    return null;

  }

}

/* =========================================================
   DASHBOARD SUMMARY
========================================================= */

async function getDashboardSummary() {
  try {

    const sheets = await getSheets();
    const spreadsheetId = process.env.SPREADSHEET_ID;

    const [recordsRes, patientsRes, vaccineRes, apptRes] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId, range: "VaccinationRecords!A2:M" }),
      sheets.spreadsheets.values.get({ spreadsheetId, range: "Patients!A2:J" }),
      sheets.spreadsheets.values.get({ spreadsheetId, range: "VaccineMaster!A2:H" }),
      sheets.spreadsheets.values.get({ spreadsheetId, range: "VaccinationAppointments!A2:H" }),
    ]);

    const records = recordsRes.data.values || [];
    const patients = patientsRes.data.values || [];
    const vaccines = vaccineRes.data.values || [];
    const appointments = apptRes.data.values || [];

    // ---------------- MAP ----------------
    const patientMap = {};
    patients.forEach(r => {
      if (!r[0]) return;
      patientMap[r[0]] = `${r[2] || ""} ${r[3] || ""}`;
    });

    const vaccineMap = {};
    vaccines.forEach(r => {
      if (!r[0]) return;
      vaccineMap[r[0]] = r[1];
    });

    const apptMap = {};
    appointments.forEach(r => {
      const CID = r[1];
      const date = r[5];

      if (!CID || !date) return;

      if (!apptMap[CID]) apptMap[CID] = [];

      const d = new Date(date);
      if (!isNaN(d)) apptMap[CID].push(d);
    });

    // ---------------- GROUP ----------------
    const personMap = {};

    records.forEach(r => {
      const CID = r[1];
      if (!CID) return;

      if (!personMap[CID]) {
        personMap[CID] = {
          CID,
          fullname: patientMap[CID] || "-",
          vaccines: new Set(),
          lastDate: null
        };
      }

      const vaccineCode = r[3];
      const dateService = new Date(r[5]);

      if (vaccineCode) {
        const name = vaccineMap[vaccineCode] || vaccineCode;
        personMap[CID].vaccines.add(name);
      }

      if (!isNaN(dateService?.getTime?.())) {
        if (!personMap[CID].lastDate || dateService > new Date(personMap[CID].lastDate)) {
          personMap[CID].lastDate = dateService;
        }
      }
    });

    // ---------------- BUILD ----------------
    const result = Object.values(personMap).map(p => {

      let nextAppt = "-";

      if (apptMap[p.CID]) {
        const now = new Date();

        const future = apptMap[p.CID]
          .filter(d => d >= now)
          .sort((a, b) => a - b);

        if (future.length) {
          nextAppt = future[0];
        }
      }

      return {
        CID: p.CID,
        fullname: p.fullname,
        vaccines: Array.from(p.vaccines).join(", "),
        lastDate: p.lastDate,
        nextAppt
      };
    });

    return result;

  } catch (err) {
    console.error("❌ getDashboardSummary ERROR:", err);
    throw err;
  }
}

async function getSchedule(){

  const sheets = await getSheets();
  const spreadsheetId = process.env.SPREADSHEET_ID;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_SCHEDULE}!A2:D`
  });

  const rows = res.data.values || [];

  return rows.map(r => ({
    vaccineCode: r[0],
    doseNo: Number(r[1] || 0),
    intervalType: r[2] || "days",
    intervalValue: Number(r[3] || 0)
  }));

}

const sentCache = new Map();

function isSent(key) {
  const data = sentCache.get(key);
  if (!data) return false;

  if (Date.now() > data.expire) {
    sentCache.delete(key);
    return false;
  }

  return true;
}

function markSent(key, ttl = 60000) {
  sentCache.set(key, {
    expire: Date.now() + ttl
  });
}


async function saveBulk(data){
  const sheets = await getSheets();

  const values = data.map(v => [v.code, v.name]);

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.VACCINE_SPREADSHEET_ID,
    range: "VaccineMaster!A:B",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values
    }
  });
}

async function getVaccineInventory() {

  const sheet = await googleSheet.getSheet("VaccineInventory");

  const rows = await sheet.getRows();

  return rows.map(r => ({
    code: r.Code,
    name: r.Name,
    stock: r.Stock
  }));
}

/******************************************************************
 * CREATE INVENTORY
 ******************************************************************/
async function createInventory(data){

  try{

    console.log("📦 CREATE INVENTORY DATA:", data);

    const {
      appendRow
    } = require("../../../../config/google");

    const inventoryId =
      "INV" + Date.now();

    await appendRow("VaccineInventory",[

      // A
      inventoryId,

      // B
      new Date().toISOString(),

      // C = Code
      String(data.code || "").trim(),

      // D = Quantity
      Number(data.qty || 0),

      // E = Lot
      String(data.lot || "").trim(),

      // F = Exp
      String(data.exp || "").trim(),

      // G = From
      String(data.from || "").trim(),

      // H = Provider
      String(data.provider || "").trim(),

      String(data.dateReceived || "").trim()

    ]);

    await appendRow("VaccineMovement", [

  // Movement ID
  "MOV" + Date.now(),

  // Date
  new Date().toISOString(),

  // Vaccine Code
  String(data.code || "").trim(),

  // Type
  "IN",

  // Qty (รับเข้า)
  Number(data.qty || 0),

  // Balance (ค่อยคำนวณภายหลัง)
  "",

  // Lot
  String(data.lot || "").trim(),

  // Ref (อ้างอิง inventory)
  inventoryId

]);

    return {
      success:true,
      inventoryId
    };

  }catch(err){

    console.error("createInventory error:", err);

    return {
      success:false,
      error:err.message
    };

  }

};


async function getInventory() {
  try {

    const sheets = await getSheets();
    const spreadsheetId = process.env.SPREADSHEET_ID;

    const invRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "VaccineInventory!A2:I"
    });

    const masterRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "VaccineMaster!A2:F"
    });

    const invRows = invRes?.data?.values || [];
    const masterRows = masterRes?.data?.values || [];

    const vaccineMap = {};

    masterRows.forEach(r => {
      const code = String(r[0] || "").trim();
      vaccineMap[code] = {
        code,
        name: String(r[1] || "").trim()
      };
    });

    return invRows.map(r => {

      const code = String(r[2] || "").trim();
      const vaccine = vaccineMap[code] || {};

      return {
        INVID: r[0] || "",
        DateINV: r[1] || "",
        Code: code,
        Name: vaccine.name || "-",
        Quantity: Number(r[3] || 0),
        lot: r[4] || "",
        Exp: r[5] || "",
        DateReceived: r[8] || "-"
      };

    });

  } catch (err) {
    console.error("❌ getInventory ERROR:", err);

    // 🔥 สำคัญมาก: ต้อง return array เสมอ
    return [];
  }
}

async function uploadHISZip(file){

  console.log("📦 HIS ZIP:", file.originalname);

  const zip =
    new AdmZip(file.buffer);

  const entries =
    zip.getEntries();

  let drugRows = [];
  let personalRows = [];

  /* =====================================
     READ FILES
  ===================================== */

  for(const entry of entries){

    const name =
      entry.entryName.toUpperCase();

    console.log("📄 FILE:", name);

    const buffer =
      entry.getData();

    const text =
      iconv.decode(buffer,"tis620");

    const lines =
      text.split(/\r?\n/);

    /* =====================================
       DRUG_OPD
    ===================================== */

    if(name.includes("DRUG_OPD")){

      drugRows = lines
        .filter(x=>x.trim())
        .map(line=>{

          const cols =
            line.split("|");

          return {

            HN:cols[0],
            PID:cols[1],
            DATE_SERV:cols[2],
            DNAME:cols[18]

          };

        });

      console.log("💉 DRUG_OPD:", drugRows.length);

    }

    /* =====================================
       PERSONAL
    ===================================== */

    if(name.includes("PERSONAL")){

      personalRows = lines
        .filter(x=>x.trim())
        .map(line=>{

          const cols =
            line.split("|");

          return {

            CID:cols[1],
            PID:cols[3],
            PRENAME:cols[13],
            NAME:cols[14],
            LNAME:cols[15],
            HN:cols[0],
            SEX:cols[5],
            BIRTH:cols[6],
            TELEPHONE:cols[17],
            MOBILE:cols[18]

          };

        });

      console.log("👤 PERSONAL:", personalRows.length);

    }

  }

  /* =====================================
     LOAD VaccineMaster
  ===================================== */

  const vaccines =
    await getVaccineMaster();

  /* =====================================
     JOIN DATA
  ===================================== */

  const preview = [];

  for(const d of drugRows){

    const person =
      personalRows.find(
        p => String(p.PID) === String(d.PID)
      );

    if(!person) continue;

    const vaccine =
      vaccines.find(v =>

        String(v.name || "")
          .trim()
          .toLowerCase()

        ===

        String(d.DNAME || "")
          .trim()
          .toLowerCase()

      );

    if(!vaccine) continue;

    preview.push({

      selected:true,

      PID:d.PID,

      CID:person.CID,

      NAME:person.NAME,

      LNAME:person.LNAME,

      HN:person.HN,

      DNAME:d.DNAME,

      VaccineCode:vaccine.code,

      VaccineName:vaccine.TH_Name,

      DateService:d.DATE_SERV

    });

  }

  console.log("✅ MATCH:", preview.length);

  return preview;

}

exports.updateInventory = async ({
  id,
  code,
  qty,
  lot,
  exp,
  from,
  provider,
  dateReceived
}) => {

  return await db.query(`
    UPDATE VaccineInventory
    SET
      code = ?,
      qty = ?,
      lot = ?,
      exp = ?,
      source_from = ?,
      provider = ?,
      date_received = ?
    WHERE INVID = ?
  `, [
    code,
    qty,
    lot,
    exp,
    from,
    provider,
    dateReceived,
    id
  ]);

};


module.exports = {
  getVaccineMaster,
  getPatient,
  saveVaccination,
  getNextVCN,
  getVaccinationRecords,
  getVaccinationTimeline,
  getLatestVaccines,
  getVaccinationHistory,
  getAppointments,
  getSchedule,
  getInventory,
  deleteVaccination,
  uploadHISZip,
  sendLineVaccine,
  getDashboardSummary,
  createInventory,
  timeline:getVaccinationTimeline,
  latest:getLatestVaccines,
  history:getVaccinationHistory
};