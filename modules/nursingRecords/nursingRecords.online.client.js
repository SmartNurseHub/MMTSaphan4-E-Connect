/******************************************************************
 * NURSING RECORDS ONLINE CLIENT MODULE
 * NurseStationHub (Frontend - Client/Form Layer)
 *
 * ---------------------------------------------------------------
 * หน้าที่:
 * - ควบคุม Form (Add / Edit)
 * - Fill ข้อมูลจาก Patient Search
 * - จัดการ Submit → API
 * - แปลง format (date / phone / time)
 *
 * ---------------------------------------------------------------
 * STRUCTURE:
 *
 * 1. Init
 * 2. Utilities (Normalize / Format)
 * 3. Fill Form (Search)
 * 4. Fill Edit Form
 * 5. Follow-up Handler
 * 6. Form Submit
 * 7. Export
 *
 ******************************************************************/

console.log("🟢 nursingRecords.online.client.js LOADED");


/* =========================================================
   INIT MODULE
========================================================= */

function initNursingRecordsOnline() {

  NursingOnlineActions.bindPatientSearch();
  NursingOnlineActions.bindTableActions();

  bindFormSubmit(); // ✅ สำคัญมาก

  if (EditorState.mode === "edit" && EditorState.record) {

    fillEditForm(EditorState.record);

  } else {

    NursingOnlineActions.loadNextNSR();

  }

}


/* =========================================================
   UTILITIES (FORMAT / NORMALIZE)
========================================================= */

/**
 * Normalize Phone
 */
function normalizePhone(phone) {

  if (!phone) return "";

  let s = String(phone).trim();

  if (/^\d{9}$/.test(s)) s = "0" + s;

  return s;

}


/**
 * Format Birth Date (YYYYMMDD → YYYY-MM-DD)
 */
function formatBirth(b) {

  if (!b) return "";

  b = String(b).replace(/-/g, "");

  if (b.length !== 8) return "";

  return `${b.slice(0,4)}-${b.slice(4,6)}-${b.slice(6,8)}`;

}


/**
 * Normalize Date
 */
function normalizeDate(val) {

  if (!val) return "";

  val = String(val).replace(/-/g, "");

  if (val.length !== 8) return "";

  return `${val.slice(0,4)}-${val.slice(4,6)}-${val.slice(6,8)}`;

}


/**
 * Normalize Time (HH:mm:ss → HH:mm)
 */
function normalizeTime(val) {

  if (!val) return "";

  return String(val).substring(0,5);

}


/* =========================================================
   FILL FORM FROM PATIENT SEARCH
========================================================= */

function fillNursingForm(p) {

  if (!p) return;

  const map = {

    HN: p.HN,
    CID: p.CID,
    NAME: p.NAME,
    LNAME: p.LNAME,

    TELEPHONE: normalizePhone(p.MOBILE || p.TELEPHONE),
    BIRTH: formatBirth(p.BIRTH)

  };

  Object.entries(map).forEach(([id, val]) => {

    const el = document.getElementById(id);

    if (el) el.value = val ?? "";

  });

}


/* =========================================================
   FILL EDIT FORM (MAIN)
========================================================= */

function fillEditForm(r) {

  if (!r) return;

  /* ===== BASIC ===== */
  const basicMap = {

    NSR: r.NSR,
    HN: r.HN,
    CID: r.CID,
    PRENAME: r.PRENAME,
    NAME: r.NAME,
    LNAME: r.LNAME,

    BIRTH: normalizeDate(r.BIRTH),
    TELEPHONE: r.TELEPHONE,

    DateService: normalizeDate(r.DateService),

    Activity: r.Activity,
    Objective: r.Objective,
    HealthInform: r.HealthInform,
    HealthAdvice: r.HealthAdvice,

    fileURL: r.fileURL // ✅ คงไว้

  };

  Object.entries(basicMap).forEach(([id, val]) => {

    const el = document.getElementById(id);

    if (el) el.value = val ?? "";

  });

  /* ===== FOLLOW UP ===== */
  setFollow(1, r);
  setFollow(2, r);
  setFollow(3, r);

  /* ===== STATE ===== */
  window.__NR_EDIT_MODE__ = true;
  window.__NR_EDIT_NSR__  = r.NSR;

  console.log("✏️ EDIT FORM FILLED (FULL)", r);

}


/* =========================================================
   FOLLOW-UP HANDLER
========================================================= */

function setFollow(n, r) {

  const date     = document.getElementById(`DateFollow${n}`);
  const time     = document.getElementById(`TimeFollow${n}`);
  const route    = document.getElementById(`RouteFollow${n}`);
  const provider = document.getElementById(`Provider${n}`);
  const response = document.getElementById(`Response${n}`);

  if (date)     date.value     = normalizeDate(r[`Follow${n}Date`]);
  if (time)     time.value     = normalizeTime(r[`Follow${n}Time`]);
  if (route)    route.value    = r[`Follow${n}Route`] ?? "";
  if (provider) provider.value = r[`Provider${n}`] ?? "";
  if (response) response.value = r[`Response${n}`] ?? "";

  console.log("FOLLOW RAW:", {
    Follow1Date: r.Follow1Date,
    Follow1Time: r.Follow1Time,
    Follow1Route: r.Follow1Route
  });

}


/* =========================================================
   FORM SUBMIT MODULE
========================================================= */

function bindFormSubmit() {

  const form = document.getElementById("nursingForm");

  if (!form) return;

  form.addEventListener("submit", async e => {

    e.preventDefault();

    const data = Object.fromEntries(
      new FormData(form).entries()
    );

    try {

      const isEdit = window.__NR_EDIT_MODE__;

      const method = isEdit ? "PUT" : "POST";

      const url = isEdit
        ? `/api/nursingRecords/${window.__NR_EDIT_NSR__}`
        : "/api/nursingRecords";

      const res = await fetch(url, {

        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)

      });

      if (!res.ok) throw await res.json();

      /* ===== SUCCESS ===== */

      Swal.fire({
        icon: "success",
        title: "บันทึกสำเร็จ",
        timer: 1500,
        showConfirmButton: false
      });

      form.reset();

      /* 🔥 RESET STATE */
      window.__NR_EDIT_MODE__ = false;
      window.__NR_EDIT_NSR__  = null;

      EditorState.clear();
      EditorState.mode = "new";
      EditorState.record = null;

      NursingOnlineActions.loadNextNSR();
      NursingOnlineActions.loadNursingRecords();

    } catch (err) {

      console.error(err);

      Swal.fire({
        icon: "error",
        title: "บันทึกไม่สำเร็จ",
        text: err?.error || "เกิดข้อผิดพลาด",
      });

    }

  });

}


/* =========================================================
   SAVE TEXTAREA HISTORY (LOCAL STORAGE)
========================================================= */

document
.getElementById("nursingForm")
.addEventListener("submit", function(){

  document
  .querySelectorAll("textarea[data-type]")
  .forEach(t => {

    if(t.value.trim()){
      saveNursingHistory(t.value.trim())
    }

  })

})


/* =========================================================
   EXPORT GLOBAL
========================================================= */

window.initNursingRecordsOnline = initNursingRecordsOnline;
window.fillNursingForm = fillNursingForm;

// 🔧 เพิ่มโค้ด (2026-01-29 22:05)