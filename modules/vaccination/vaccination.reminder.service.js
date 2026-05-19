/*****************************************************************
 * VACCINATION REMINDER SERVICE (ULTRA SAFE - NO DUPLICATE)
 *****************************************************************/

const { getSheets } = require("../../config/google");
const lineService = require("../lineOA/lineOA.line.service");
const pLimit = require("p-limit");

const SHEET_REMINDER = "Reminder";
const TIMEZONE = "Asia/Bangkok";

/* =========================================================
   CID
========================================================= */
function normalizeCID(cid) {
  if (!cid) return "";

  cid = String(cid)
    .replace(/'/g, "")
    .replace(/\s/g, "")
    .trim();

  if (cid.includes("E") || cid.includes("e")) {
    cid = Number(cid).toFixed(0);
  }

  cid = cid.replace(/\D/g, "");
  return cid.padStart(13, "0");
}

/* =========================================================
   DATE
========================================================= */
function todayISO() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function normalizeDate(d) {
  if (!d) return null;
  const date = new Date(d);
  if (isNaN(date)) return null;

  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function clean(str) {
  return String(str || "").trim();
}

/* =========================================================
   VACCINE MASTER (cache ได้)
========================================================= */
let vaccineCache = null;

async function getVaccineMasterMap() {
  if (vaccineCache) return vaccineCache;

  const sheets = await getSheets();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: `VaccineMaster!A2:F`
  });

  const rows = res.data.values || [];
  const map = {};

  for (const r of rows) {
    const code = clean(r[0]);
    const enName = clean(r[1]);
    const thName = clean(r[5]);

    if (code) {
      map[code] = { th: thName, en: enName };
    }
  }

  vaccineCache = map;
  console.log("📦 VaccineMaster cached:", Object.keys(map).length);

  return map;
}

/* =========================================================
   RETRY PUSH
========================================================= */
async function pushWithRetry(uid, payload, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    const ok = await lineService.safePush(uid, payload);
    if (ok) return true;

    const delay = 500 * Math.pow(2, i);
    await new Promise(r => setTimeout(r, delay));
  }
  return false;
}

/* =========================================================
   LOAD DATA
========================================================= */
async function getReminderRows() {
  const sheets = await getSheets();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: `${SHEET_REMINDER}!A2:L`
  });

  const rows = res.data.values || [];

  return rows.map((r, i) => ({
    rowIndex: i + 2,
    reminderId: clean(r[0]),
    cid: normalizeCID(r[2]),
    vaccineCode: clean(r[4]),
    doseNo: clean(r[5]),
    appointmentDate: r[6],
    notifyDate: normalizeDate(r[7]),
    status: clean(r[10]).toUpperCase()
  }));
}

/* =========================================================
   FILTER
========================================================= */
function getTodayReminders(rows) {
  const today = todayISO();
  return rows.filter(r =>
    r.notifyDate === today &&
    r.status === "PENDING"
  );
}

/* =========================================================
   GROUP
========================================================= */
function groupRemindersByCID(reminders) {
  const map = {};

  for (const r of reminders) {
    if (!r.cid) continue;

    if (!map[r.cid]) {
      map[r.cid] = {
        cid: r.cid,
        appointmentDate: r.appointmentDate,
        vaccines: [],
        rowIndexes: []
      };
    }

    map[r.cid].vaccines.push({
      vaccineCode: r.vaccineCode,
      doseNo: r.doseNo
    });

    map[r.cid].rowIndexes.push(r.rowIndex);
  }

  return Object.values(map);
}

/* =========================================================
   LINE UID
========================================================= */
async function getLineUIDMap() {
  const sheets = await getSheets();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: `LineUID!A1:Z`
  });

  const rows = res.data.values || [];
  if (rows.length < 2) return {};

  const header = rows[0];
  const dataRows = rows.slice(1);

  const idxCID = header.indexOf("cid");
  const idxName = header.indexOf("name");
  const idxLname = header.indexOf("lname");
  const idxUserId = header.indexOf("userId");

  const map = {};

  for (const r of dataRows) {
    const cid = normalizeCID(r[idxCID]);
    const name = `${r[idxName] || ""} ${r[idxLname] || ""}`.trim();
    const lineUid = clean(r[idxUserId]);

    if (!cid || cid.length !== 13) continue;

    map[cid] = { name, lineUid };
  }

  return map;
}

/* =========================================================
   🔒 LOCK (CRITICAL FIX)
========================================================= */
async function lockRowsSafe(rows) {
  const sheets = await getSheets();

  const updates = [];

  for (const r of rows) {
    if (r.status !== "PENDING") continue;

    updates.push({
      range: `${SHEET_REMINDER}!K${r.rowIndex}`,
      values: [["PROCESSING"]]
    });
  }

  if (!updates.length) return false;

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: process.env.SPREADSHEET_ID,
    requestBody: {
      valueInputOption: "USER_ENTERED",
      data: updates
    }
  });

  return true;
}

/* =========================================================
   MAIN (ANTI DUPLICATE 100%)
========================================================= */
async function runReminderJob() {
  console.log("🚀 REMINDER START");

  const rows = await getReminderRows();
  const reminders = getTodayReminders(rows);
  const grouped = groupRemindersByCID(reminders);

  const lineMap = await getLineUIDMap();
  const vaccineMap = await getVaccineMasterMap();

  const limit = pLimit(5);

  const tasks = grouped.map(g => limit(async () => {
    try {
      const rowsForCID = rows.filter(r => r.cid === g.cid);

      // 🔒 STEP 1: LOCK
      const locked = await lockRowsSafe(rowsForCID);
      if (!locked) {
        console.log("⏭️ SKIP (already locked):", g.cid);
        return null;
      }

      // 🔁 STEP 2: RELOAD กัน race condition
      const freshRows = await getReminderRows();

      const valid = freshRows
        .filter(r => r.cid === g.cid)
        .every(r => r.status === "PROCESSING");

      if (!valid) {
        console.log("⏭️ SKIP (race condition):", g.cid);
        return null;
      }

      const patient = lineMap[g.cid];
      if (!patient || !patient.lineUid) return null;

      // 🚀 STEP 3: SEND
      const flex = buildReminderFlex(g, patient, vaccineMap);
      const ok = await pushWithRetry(patient.lineUid, flex);

      return {
        status: ok ? "SENT" : "FAILED",
        rowIndexes: g.rowIndexes
      };

    } catch (err) {
      console.error("❌ ERROR:", err.message);
      return { status: "FAILED", rowIndexes: g.rowIndexes };
    }
  }));

  const results = await Promise.all(tasks);

  const updates = [];

  for (const r of results) {
    if (!r) continue;

    for (const idx of r.rowIndexes) {
      updates.push({
        range: `${SHEET_REMINDER}!K${idx}`,
        values: [[r.status]]
      });
    }
  }

  await batchUpdateStatusChunked(updates);

  console.log("✅ DONE");
}

/* =========================================================
   FLEX
========================================================= */
function buildReminderFlex(g, patient, vaccineMap) {
  return {
    type: "flex",
    altText: "แจ้งเตือนวัคซีน",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: "📢 แจ้งเตือนวัคซีน", weight: "bold" },
          { type: "text", text: patient.name },
          { type: "text", text: g.appointmentDate }
        ]
      }
    }
  };
}

/* =========================================================
   BATCH
========================================================= */
async function batchUpdateStatusChunked(updates, chunkSize = 100) {
  if (!updates.length) return;

  const sheets = await getSheets();

  for (let i = 0; i < updates.length; i += chunkSize) {
    const chunk = updates.slice(i, i + chunkSize);

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: process.env.SPREADSHEET_ID,
      requestBody: {
        valueInputOption: "USER_ENTERED",
        data: chunk
      }
    });

    await new Promise(r => setTimeout(r, 200));
  }
}

module.exports = {
  runReminderJob
};