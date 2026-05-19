const { getSheets } =
  require("../../../../config/google");

const {
  getPatient
} = require("./vaccination.patient.service");

const {
  getVaccineMaster
} = require("./vaccination.master.service");

const {
  completeAppointment,
  createVaccinationAppointments
} = require("./vaccination.appointment.service");

const SHEET_RECORD =
  "VaccinationRecords";


/* =========================================================
   normalizeVaccination
========================================================= */
function normalizeVaccination(data = {}) {

  return {

    cid:
      String(data.cid || "").trim(),

    vaccineCode:
      String(data.vaccineCode || "").trim(),

    refInvid:
      String(data.refInvid || "").trim(),

    doseNo:
      Number(data.doseNo || 0),

    dateService:
      String(data.dateService || "").trim(),

    providerRole:
      String(data.providerRole || "").trim(),

    providerName:
      String(data.providerName || "").trim(),

    locationType:
      String(data.locationType || "").trim(),

    locationDetail:
      String(data.locationDetail || "").trim(),

    lotNumber:
      String(data.lotNumber || "").trim()

  };

}


/* =========================================================
   saveVaccination
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
  ) || [];

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


/* =========================================================
   getVaccinationRecords
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
   getVaccinationTimeline
========================================================= */    
async function getVaccinationTimeline(cid) {
  const records = await getVaccinationRecords(cid);
  records.sort((a,b)=>new Date(a.dateService)-new Date(b.dateService));
  return records;
}



/* =========================================================
   getLatestVaccines
========================================================= */    
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


/* =========================================================
   getVaccinationHistory
========================================================= */    
async function getVaccinationHistory(cid) {
  const records = await getVaccinationRecords(cid);
  records.sort((a,b)=>new Date(b.dateService)-new Date(a.dateService));
  return records;
}

/* =========================================================
   deleteVaccination
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



/* =========================================================
   getVaccinationByVCN
========================================================= */    
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


/* =========================================================
   generateNextVCN
========================================================= */
async function generateNextVCN() {

  try {

    const sheets =
      await getSheets();

    const spreadsheetId =
      process.env.SPREADSHEET_ID;

    const res =
      await sheets.spreadsheets.values.get({

        spreadsheetId,
        range: `${SHEET_RECORD}!A2:A`

      });

    const rows =
      res?.data?.values || [];

    /*******************************************************
     * CURRENT YYYY + YYYYMM
     *******************************************************/
    const now = new Date();

    const yyyy =
      now.getFullYear();

    const mm =
      String(now.getMonth() + 1)
      .padStart(2, "0");

    const currentYYYYMM =
      `${yyyy}${mm}`;

    /*******************************************************
     * FILTER เฉพาะปีปัจจุบัน
     *******************************************************/
    const validVCNs =
      rows
        .map(r => String(r[0] || "").trim())
        .filter(v => {

          return (
            /^VCN\d{6}-\d{5}$/.test(v) &&
            v.startsWith(`VCN${yyyy}`)
          );

        });

    console.log(
      "📦 VALID VCN:",
      validVCNs
    );

    /*******************************************************
     * NO DATA
     *******************************************************/
    if (!validVCNs.length) {

      return `VCN${currentYYYYMM}-00001`;

    }

    /*******************************************************
     * FIND MAX RUNNING
     *******************************************************/
    const maxRunning =
      Math.max(

        ...validVCNs.map(v => {

          return parseInt(
            v.split("-")[1]
          ) || 0;

        })

      );

    const nextRunning =
      String(maxRunning + 1)
      .padStart(5, "0");

    return `VCN${currentYYYYMM}-${nextRunning}`;

  } catch (err) {

    console.error(
      "❌ generateNextVCN ERROR:",
      err
    );

    const now = new Date();

    const yyyy =
      now.getFullYear();

    const mm =
      String(now.getMonth() + 1)
      .padStart(2, "0");

    return `VCN${yyyy}${mm}-00001`;
  }
}


/* =========================================================
   getNextVCN
========================================================= */
async function getNextVCN() {

  return await generateNextVCN();

}


module.exports = {

  saveVaccination,
  getVaccinationRecords,
  getVaccinationTimeline,
  getLatestVaccines,
  getVaccinationHistory,
  deleteVaccination,
  getVaccinationByVCN,
  getNextVCN,
  generateNextVCN

};
