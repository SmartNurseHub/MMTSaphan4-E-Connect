/*****************************************************************
 * VACCINATION MODULE (PRODUCTION STABLE)
 * HARDENED SPA VERSION
 * NurseStationHub
 *****************************************************************/

(() => {

/*****************************************************************
 * MODULE GUARD
 *****************************************************************/
if(window.__VACCINATION_MODULE_LOADED__){
  console.warn("⚠️ vaccination.client.js already loaded");
  return;
}

window.__VACCINATION_MODULE_LOADED__ = true;

console.log("💉 Vaccination Module Loaded");

/*****************************************************************
 * GLOBAL STATE
 *****************************************************************/
window.VaccineState = window.VaccineState || {
  currentCID: null,
  currentPatient: null,
  vaccineMaster: [],
  appointments: [],
  history: []
};

const VaccineState = window.VaccineState;

/*****************************************************************
 * INIT
 *****************************************************************/
window.initVaccination = async function(){

  console.log("🚀 initVaccination");

  try{

    bindTabs();
    bindPatientSearch();
    bindForm();

    const dateInput =
      document.getElementById("recordDate");

    if(dateInput){
      dateInput.value =
        new Date().toISOString().split("T")[0];
    }

    await loadVaccineMaster();
    await loadNextVCN();
    await loadDashboard();

  }catch(err){

    console.error("❌ initVaccination:", err);

  }
};

/*****************************************************************
 * UTILITIES
 *****************************************************************/
function calculateAge(birth){

  if(!birth) return "-";

  if(birth.length === 6){

    const d = birth.substring(0,2);
    const m = birth.substring(2,4);
    const y =
      Number(birth.substring(4,6))
      + 2500 - 543;

    birth = `${y}-${m}-${d}`;
  }

  const b = new Date(birth);
  const t = new Date();

  let age =
    t.getFullYear() - b.getFullYear();

  if(
    t.getMonth() < b.getMonth() ||
    (
      t.getMonth() === b.getMonth() &&
      t.getDate() < b.getDate()
    )
  ){
    age--;
  }

  return age;
}

function getFullName(p){

  const prename = {
    1:"ด.ช.",
    2:"ด.ญ.",
    3:"นาย",
    4:"นาง",
    5:"น.ส."
  };

  return `
    ${prename[p.PRENAME]||""}
    ${p.NAME||""}
    ${p.LNAME||""}
  `.replace(/\s+/g," ").trim();
}

function formatThaiDate(date){

  if(!date) return "-";

  const months = [
    "ม.ค.","ก.พ.","มี.ค.","เม.ย.",
    "พ.ค.","มิ.ย.","ก.ค.","ส.ค.",
    "ก.ย.","ต.ค.","พ.ย.","ธ.ค."
  ];

  const d = new Date(date);

  if(isNaN(d)) return date;

  return `
    ${d.getDate()}
    ${months[d.getMonth()]}
    ${d.getFullYear()+543}
  `;
}

function getVaccineName(code){

  const v =
    VaccineState.vaccineMaster
      .find(v=>v.code===code);

  return v ? v.name : code;
}

function setText(id,val){

  const el = document.getElementById(id);

  if(el){
    el.textContent = val || "-";
  }
}

/*****************************************************************
 * TAB SYSTEM
 *****************************************************************/
function bindTabs() {

  if (window.__VACCINE_TAB_BOUND__) return;
  window.__VACCINE_TAB_BOUND__ = true;

  document.addEventListener("click", async (e) => {

    const btn = e.target.closest(".open-tab");
    if (!btn) return;

    e.preventDefault();

    const tab = btn.dataset.tab;
    if (!tab) return;

    console.log("📂 Open Tab:", tab);

    document.getElementById("VaccineDashboard")?.classList.add("d-none");
    document.getElementById("mainContainer")?.classList.remove("d-none");

    document.querySelectorAll(".vaccine-tab")
      .forEach(el => el.classList.add("d-none"));

    const patientSearchCard = document.getElementById("patientSearchCard");

    if (patientSearchCard) {
      if (
        tab === "vaccineMaster" ||
        tab === "vaccineSchedule" ||
        tab === "vaccineInventory"||
        tab === "hisImport"
      ) {
        patientSearchCard.classList.add("d-none");
      } else {
        patientSearchCard.classList.remove("d-none");
      }
    }

    const tabMap = {
  addVaccine: "addVaccineTab",
  timeline: "timelineTab",
  table: "tableTab",
  vaccineMaster: "vaccineMasterTab",
  vaccineSchedule: "vaccineScheduleTab",
  vaccineInventory: "vaccineInventoryPage",
  hisImport: "hisImportTab"
};

    const targetId = tabMap[tab];

    if (!targetId) {
      console.warn("❌ Unknown tab:", tab);
      return;
    }

    // โหลดข้อมูลก่อน (ถ้าจำเป็น)
    if (tab === "vaccineMaster") {
  await loadVaccineMasterTab();
}

if (tab === "vaccineSchedule") {
  await loadVaccineScheduleTab();
}

if (tab === "vaccineInventory") {
  VaccineState.currentCID = null;
  VaccineState.currentPatient = null;

  await loadInventoryPage();
  await loadInventoryMasterDropdown();
}

if (tab === "hisImport") {
  await loadHISImportTab();
}


    const target = document.getElementById(targetId);

    if (!target) {
      console.warn("❌ Tab element not found:", targetId);
      return;
    }

    target.classList.remove("d-none");
  });
}

/*****************************************************************
 * PATIENT SEARCH
 *****************************************************************/
function bindPatientSearch(){

  const btn =
    document.getElementById("searchPatientBtn");

  if(!btn) return;

  if(btn.dataset.bound === "true") return;

  btn.dataset.bound = "true";

  btn.addEventListener(
    "click",
    openPatientModal
  );
}

/*****************************************************************
 * FORM
 *****************************************************************/
function bindForm(){

  const form =
    document.getElementById("vaccinationForm");

  if(!form) return;

  if(form.dataset.bound === "true") return;

  form.dataset.bound = "true";

  form.addEventListener("submit",saveVaccine);
}

/*****************************************************************
 * PATIENT MODAL
 *****************************************************************/
async function openPatientModal(){

  try{

    const res =
      await fetch("/api/patients/list");

    const result = await res.json();

    if(!result.success) return;

    const table =
      document.getElementById("patientSearchTable");

    if(!table) return;

    table.innerHTML = "";

    result.data.forEach(p=>{

      const tr =
        document.createElement("tr");

      tr.style.fontSize = "10px";

      tr.innerHTML = `
        <td>${p.CID || "-"}</td>
        <td>${getFullName(p)}</td>
        <td>
          ${p.BIRTH_THAI ||
          formatThaiDate(p.BIRTH) || "-"}
        </td>
        <td>${calculateAge(p.BIRTH)}</td>
        <td>${p.TELEPHONE || p.MOBILE || "-"}</td>
        <td>
          <button
            class="btn btn-success btn-sm"
            style="font-size:10px;padding:2px 8px;"
          >
            เลือก
          </button>
        </td>
      `;

      tr.querySelector("button")
        .addEventListener(
          "click",
          ()=>selectPatient(p)
        );

      table.appendChild(tr);

    });

    new bootstrap.Modal(
      document.getElementById("patientSearchModal")
    ).show();

  }catch(err){

    console.error(err);

  }
}

/*****************************************************************
 * SELECT PATIENT
 *****************************************************************/
function selectPatient(p){

  try{

    VaccineState.currentCID = p.CID;
    VaccineState.currentPatient = p;

    const name = getFullName(p);
    const birth = p.BIRTH;
    const age = calculateAge(birth);

    setText("p_cid", p.CID);
    setText("p_name", name);

    // ✅ FIX: แปลงเป็นวันไทย
    setText("p_birth", formatThaiDate(birth));

    setText("p_age", age);

    loadTimeline(p.CID);
    loadVaccinationTable(p.CID);
    loadLatestVaccines(p.CID);
    loadAppointments(p.CID);

  }catch(err){

    console.error(err);

  }finally{

    const el =
      document.getElementById("patientSearchModal");

    const modal =
      bootstrap.Modal.getInstance(el);

    if(modal){
      modal.hide();
    }

  }
}

/*****************************************************************
 * LOAD MASTER
 *****************************************************************/
async function loadVaccineMaster(){

  try{

    const res =
      await fetch("/api/vaccination/master");

    const result = await res.json();

    if(!result.success) return;

    VaccineState.vaccineMaster = result.data;

    const select =
      document.getElementById("vaccineType");

    if(!select) return;

    select.innerHTML = `
      <option value="">
        -- เลือกวัคซีน --
      </option>
    `;

    result.data.forEach(v=>{

      const opt =
        document.createElement("option");

      opt.value = v.code;

      opt.textContent =
        `${v.name} (${v.code})`;

      select.appendChild(opt);

    });

  }catch(err){

    console.error(err);

  }
}

/*****************************************************************
 * SAVE VACCINE
 *****************************************************************/
async function saveVaccine(e){

  e.preventDefault();

  try{

    const payload = {

      cid: VaccineState.currentCID,

      vaccineCode:
        document.getElementById("vaccineType")?.value,

      doseNo: Number(
        document.getElementById("doseNumber")?.value
      ),

      dateService:
        document.getElementById("recordDate")?.value,

      providerRole:
        document.getElementById("providerRole")?.value,

      providerName:
        document.getElementById("providerName")?.value,

      locationType:
        document.getElementById("locationType")?.value,

      locationDetail:
        document.getElementById("locationDetail")?.value,

      lotNumber:
        document.getElementById("lotNumber")?.value
    };

    if(!payload.cid){
      alert("กรุณาเลือกผู้ป่วย");
      return;
    }

    const res =
      await fetch("/api/vaccination/add",{

        method:"POST",

        headers:{
          "Content-Type":"application/json"
        },

        body:JSON.stringify(payload)
      });

    const result = await res.json();

    if(!result.success){

      alert(result.error || "บันทึกไม่สำเร็จ");

      return;
    }

    alert("บันทึกสำเร็จ");

    document
      .getElementById("vaccinationForm")
      ?.reset();

    loadTimeline(payload.cid);
    loadVaccinationTable(payload.cid);
    loadLatestVaccines(payload.cid);
    loadAppointments(payload.cid);
    

  }catch(err){

    console.error(err);

    alert("เกิดข้อผิดพลาด");

  }
}

/*****************************************************************
 * DASHBOARD
 *****************************************************************/
async function loadDashboard(){

  const tbody =
    document.getElementById("dashboardTable");

  if(!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="7"
        class="text-center text-muted">
        กำลังโหลด...
      </td>
    </tr>
  `;

  try{

    const res =
      await fetch("/api/vaccination/dashboard");

    const json = await res.json();

    if(!json.ok){
      throw new Error("Dashboard Error");
    }

    const rows = json.data || [];

    if(!rows.length){

      tbody.innerHTML = `
        <tr>
          <td colspan="7"
            class="text-center text-muted">
            ไม่พบข้อมูล
          </td>
        </tr>
      `;

      return;
    }

    tbody.innerHTML = rows.map(r=>`

      <tr>
        <td>${r.CID}</td>
        <td>${r.fullname}</td>
        <td style="font-size:10px;">
          ${r.vaccines}
        </td>
        <td>${formatThaiDate(r.lastDate)}</td>
        <td>${formatThaiDate(r.nextAppt)}</td>
        <td>
          <button
            class="btn btn-sm btn-info"
            onclick="openPatientFromDashboard('${r.CID}')"
          >
            ดู
          </button>
        </td>
      </tr>

    `).join("");

  }catch(err){

    console.error(err);

    tbody.innerHTML = `
      <tr>
        <td colspan="7"
          class="text-center text-danger">
          โหลดข้อมูลล้มเหลว
        </td>
      </tr>
    `;
  }
}

/* =========================================================
   Vaccine Master Tab
========================================================= */

async function loadVaccineMasterTab(){

  const el = document.getElementById("vaccineMasterTab");
  if(!el) return;

  el.innerHTML = `

    <div class="card shadow-sm border-0">

      <div class="card-header d-flex justify-content-between align-items-center text-white"
        style="background:#006666;">

        <div>
          💉 Vaccine Master
        </div>

        <div class="d-flex gap-2">

          <button
            class="btn btn-light btn-sm"
            onclick="openAddVaccineModal()"
          >
            ➕ เพิ่มรายการวัคซีน
          </button>

          <button
            class="btn btn-warning btn-sm"
            onclick="openUploadVaccineModal()"
          >
            ⬆️ อัพโหลดรายการวัคซีน
          </button>

        </div>

      </div>

      <div class="card-body">
        
        <div class="table-responsive">

          <table class="table table-bordered align-middle table-sm">

            <thead class="table-light">
              <tr>
                <th width="20%">Code</th>
                <th width="60%">Name</th>
                <th width="20%">Status</th>
              </tr>
            </thead>

            <tbody>

              ${
                VaccineState.vaccineMaster?.length
                ? VaccineState.vaccineMaster.map(v=>`
                    <tr>
                      <td>${v.code || "-"}</td>
                      <td>${v.name || "-"}</td>
                      <td>
                        <span class="badge bg-success">
                          Active
                        </span>
                      </td>
                    </tr>
                  `).join("")
                : `
                  <tr>
                    <td colspan="3"
                      class="text-center text-muted">
                      ไม่มีข้อมูล
                    </td>
                  </tr>
                `
              }

            </tbody>

          </table>

        </div>

      </div>

    </div>

    ${renderAddVaccineModal()}
    ${renderUploadVaccineModal()}
  `;
}

/*****************************************************************
 * LOAD INVENTORY PAGE
 *****************************************************************/
async function loadInventoryPage() {

  const tbody =
    document.getElementById("inventoryTableBody");

  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="7" class="text-center text-muted">
        กำลังโหลด...
      </td>
    </tr>
  `;

  try {

    const res = await fetch("/api/vaccination/inventory");
    const result = await res.json();

    if (!result.success) {
      throw new Error(result.error || "โหลด inventory ไม่สำเร็จ");
    }

    const rows = result.data || [];

    if (!rows.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center text-muted">
            ไม่มีข้อมูล
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = rows.map(r => `
      <tr style="font-size:12px;">

        <td>${r.Code || r.code || "-"}</td>
        <td>${r.Name || r.name || "-"}</td>
        <td>${r.Quantity ?? r.qty ?? 0}</td>
        <td>${r.Lot || r.lot || "-"}</td>
        <td>${r.Exp || r.exp || "-"}</td>
        <td>${r.DateReceived || r.dateReceived || "-"}</td>

        <td>
  <button class="btn btn-sm btn-warning me-1"
          onclick="editInventory('${r.INVID}')">
    ✏️ แก้ไข
  </button>

  <button class="btn btn-sm btn-danger"
          onclick="deleteInventory('${r.INVID}')">
    🗑 ลบ
  </button>
</td>

      </tr>
    `).join("");

  } catch (err) {

    console.error(err);

    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-danger">
          โหลดข้อมูลล้มเหลว
        </td>
      </tr>
    `;
  }
}

/* =========================================================
   ADD VACCINE MODAL
========================================================= */

function renderAddVaccineModal(){

  return `

  <div class="modal fade"
    id="addVaccineModal"
    tabindex="-1">

    <div class="modal-dialog">

      <div class="modal-content border-0 shadow">

        <div class="modal-header text-white"
          style="background:#006666;">

          <h5 class="modal-title">
            ➕ เพิ่มรายการวัคซีน
          </h5>

          <button
            type="button"
            class="btn-close btn-close-white"
            data-bs-dismiss="modal">
          </button>

        </div>

        <div class="modal-body">

          <div class="mb-3">

            <label class="form-label">
              Code
            </label>

            <input
              type="text"
              class="form-control"
              id="vacCode">

          </div>

          <div class="mb-3">

            <label class="form-label">
              Name
            </label>

            <input
              type="text"
              class="form-control"
              id="vacName">

          </div>

        </div>

        <div class="modal-footer">

          <button
            class="btn btn-secondary"
            data-bs-dismiss="modal">
            ปิด
          </button>

          <button
            class="btn btn-success"
            onclick="saveVaccineMaster()">
            💾 บันทึก
          </button>

        </div>

      </div>

    </div>

  </div>
  `;
}

function openAddVaccineModal(){

  const modal =
    new bootstrap.Modal(
      document.getElementById("addVaccineModal")
    );

  modal.show();
}


/* =========================================================
   SAVE VACCINE
========================================================= */

async function saveVaccineMaster(){

  try{

    const code =
      document.getElementById("vacCode").value.trim();

    const name =
      document.getElementById("vacName").value.trim();

    if(!code || !name){

      return Swal.fire({
        icon:"warning",
        title:"กรอกข้อมูลไม่ครบ"
      });

    }

    await fetch("/api/vaccination/master",{
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        code,
        name
      })
    });

    Swal.fire({
      icon:"success",
      title:"บันทึกสำเร็จ",
      timer:1200,
      showConfirmButton:false
    });

    bootstrap.Modal
      .getInstance(
        document.getElementById("addVaccineModal")
      )
      .hide();

    await refreshVaccineUI();

  }catch(err){

    console.error(err);

    Swal.fire({
      icon:"error",
      title:"บันทึกไม่สำเร็จ"
    });

  }
}


/* =========================================================
   UPLOAD MODAL
========================================================= */

function renderUploadVaccineModal(){

  return `

  <div class="modal fade"
    id="uploadVaccineModal"
    tabindex="-1">

    <div class="modal-dialog modal-xl">

      <div class="modal-content border-0 shadow">

        <div class="modal-header bg-warning">

          <h5 class="modal-title">
            ⬆️ อัพโหลดรายการวัคซีน
          </h5>

          <button
            type="button"
            class="btn-close"
            data-bs-dismiss="modal">
          </button>

        </div>

        <div class="modal-body">

          <div class="mb-3">

            <input
              type="file"
              id="vaccineExcelFile"
              class="form-control"
              accept=".xlsx,.xls"
              onchange="readVaccineExcel(event)">

          </div>
          <div class="mb-3">

            <input
              type="text"
              id="searchUploadVaccine"
              class="form-control"
              placeholder="🔍 ค้นหา Code หรือ Name"
              onkeyup="renderUploadTable()">

          </div>

          <div class="table-responsive">

            <table class="table table-bordered table-sm">

              <thead class="table-light">

                <tr>
                  <th width="5%">
                    <input
                      type="checkbox"
                      onchange="toggleAllVaccines(this)">
                  </th>
                  <th width="20%">Code</th>
                  <th width="65%">Name</th>
                </tr>

              </thead>

              <tbody id="uploadVaccineTable">

                <tr>
                  <td colspan="3"
                    class="text-center text-muted">
                    ยังไม่มีข้อมูล
                  </td>
                </tr>

              </tbody>

            </table>

          </div>

        </div>

        <div class="modal-footer">

          <button
            class="btn btn-secondary"
            data-bs-dismiss="modal">
            ปิด
          </button>

          <button
            class="btn btn-success"
            onclick="saveSelectedVaccines()">
            💾 บันทึกที่เลือก
          </button>

        </div>

      </div>

    </div>

  </div>
  `;
}


function openUploadVaccineModal(){

  const el =
    document.getElementById(
      "uploadVaccineModal"
    );

  const modal =
    new bootstrap.Modal(el);

  el.addEventListener(
    "hidden.bs.modal",
    ()=>{

      document.activeElement?.blur();

    },
    { once:true }
  );

  modal.show();
}


/* =========================================================
   READ EXCEL
========================================================= */

let uploadVaccines = [];

async function readVaccineExcel(event){

  const file = event.target.files[0];
  if(!file) return;

  const reader = new FileReader();

  reader.onload = function(e){

    const data = new Uint8Array(e.target.result);

    const workbook =
      XLSX.read(data,{ type:"array" });

    const sheetName =
      workbook.SheetNames[0];

    const worksheet =
      workbook.Sheets[sheetName];

    const json =
      XLSX.utils.sheet_to_json(worksheet);

    uploadVaccines = json
  .map(row=>({

    code:
      String(
        row["รหัสยา"] ||
        row["Code"] ||
        ""
      ).trim(),

    name:
      String(
        row["ชื่อยา"] ||
        row["Name"] ||
        ""
      ).trim()

  }))
  .filter(v=>v.code && v.name);

    renderUploadTable();

  };

  reader.readAsArrayBuffer(file);
}


/* =========================================================
   RENDER UPLOAD TABLE
========================================================= */

function renderUploadTable(){

  const tbody =
    document.getElementById(
      "uploadVaccineTable"
    );

  const total =
    document.getElementById(
      "uploadTotal"
    );

  const keyword =
    document
      .getElementById(
        "searchUploadVaccine"
      )
      ?.value
      ?.toLowerCase()
      ?.trim() || "";

  let filtered = uploadVaccines;

  // filter
  if(keyword){

    filtered =
      uploadVaccines.filter(v=>{

        return (

          (v.code || "")
            .toLowerCase()
            .includes(keyword)

          ||

          (v.name || "")
            .toLowerCase()
            .includes(keyword)

        );

      });

  }

  // total
  if(total){

    total.innerHTML =
      `พบ ${filtered.length} รายการ`;

  }

  // no data
  if(!filtered.length){

    tbody.innerHTML = `
      <tr>
        <td colspan="3"
          class="text-center text-muted">
          ไม่พบข้อมูล
        </td>
      </tr>
    `;

    return;
  }

  // render
  tbody.innerHTML =
    filtered.map(v=>`

      <tr>

        <td class="text-center">

          <input
            type="checkbox"
            class="vac-check"
            data-code="${v.code}"
            checked>

        </td>

        <td>${v.code || "-"}</td>

        <td>${v.name || "-"}</td>

      </tr>

    `).join("");

}

/* expose global */
window.renderUploadTable = renderUploadTable;
/* =========================================================
   TOGGLE ALL
========================================================= */

function toggleAllVaccines(el){

  document
    .querySelectorAll(".vac-check")
    .forEach(c=>{

      c.checked = el.checked;

    });
}


/* =========================================================
   SAVE SELECTED
========================================================= */
async function saveSelectedVaccines(){

  try{

    const selected = [];

    document
      .querySelectorAll(".vac-check")
      .forEach(chk=>{

        if(chk.checked){

          const code = chk.dataset.code;

          const vaccine =
            uploadVaccines.find(
              v => v.code === code
            );

          if(vaccine){
            selected.push(vaccine);
          }

        }

      });

    console.log("🔥 selected =", selected);

    if(!selected.length){

      return Swal.fire({
        icon:"warning",
        title:"กรุณาเลือกรายการ"
      });

    }

    const res = await fetch(
      "/api/vaccination/master/bulk",
      {
        method:"POST",

        headers:{
          "Content-Type":"application/json"
        },

        body:JSON.stringify(selected)
      }
    );

    console.log("STATUS =", res.status);

    const result = await res.json();

    console.log("RESULT =", result);

    if(!result.success){

      throw new Error(
        result.error || "save failed"
      );

    }

    Swal.fire({
      icon:"success",
      title:"นำเข้าข้อมูลสำเร็จ",
      timer:1200,
      showConfirmButton:false
    });

    bootstrap.Modal
      .getInstance(
        document.getElementById(
          "uploadVaccineModal"
        )
      )
      ?.hide();

    uploadVaccines = [];

    await refreshVaccineUI();

  }catch(err){

    console.error("💥 SAVE ERROR:", err);

    Swal.fire({
      icon:"error",
      title: err.message || "นำเข้าไม่สำเร็จ"
    });

  }

}
/*****************************************************************
 * LOAD VACCINE SCHEDULE TAB
 *****************************************************************/
async function loadVaccineScheduleTab(){

  const el =
    document.getElementById("vaccineScheduleTab");

  if(!el) return;

  el.innerHTML = `

    <div class="card shadow-sm">

      <div class="card-header text-white"
        style="background-color:#006666;">

        📆 Vaccine Schedule

      </div>

      <div class="card-body">

        <div class="alert alert-info">
          ระบบ Vaccine Schedule พร้อมใช้งาน
        </div>

      </div>

    </div>
  `;
}

async function loadInventoryMasterDropdown() {

  console.log("🔥 load dropdown");

  const select =
    document.getElementById("invCode");

  console.log("SELECT =", select);

  if (!select) {
    console.error("❌ invCode not found");
    return;
  }

  try {

    const res =
      await fetch("/api/vaccination/inventory/master");

    console.log("STATUS =", res.status);

    const result =
      await res.json();

    console.log(result);

    if (!result.success) {
      throw new Error(result.error);
    }

    const rows = result.data || [];

    select.innerHTML =
      `<option value="">เลือกวัคซีน</option>`;

    rows.forEach(r => {

      select.innerHTML += `
        <option value="${r.code}">
          ${r.code} - ${r.name}
        </option>
      `;

    });

  } catch(err){

    console.error(err);

  }

}

/*****************************************************************
 * HIS IMPORT
 *****************************************************************/
async function loadHISImportTab(){

  const el =
    document.getElementById("hisPreview");

  if(!el) return;

  el.innerHTML = `
    <div class="alert alert-info mb-0">
      พร้อมนำเข้าไฟล์ HIS ZIP
    </div>
  `;
}

/*****************************************************************
 * UPLOAD HIS ZIP
 *****************************************************************/
window.uploadHISZip = async function(){

  try{

    const file =
      document.getElementById("hisZipFile")
      ?.files?.[0];

    if(!file){

      return Swal.fire({
        icon:"warning",
        title:"กรุณาเลือก ZIP"
      });

    }

    const formData = new FormData();

    formData.append("file", file);

    const res =
      await fetch(
        "/api/vaccination/his-import",
        {
          method:"POST",
          body:formData
        }
      );

    const result = await res.json();

    if(!result.success){

      throw new Error(
        result.error || "import failed"
      );

    }

    document.getElementById("hisPreview")
      .innerHTML = `

        <div class="alert alert-success">

          <div>
            ✅ Import สำเร็จ
          </div>

          <hr>

          <pre style="font-size:11px;">
${JSON.stringify(result.data,null,2)}
          </pre>

        </div>
      `;

    Swal.fire({
      icon:"success",
      title:"Import สำเร็จ",
      timer:1200,
      showConfirmButton:false
    });

  }catch(err){

    console.error(err);

    Swal.fire({
      icon:"error",
      title: err.message || "Import ไม่สำเร็จ"
    });

  }
};


window.editInventory = async function (id) {

  try {

    const res = await fetch(`/api/vaccination/inventory/${id}`);
    const result = await res.json();

    if (!result.success) throw new Error(result.error);

    const d = result.data;

    document.getElementById("invCode").value = d.code;
    document.getElementById("invQty").value = d.qty;
    document.getElementById("invLot").value = d.lot;
    document.getElementById("invExp").value = d.exp;
    document.getElementById("invFrom").value = d.from;
    document.getElementById("invProvider").value = d.provider;
    document.getElementById("invDateReceived").value = d.dateReceived;

    // ✅ ADD MODE STATE
    window.__INV_EDIT_MODE__ = true;
    window.__EDIT_INVID__ = id;

    const modal = new bootstrap.Modal(
      document.getElementById("vaccineInventoryModal")
    );

    modal.show();

  } catch (err) {

    console.error(err);
    Swal.fire({
      icon: "error",
      title: err.message
    });

  }
};

/*****************************************************************
 * PLACEHOLDER FUNCTIONS
 *****************************************************************/
async function loadTimeline(cid){}
async function loadVaccinationTable(cid){}
async function loadLatestVaccines(cid){}
async function loadAppointments(cid){}
async function loadNextVCN(){}

/*****************************************************************
 * GLOBAL EXPORTS
 *****************************************************************/

// tabs
window.showDashboard = showDashboard;
window.fillAppointment = fillAppointment;

// patient
window.selectPatient = selectPatient;

// vaccine master
window.openAddVaccineModal =
  openAddVaccineModal;

window.openUploadVaccineModal =
  openUploadVaccineModal;

window.saveVaccineMaster =
  saveVaccineMaster;

window.readVaccineExcel =
  readVaccineExcel;

window.toggleAllVaccines =
  toggleAllVaccines;

window.saveSelectedVaccines =
  saveSelectedVaccines;

window.renderUploadTable =
  renderUploadTable;

window.loadInventoryPage = 
loadInventoryPage;

window.uploadHISZip = async()=>{

  try{

    const file =
      document.getElementById("hisZipFile")
      ?.files?.[0];

    if(!file){

      alert("กรุณาเลือกไฟล์");

      return;
    }

    const formData =
      new FormData();

    formData.append("file",file);

    const res =
      await fetch(
        "/api/vaccination/his/upload",
        {
          method:"POST",
          body:formData
        }
      );

    const result =
      await res.json();

    console.log(result);

    if(!result.success){

      throw new Error(result.error);

    }

    renderHISPreview(result.data);

  }catch(err){

    console.error(err);

    alert(err.message);

  }

};

function renderHISPreview(rows){

  const el =
    document.getElementById("hisPreview");

  if(!el) return;

  if(!rows.length){

    el.innerHTML = `
      <div class="alert alert-warning">
        ไม่พบข้อมูลวัคซีน
      </div>
    `;

    return;
  }

  el.innerHTML = `

    <table class="table table-bordered">

      <thead>

        <tr>

          <th>#</th>

          <th>CID</th>

          <th>ชื่อ</th>

          <th>วัคซีน</th>

          <th>วันที่</th>

        </tr>

      </thead>

      <tbody>

        ${rows.map((r,i)=>`

          <tr>

            <td>
              <input
                type="checkbox"
                class="his-check"
                checked
                data-index="${i}"
              />
            </td>

            <td>${r.CID}</td>

            <td>
              ${r.NAME} ${r.LNAME}
            </td>

            <td>
              ${r.VaccineName}
            </td>

            <td>
              ${r.DateService}
            </td>

          </tr>

        `).join("")}

      </tbody>

    </table>

  `;

}
/*****************************************************************
 * HELPERS
 *****************************************************************/
function showDashboard(){

  document.getElementById("mainContainer")
    ?.classList.add("d-none");

  document.querySelectorAll(".vaccine-tab")
    .forEach(el=>el.classList.add("d-none"));

  document.getElementById("VaccineDashboard")
    ?.classList.remove("d-none");
}

function fillAppointment(
  cid,
  vaccineCode,
  doseNo
){

  const vaccineInput =
    document.getElementById("vaccineType");

  const doseInput =
    document.getElementById("doseNumber");

  const dateInput =
    document.getElementById("recordDate");

  if(vaccineInput){
    vaccineInput.value = vaccineCode;
  }

  if(doseInput){
    doseInput.value = doseNo;
  }

  if(dateInput){
    dateInput.value =
      new Date().toISOString().split("T")[0];
  }

  document
    .getElementById("vaccinationForm")
    ?.scrollIntoView({
      behavior:"smooth"
    });
}
/*****************************************************************
 * MODAL FUNCTIONS
 *****************************************************************/
window.openVaccineModal = function(){

  const modal =
    document.getElementById("vaccineModal");

  if(modal){
    modal.style.display = "block";
  }
};

window.closeVaccineModal = function(){

  const modal =
    document.getElementById("vaccineModal");

  if(modal){
    modal.style.display = "none";
  }
};

window.switchTab = function(tab){

  const manual =
    document.getElementById("manualTab");

  const excel =
    document.getElementById("excelTab");

  if(tab === "manual"){

    manual.style.display = "";
    excel.style.display = "none";

  }else{

    manual.style.display = "none";
    excel.style.display = "";

  }
};

window.saveManualVaccine = function(){

  alert("Save Vaccine");
};

window.handleExcelUpload = function(){

  alert("Preview Excel");
};

window.openInventoryModal = async function () {

  await loadInventoryMasterDropdown();

  const modal =
    new bootstrap.Modal(
      document.getElementById("vaccineInventoryModal")
    );

  modal.show();
};

window.saveInventory = async function () {

  try {

    const isEdit = window.__INV_EDIT_MODE__;

    const payload = {

      id: window.__EDIT_INVID__ || null,

      code: document.getElementById("invCode")?.value?.trim(),
      qty: Number(document.getElementById("invQty")?.value || 0),
      lot: document.getElementById("invLot")?.value?.trim(),
      exp: document.getElementById("invExp")?.value,
      from: document.getElementById("invFrom")?.value?.trim(),
      provider: document.getElementById("invProvider")?.value?.trim(),
      dateReceived: document.getElementById("invDateReceived")?.value
    };

    if (!payload.code) throw new Error("กรุณาเลือกวัคซีน");
    if (!payload.qty || payload.qty <= 0) throw new Error("กรุณากรอกจำนวน");
    if (!payload.dateReceived) throw new Error("กรุณาเลือกวันที่รับเข้า");

    // 🔥 เปลี่ยน endpoint ตาม mode
    const url = isEdit
      ? "/api/vaccination/inventory/update"
      : "/api/vaccination/inventory/create";

    const method = "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await res.json();

    if (!result.success) throw new Error(result.error || "save failed");

    Swal.fire({
      icon: "success",
      title: isEdit ? "แก้ไขสำเร็จ" : "บันทึกสำเร็จ",
      timer: 1200,
      showConfirmButton: false
    });

    bootstrap.Modal
      .getInstance(document.getElementById("vaccineInventoryModal"))
      ?.hide();

    // 🔥 reset state
    window.__INV_EDIT_MODE__ = false;
    window.__EDIT_INVID__ = null;

    await loadInventoryPage();
    await loadDashboard();

  } catch (err) {

    console.error(err);

    Swal.fire({
      icon: "error",
      title: err.message
    });

  }
};

})();