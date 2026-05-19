const { getSheets } = require("../../../../config/google");

const {
  SHEET_MASTER,
  SHEET_SCHEDULE
} = require("../core/vaccination.constants");

const {
  setCache,
  getCache
} = require("../core/vaccination.cache");



/* =========================================================
   VACCINE MASTER
========================================================= */
async function getVaccineMaster() {

  const cacheKey = "VaccineMaster_v1";

  const cached = getCache(cacheKey);
  if (cached) return cached;

  const sheets = await getSheets();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: `${SHEET_MASTER}!A2:F`
  });

  const rows = res?.data?.values;

  if (!Array.isArray(rows)) return [];

  const data = rows
    .filter(r => r && r.length >= 5)
    .map(r => ({
      code: String(r[0] || "").trim(),
      name: String(r[1] || "").trim(),
      totalDose: Number(r[2] || 0),
      allowBooster: String(r[3]).toUpperCase() === "TRUE",
      active: String(r[4]).toUpperCase() === "TRUE",
      TH_Name: String(r[5] || r[1]).trim()
    }))
    .filter(r => r.code); // กัน row ขยะ

  setCache(cacheKey, data, 300000);

  return data;
}



/* =========================================================
   VACCINE SCHEDULE
========================================================= */
async function getVaccineSchedule(vaccineCode) {

  const cacheKey = `VaccineSchedule_${vaccineCode}_v1`;

  const cached = getCache(cacheKey);
  if (cached) return cached;

  const sheets = await getSheets();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: `'${SHEET_SCHEDULE}'!A2:E`
  });

  const rows = res?.data?.values;

  if (!Array.isArray(rows)) return [];

  const data = rows
    .filter(r => r && r.length >= 4)
    .map(r => ({
      vaccineCode: String(r[0] || "").trim(),
      doseNo: Number(r[1] || 0),
      intervalType: String(r[2] || "").trim(),
      intervalValue: Number(r[3] || 0)
    }))
    .filter(r =>
      r.vaccineCode === String(vaccineCode) &&
      r.doseNo > 0
    )
    .sort((a, b) => a.doseNo - b.doseNo);

  setCache(cacheKey, data, 300000);

  return data;
}



/* =========================================================
   EXPORT
========================================================= */
module.exports = {
  getVaccineMaster,
  getVaccineSchedule
};