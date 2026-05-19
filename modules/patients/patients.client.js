/************************************************************
 * MODULE      : Patients Client (FINAL CLEAN)
 * PURPOSE     : Import, search, render, save, and manual entry
 * SCOPE       : Frontend (SPA)
 * FEATURES    :
 *  - รองรับไฟล์ TXT ขนาดใหญ่ 30,000+ rows
 *  - Preview / Search / Filter / Select / Batch Save
 *  - Manual Entry Mode
 *  - เลือก checkbox → Fill Form อัตโนมัติ
 ************************************************************/

console.log("🧑‍⚕️ patients.client.js LOADED (FINAL CLEAN)");

// =========================================================
// STATE
// =========================================================
window.PatientsImportState = window.PatientsImportState || {
  allRows: [],
  filteredRows: [],
  selectedCID: new Set(),
  patientMap: {},        // ✅ เพิ่มตรงนี้
  MAX_RENDER: 500
};

const PRENAME_MAP = {
  "1": "เด็กชาย",
  "2": "เด็กหญิง",
  "3": "นาย",
  "4": "นางสาว",
  "5": "นาง",

  "001": "เด็กชาย",
  "002": "เด็กหญิง",
  "003": "นาย",
  "004": "นางสาว",
  "005": "นาง",

  "ด.ช.": "เด็กชาย",
  "ด.ญ.": "เด็กหญิง",
  "นาย": "นาย",
  "น.ส.": "นางสาว",
  "นาง": "นาง"
};

function mapPrename(code) {
  if (!code) return "";
  return PRENAME_MAP[code.trim()] || code;
}


// =========================================================
// INIT FUNCTION
// =========================================================
function initPatients() {
  console.log("🧑‍⚕️ initPatients FINAL CLEAN");

  bindFileInput();
  bindSearch();
  bindSave();
  bindModeSwitch();
  bindManualSave();
  bindTableEvents();   // ✅ ต้องมี
  loadPatientsSelect();
}
// =========================================================
// FILE INPUT (TXT IMPORT)
// =========================================================
function bindFileInput() {
  const fileInput = document.getElementById("patientsTxtFile");
  if (!fileInput) return;

  fileInput.onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;

    const text = await file.text();
    window.PatientsImportState.allRows = parsePatientsTxt(text);
    window.PatientsImportState.filteredRows = [...window.PatientsImportState.allRows];

    showPatientsPreview();
    renderPatientsTable();
    updateCounter();
  };
}


function bindTableEvents() {
  const tbody = document.getElementById("patientsImportBody");
  if (!tbody) return;

  // ✅ กัน bind ซ้ำ
  if (tbody.dataset.bound === "true") return;
  tbody.dataset.bound = "true";

  tbody.addEventListener("click", (e) => {
  const checkbox = e.target.closest(".patient-checkbox");
  if (!checkbox) return;

  e.preventDefault(); // กัน native toggle

  const cid = checkbox.dataset.cid;
  togglePatientSelect(cid);
});
}

// =========================================================
// PARSE TXT FILE
// Format: hospcode|cid|... (Hospital Export)
// =========================================================
function parsePatientsTxt(text) {
  let lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l);
  if (!lines.length) return [];

  if (lines[0].toLowerCase().startsWith("hospcode|cid")) lines = lines.slice(1);

  const state = window.PatientsImportState;
  state.patientMap = {}; // ✅ reset ทุกครั้ง

  return lines.map(line => {
    const c = line.split("|");
    const tel = c[30]?.trim();
    const mobile = c[31]?.trim();
    const birth = c[9]?.trim();
    const sex = c[8]?.trim();
    const hn = c[7]?.trim();
    const obj = {
      CID: c[1]?.trim(),
      HN: hn || "",
      PRENAME: c[4]?.trim() || "",
      NAME: c[5]?.trim() || "",
      LNAME: c[6]?.trim() || "",
      SEX: sex || "",
      BIRTH: birth || "",
      BIRTH_THAI: birth ? formatThaiDateLong(birth) : "",
      TELEPHONE: tel || "",
      MOBILE: mobile || ""
    };

    // ✅ เก็บลง map
    if (obj.CID && /^\d{13}$/.test(obj.CID)) {
      state.patientMap[obj.CID] = obj;
      return obj;
    }

    return null;
  }).filter(Boolean);
}

// =========================================================
// SEARCH MODULE
// =========================================================
function bindSearch() {
  const input = document.getElementById("patientsSearch");
  if (!input) return;

  let timer;
input.oninput = () => {
  clearTimeout(timer);

  timer = setTimeout(() => {
    const q = input.value.trim().toLowerCase();

    window.PatientsImportState.filteredRows = !q
      ? [...window.PatientsImportState.allRows]
      : window.PatientsImportState.allRows.filter(r =>
          r.CID.includes(q) ||
          r.NAME.toLowerCase().includes(q) ||
          r.LNAME.toLowerCase().includes(q)
        );

    renderPatientsTable();
    updateCounter();
  }, 200);
};
}

// =========================================================
// FORMAT DATE (THAI LONG)
// =========================================================
function formatThaiDateLong(yyyymmdd) {
  if (!yyyymmdd || yyyymmdd.length !== 8) return "";
  const year = parseInt(yyyymmdd.slice(0,4),10)+543;
  const monthIndex = parseInt(yyyymmdd.slice(4,6),10)-1;
  const day = parseInt(yyyymmdd.slice(6,8),10);
  const thaiMonths = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
  return `${day} ${thaiMonths[monthIndex]} ${year}`;
}

// =========================================================
// RENDER PATIENT TABLE
// =========================================================
function renderPatientsTable() {
  const tbody = document.getElementById("patientsImportBody");
  if (!tbody) return;

  const rows = window.PatientsImportState.filteredRows.slice(0, window.PatientsImportState.MAX_RENDER);
  const state = window.PatientsImportState;

  tbody.innerHTML = rows.map(r => {
    const checked = state.selectedCID.has(r.CID) ? "checked" : "";
    return `
      <tr>
        <td class="text-center">
          <input type="checkbox" data-cid="${r.CID}" class="patient-checkbox" ${checked}>
        </td>
        <td>${r.CID}</td>
        <td>${r.NAME} ${r.LNAME}</td>
        <td>${r.BIRTH_THAI}</td>
        <td>${r.MOBILE || r.TELEPHONE}</td>
      </tr>
    `;
  }).join("");
}

// =========================================================
// TOGGLE PATIENT SELECTION
// =========================================================
let isSelecting = false;
function togglePatientSelect(cid) {
  if (isSelecting) return;
  isSelecting = true;

  try {
    const state = window.PatientsImportState;

    // set selection
    state.selectedCID.clear();
    state.selectedCID.add(cid);

    const patient = state.patientMap[cid];
    if (!patient) {
      console.warn("Patient not found:", cid);
      return;
    }

    // 1. render checkbox ก่อน
    renderPatientsTable();
    updateCounter();

    // 2. fill form (sync ไปเลย)
    clearPatientForm();
    fillPatientForm(patient);

    document.getElementById("manualSection")
      ?.scrollIntoView({ behavior: "smooth" });

  } finally {
    isSelecting = false;
  }
}
// =========================================================
// CLEAR FORM
// =========================================================
function clearPatientForm() {
  document.querySelectorAll("#manualSection input").forEach(i => i.value = "");
  document.querySelectorAll("input[name='manualSex']").forEach(r => r.checked = false);
}

// =========================================================
// FILL FORM
// =========================================================
function fillPatientForm(patient) {
  if (!patient) return;

  const setValue = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.value = value || "";
  };

  setValue("manualCid", patient.CID);
  setValue("manualHN", patient.HN);
  setValue("manualPrename", patient.PRENAME);
  setValue("manualName", patient.NAME);
  setValue("manualSurname", patient.LNAME);
  setValue("manualBirth", patient.BIRTH ? `${patient.BIRTH.slice(0,4)}-${patient.BIRTH.slice(4,6)}-${patient.BIRTH.slice(6,8)}` : "");
  setValue("manualTelephone", patient.TELEPHONE);
  setValue("manualMobile", patient.MOBILE);

  if (patient.SEX) {
    document.querySelectorAll("input[name='manualSex']").forEach(r => {
      r.checked = (r.value === patient.SEX);
    });
  }

  document.getElementById("btnModeManual")?.click(); // เปิดโหมด manual
}

// =========================================================
// UPDATE COUNTER
// =========================================================
function updateCounter() {
  const el = document.getElementById("patientsImportCounter");
  if (!el) return;
  const state = window.PatientsImportState;
  el.innerText = `แสดง ${Math.min(state.filteredRows.length, state.MAX_RENDER)} / ${state.filteredRows.length} | เลือก ${state.selectedCID.size}`;
}

// =========================================================
// SAVE BATCH
// =========================================================
function bindSave() {
  const btn = document.getElementById("btnSavePatients");
  if (!btn) return;

  btn.onclick = async () => {
    const state = window.PatientsImportState;
    if (!state.selectedCID.size) return Swal.fire("ยังไม่ได้เลือกข้อมูล");

    const payload = [...state.selectedCID].map(cid => {
  const p = state.patientMap[cid];

  return {
    CID: p.CID || "",
    PRENAME: p.PRENAME || "",
    NAME: p.NAME || "",
    LNAME: p.LNAME || "",
    HN: p.HN || "",
    SEX: p.SEX || "",
    BIRTH: p.BIRTH || "",
    BIRTH_THAI: p.BIRTH_THAI || "",
    TELEPHONE: p.TELEPHONE || "",
    MOBILE: p.MOBILE || ""
  };
});

    const confirm = await Swal.fire({
  icon: "question",
  title: "ยืนยันการบันทึก",
  html: `ต้องการบันทึกข้อมูล <b>${payload.length}</b> รายการ ใช่หรือไม่ ?`,
  showCancelButton: true,
  confirmButtonText: "บันทึก",
  cancelButtonText: "ยกเลิก"
});

if (!confirm.isConfirmed) return;

    Swal.fire({ title:"กำลังบันทึก...", allowOutsideClick:false, didOpen:()=>Swal.showLoading() });

    try {
      const res = await fetch("/api/patients/import", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(await res.text() || "บันทึกไม่สำเร็จ");

      Swal.fire({ icon:"success", title:"บันทึกสำเร็จ", timer:2000, showConfirmButton:false });
      state.selectedCID.clear();
      renderPatientsTable();
      updateCounter();
    } catch(err) {
      console.error(err);
      Swal.fire({ icon:"error", title:"บันทึกไม่สำเร็จ", text:err.message });
    }
  };
}

// =========================================================
// MANUAL ENTRY SAVE
// =========================================================
function bindManualSave() {
  const btn = document.getElementById("btnAddManual");
  if (!btn) return;

  btn.onclick = async () => {
    const CID = document.getElementById("manualCid")?.value.trim();
    const HN = document.getElementById("manualHN")?.value.trim();
    const PRENAME = document.getElementById("manualPrename")?.value || "";
    const NAME = document.getElementById("manualName")?.value.trim();
    const LNAME = document.getElementById("manualSurname")?.value.trim();
    const SEX = document.querySelector("input[name='manualSex']:checked")?.value || "";
    const BIRTH = document.getElementById("manualBirth")?.value;
    const TELEPHONE = document.getElementById("manualTelephone")?.value.trim();
    const MOBILE = document.getElementById("manualMobile")?.value.trim();

    if (!CID || CID.length!==13) return Swal.fire("กรุณากรอกเลขบัตร 13 หลัก");
    if (!NAME || !LNAME) return Swal.fire("กรุณากรอกชื่อและนามสกุล");

    const payload = [{
  CID: CID || "",
  PRENAME: PRENAME || "",
  NAME: NAME || "",
  LNAME: LNAME || "",
  HN: HN || "",
  SEX: SEX || "",
  BIRTH: BIRTH ? BIRTH.replace(/-/g,"") : "",
  BIRTH_THAI: BIRTH ? formatThaiDateLong(BIRTH.replace(/-/g,"")) : "",
  TELEPHONE: TELEPHONE || "",
  MOBILE: MOBILE || ""
}];

    try {
      Swal.fire({title:"กำลังบันทึก...", allowOutsideClick:false, didOpen:()=>Swal.showLoading()});
      const res = await fetch("/api/patients/import", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload) });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);

      Swal.fire({ icon:"success", title:"บันทึกสำเร็จ", timer:1500, showConfirmButton:false });

      document.querySelectorAll("#manualSection input").forEach(i=>i.value="");
      document.querySelectorAll("input[name='manualSex']").forEach(r=>r.checked=false);
    } catch(err) {
      console.error(err);
      Swal.fire("บันทึกไม่สำเร็จ");
    }
  };
}

// =========================================================
// MODE SWITCH (UPLOAD / MANUAL)
// =========================================================
function bindModeSwitch() {
  const btnUpload = document.getElementById("btnModeUpload");
  const btnManual = document.getElementById("btnModeManual");
  const uploadSection = document.getElementById("uploadSection");
  const manualSection = document.getElementById("manualSection");
  if (!btnUpload || !btnManual) return;

  btnUpload.onclick = () => { uploadSection?.classList.remove("d-none"); manualSection?.classList.add("d-none"); };
  btnManual.onclick = () => { uploadSection?.classList.add("d-none"); manualSection?.classList.remove("d-none"); };
}

// =========================================================
// LOAD PATIENT DROPDOWN
// =========================================================
async function loadPatientsSelect() {
  const res = await fetch("/api/patients/list");   // ✅ ถูกต้อง
  const json = await res.json();
  if (!json.success) return;

  const select = document.getElementById("patientSelect");
  if (!select) return;
  select.innerHTML = '<option value="">-- เลือกผู้ป่วย --</option>';
  json.data.forEach(p => {
    select.innerHTML += `<option value="${p.CID}">${p.CID} - ${p.fullName}</option>`;
  });
}

// =========================================================
// SHOW PREVIEW
// =========================================================
function showPatientsPreview() {
  document.getElementById("searchSection")?.classList.remove("d-none");
  document.getElementById("previewSection")?.classList.remove("d-none");
}

// =========================================================
// EXPORT
// =========================================================
window.initPatients = initPatients;
window.togglePatientSelect = togglePatientSelect;