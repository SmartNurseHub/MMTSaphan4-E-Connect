/*****************************************************************
 * PATIENT CORE CLIENT MODULE (MERGED FINAL)
 * NurseStationHub SPA
 *
 * หน้าที่:
 * - ควบคุม patient search และ fill form
 * - รองรับ generic + module-specific
 * - ใช้ได้กับทุก module frontend
 *****************************************************************/

console.log("🧠 PatientCore LOADED");

/* =========================================================
   HELPER: AGE CALC
========================================================= */
function calcAge(birth) {
  if (!birth) return "";
  const dob = new Date(birth);
  const diff = Date.now() - dob.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

/* =========================================================
   SEARCH PATIENT
   - keyword: string
   - callback: function(resultArray)
   - รองรับ response เป็น array หรือ { data: [] }
========================================================= */
async function searchPatientCore(keyword, callback) {
  if (!keyword || keyword.length < 1) {
    callback([]);
    return;
  }

  try {
    const res = await fetch("/api/patients/search?q=" + encodeURIComponent(keyword));
    const json = await res.json();

    const result = Array.isArray(json)
      ? json
      : Array.isArray(json.data)
        ? json.data
        : [];

    console.log("🧪 RESULT FROM PatientCore:", result);
    callback(result);

  } catch (err) {
    console.error("❌ Patient search failed", err);
    callback([]);
  }
}

/* =========================================================
   RENDER SEARCH RESULT LIST
   - container: DOM element
   - data: array ของ patient
   - onSelect: callback เมื่อเลือก patient
========================================================= */
function renderPatientResults(container, data, onSelect) {
  if (!container) return;

  container.innerHTML = "";
  container.style.display = "block";

  if (!Array.isArray(data) || data.length === 0) {
    container.innerHTML =
      `<div class="list-group-item small text-muted">ไม่พบข้อมูล</div>`;
    return;
  }

  data.forEach(p => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "list-group-item list-group-item-action small";
    item.textContent = `${p.HN || p.CID} : ${p.NAME} ${p.LNAME}`;
    item.onclick = () => onSelect(p);
    container.appendChild(item);
  });
}

/* =========================================================
   GENERIC FORM FILL
   - เติมค่า patient ลง form fields ทั่วไป
========================================================= */
function fillPatientToForms(patient) {
  if (!patient) return;

  const map = {
    patient_name: `${patient.NAME ?? ""} ${patient.LNAME ?? ""}`.trim(),
    patient_id: patient.HN || patient.CID || "",
    age: patient.AGE ?? calcAge(patient.BIRTH),
    gender: patient.SEX === "1" || patient.SEX === 1 ? "ชาย" : "หญิง",
    visit_date: new Date().toISOString().slice(0, 10)
  };

  document.querySelectorAll("form").forEach(form => {
    Object.entries(map).forEach(([name, value]) => {
      const el = form.querySelector(`[name="${name}"]`);
      if (el) el.value = value;
    });
  });
}

/* =========================================================
   MODULE-SPECIFIC FORM FILL
   - ตัวอย่าง: Nursing Counselor
========================================================= */
function fillToNursingCounselor(patient) {
  if (!patient) return;

  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el && val !== undefined && val !== null) el.value = val;
  };

  set("patient_name", `${patient.NAME ?? ""} ${patient.LNAME ?? ""}`.trim());
  set("nc_patient_id", patient.CID || patient.HN || "");

  if (patient.SEX === "1" || patient.SEX === 1) set("nc_gender", "ชาย");
  else if (patient.SEX === "2" || patient.SEX === 2) set("nc_gender", "หญิง");

  if (patient.BIRTH) {
    const birth = new Date(patient.BIRTH);
    if (!isNaN(birth)) set("nc_age", new Date().getFullYear() - birth.getFullYear());
  }

  set("nc_visit_date", new Date().toISOString().slice(0, 10));
}

/* =========================================================
   EXPORT TO GLOBAL
========================================================= */
window.PatientCore = {
  searchPatientCore,
  renderPatientResults,
  fillPatientToForms,
  fillToNursingCounselor
};