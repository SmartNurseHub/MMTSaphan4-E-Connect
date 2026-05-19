const { getSheets } = require("../../../../config/google");
const lineService = require("../../../lineOA/lineOA.line.service");
const pLimit = require("p-limit");

const SHEET_REMINDER = "Reminder";
const TIMEZONE = "Asia/Bangkok";

/* =========================================================
   UTILS (LOCAL ONLY - NO DEPENDENCY RISK)
========================================================= */
function normalizeCID(cid) {
  return String(cid || "").replace(/\D/g, "").padStart(13, "0");
}

function toDateStr(d) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(d));
}

function clean(v) {
  return String(v || "").trim();
}

/* =========================================================
   LOAD REMINDERS
========================================================= */
async function loadReminders() {
  const sheets = await getSheets();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: `${SHEET_REMINDER}!A2:L`
  });

  const rows = res.data.values || [];

  return rows.map((r, i) => ({
    rowIndex: i + 2,
    reminderId: clean(r[0]),
    apid: clean(r[1]),
    cid: normalizeCID(r[2]),
    vaccineCode: clean(r[4]),
    doseNo: Number(r[5] || 0),
    appointmentDate: r[6],
    notifyDate: toDateStr(r[7]),
    status: clean(r[10]).toUpperCase()
  }));
}

/* =========================================================
   FILTER TODAY
========================================================= */
function filterToday(reminders) {
  const today = toDateStr(new Date());

  return reminders.filter(r =>
    r.notifyDate === today &&
    r.status === "PENDING"
  );
}

/* =========================================================
   GROUP BY CID
========================================================= */
function groupByCID(reminders) {
  const map = {};

  for (const r of reminders) {
    if (!map[r.cid]) {
      map[r.cid] = {
        cid: r.cid,
        appointmentDate: r.appointmentDate,
        vaccines: [],
        rows: []
      };
    }

    map[r.cid].vaccines.push({
      vaccineCode: r.vaccineCode,
      doseNo: r.doseNo
    });

    map[r.cid].rows.push(r);
  }

  return Object.values(map);
}

/* =========================================================
   LOCK (SAFE ATOMIC STYLE)
========================================================= */
async function lockRows(rows) {
  const sheets = await getSheets();

  const updates = rows
    .filter(r => r.status === "PENDING")
    .map(r => ({
      range: `${SHEET_REMINDER}!K${r.rowIndex}`,
      values: [["PROCESSING"]]
    }));

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
   LINE SEND (SAFE RETRY)
========================================================= */
async function sendLine(uid, payload, retry = 2) {
  for (let i = 0; i <= retry; i++) {
    const ok = await lineService.safePush(uid, payload);
    if (ok) return true;

    await new Promise(r => setTimeout(r, 300 * (i + 1)));
  }
  return false;
}

/* =========================================================
   FLEX BUILDER (CLEAN)
========================================================= */
function buildFlex(group, patient) {
  return {
    type: "flex",
    altText: "แจ้งเตือนวัคซีน",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: "📢 แจ้งเตือนวัคซีน", weight: "bold", size: "lg" },
          { type: "text", text: patient.name || "", margin: "md" },
          { type: "text", text: group.appointmentDate || "", color: "#666666" }
        ]
      }
    }
  };
}

/* =========================================================
   UPDATE STATUS
========================================================= */
async function updateStatus(rows, status) {
  const sheets = await getSheets();

  const data = rows.map(r => ({
    range: `${SHEET_REMINDER}!K${r.rowIndex}`,
    values: [[status]]
  }));

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: process.env.SPREADSHEET_ID,
    requestBody: {
      valueInputOption: "USER_ENTERED",
      data
    }
  });
}

/* =========================================================
   MAIN ENGINE
========================================================= */
async function runReminderJob() {
  console.log("🚀 REMINDER START");

  const all = await loadReminders();
  const today = filterToday(all);
  const grouped = groupByCID(today);

  const limit = pLimit(5);

  const results = await Promise.all(
    grouped.map(group => limit(async () => {

      try {
        const locked = await lockRows(group.rows);
        if (!locked) return null;

        const sheets = await getSheets();
        const fresh = await loadReminders();

        const stillValid = fresh
          .filter(r => r.cid === group.cid)
          .every(r => r.status === "PROCESSING");

        if (!stillValid) return null;

        const lineRes = await sheets.spreadsheets.values.get({
          spreadsheetId: process.env.SPREADSHEET_ID,
          range: `LineUID!A:Z`
        });

        const rows = lineRes.data.values || [];

        const uidRow = rows.find(r => normalizeCID(r[0]) === group.cid);
        if (!uidRow) return null;

        const uid = uidRow[3];
        if (!uid) return null;

        const flex = buildFlex(group, { name: uidRow[1] });

        const ok = await sendLine(uid, flex);

        return {
          rows: group.rows,
          status: ok ? "SENT" : "FAILED"
        };

      } catch (e) {
        console.error("❌ ERROR:", e.message);
        return null;
      }
    }))
  );

  const updates = [];

  for (const r of results) {
    if (!r) continue;

    for (const row of r.rows) {
      updates.push({
        rowIndex: row.rowIndex,
        status: r.status
      });
    }
  }

  await updateStatus(updates, "DONE");

  console.log("✅ DONE");
}

module.exports = {
  runReminderJob
};