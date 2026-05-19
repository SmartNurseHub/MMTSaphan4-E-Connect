const { getSheets } = require("../../../../config/google");
const { SHEET_APPOINT } = require("../core/vaccination.constants");
const { getVaccineSchedule } = require("./vaccination.master.service");
const { calculateNextDose } = require("../engine/vaccination.engine");
const {
  calculateDueDate,
  toISO
} = require("../engine/vaccination.engine");
/* =========================================================
   GET
========================================================= */
async function getAppointments(cid) {

  const sheets = await getSheets();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: `${SHEET_APPOINT}!A2:N`
  });

  const rows = res.data.values || [];

  return rows
    .filter(r => String(r[1]) === String(cid))
    .map(r => ({
      apid: r[0],
      cid: r[1],
      hn: r[2],
      vaccineCode: r[3],
      doseNo: Number(r[4] || 0),
      appointmentDate: r[5],
      status: r[6]
    }))
    .sort((a, b) =>
      new Date(a.appointmentDate) - new Date(b.appointmentDate)
    );
}

/* =========================================================
   COMPLETE (ONLY STATUS UPDATE)
========================================================= */
async function completeAppointment(cid, vaccineCode, doseNo) {

  const sheets = await getSheets();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: `${SHEET_APPOINT}!A2:N`
  });

  const rows = res.data.values || [];

  const index = rows.findIndex(r =>
    String(r[1]) === String(cid) &&
    String(r[3]) === String(vaccineCode) &&
    Number(r[4]) === Number(doseNo) &&
    String(r[6]).toUpperCase() === "PENDING"
  );

  if (index === -1) return;

  rows[index][6] = "DONE";
  rows[index][8] = new Date().toISOString();

  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: `${SHEET_APPOINT}!A${index + 2}:N${index + 2}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [rows[index]]
    }
  });
}

/* =========================================================
   CREATE (PURE FUNCTION - NO BUSINESS LOGIC)
========================================================= */
async function createVaccinationAppointments({
  patient,
  vaccineCode,
  dateService,
  doseNo,
  vcn
}) {

  const sheets = await getSheets();
  const schedules = await getVaccineSchedule(vaccineCode);

  const baseDate = new Date(dateService);

  const results = [];

  for (const s of schedules) {

    if (Number(s.doseNo) <= Number(doseNo)) continue;

    // ENGINE ONLY
    const nextDate = calculateNextDose(
      { intervalDays: s.intervalValue },
      1,
      baseDate
    );

    const row = [
      vcn,
      patient.cid,
      patient.hn || "",
      vaccineCode,
      s.doseNo,
      nextDate,
      "PENDING",
      new Date().toISOString(),
      ""
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: `${SHEET_APPOINT}!A2`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [row] }
    });

    results.push({
      vcn,
      cid: patient.cid,
      vaccineCode,
      doseNo: s.doseNo,
      appointmentDate: nextDate,
      status: "PENDING"
    });
  }

  return results;
}

module.exports = {
  getAppointments,
  completeAppointment,
  createVaccinationAppointments
};