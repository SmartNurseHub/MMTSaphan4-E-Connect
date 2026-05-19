const { getSheets } =
  require("../../../../config/google");
const SHEET_PATIENT = "Patients";  
const cache = new Map();

function getCache(key) {
  return cache.get(key);
}

function setCache(key, value, ttl = 60000) {
  cache.set(key, value);

  setTimeout(() => {
    cache.delete(key);
  }, ttl);
}

/* =========================================================
   calculateAge
========================================================= */    
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






/* =========================================================
   getLineUIDByCID
========================================================= */
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
   getPatient
========================================================= */
async function getPatient(cid){

  const cacheKey = `patient_${cid}`;

  const cached = getCache(cacheKey);

  if(cached){
    console.log("CACHE_PATIENT", { cid });
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



module.exports = {
  getPatient,
  getLineUIDByCID,
  calculateAge
};