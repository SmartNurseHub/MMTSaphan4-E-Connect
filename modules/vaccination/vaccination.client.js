/*****************************************************************
 * VACCINATION MODULE (PRODUCTION STABLE)
 * NurseStationHub
 *
 * Description:
 *   Module จัดการระบบวัคซีนทั้งหมดบนหน้าเว็บ
 *   รวมถึงการค้นหาผู้ป่วย, การบันทึกวัคซีน,
 *   การแสดง Timeline, ประวัติ, นัดฉีดวัคซีน, ส่ง LINE
 *****************************************************************/

console.log("💉 Vaccination Module Loaded");

/*****************************************************************
 * GLOBAL STATE
 *****************************************************************/
const VaccineState = {
  currentCID: null,
  currentPatient: null,
  vaccineMaster: [],
  appointments: [],
  history: []
};

/*****************************************************************
 * INIT
 *****************************************************************/
window.initVaccination = async function(){
  console.log("🚀 initVaccination");
  bindTabs();
  bindPatientSearch();
  bindForm(); // ⭐ เพิ่มตรงนี้

  const dateInput = document.getElementById("recordDate");
  if(dateInput){
    dateInput.value = new Date().toISOString().split("T")[0];
  }

  await loadVaccineMaster();
  await loadNextVCN();
};

/*****************************************************************
 * UTILITIES
 *****************************************************************/

// คำนวณอายุ
function calculateAge(birth){
  if(!birth) return "-";

  // รองรับรูปแบบ 6 หลัก
  if(birth.length === 6){
    const d = birth.substring(0,2);
    const m = birth.substring(2,4);
    const y = Number(birth.substring(4,6)) + 2500 - 543;
    birth = `${y}-${m}-${d}`;
  }

  const b = new Date(birth);
  const t = new Date();
  let age = t.getFullYear() - b.getFullYear();
  if(t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())){
    age--;
  }
  return age;
}

// แสดงชื่อเต็มผู้ป่วย
function getFullName(p){
  const prename = {
    1:"ด.ช.", 2:"ด.ญ.", 3:"นาย", 4:"นาง", 5:"น.ส."
  };
  return `${prename[p.PRENAME]||""} ${p.NAME} ${p.LNAME}`;
}

// แปลงวันที่เป็นรูปแบบไทย
function formatThaiDate(date){
  if(!date) return "-";
  const months = [
    "ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.",
    "ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."
  ];
  const d = new Date(date);
  if(isNaN(d)) return date;
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear()+543;
  return `${day} ${month} ${year}`;
}

// แสดงชื่อวัคซีนจาก code
function getVaccineName(code){
  const v = VaccineState.vaccineMaster.find(v=>v.code===code);
  return v ? v.name : code;
}

// ตั้งค่า text ของ element
function setText(id,val){
  const el = document.getElementById(id);
  if(el) el.textContent = val || "-";
}

/*****************************************************************
 * TAB SYSTEM
 *****************************************************************/
function bindTabs(){
  document.querySelectorAll(".open-tab").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const tab = btn.dataset.tab;
      document.querySelectorAll(".vaccine-tab").forEach(el=>el.classList.add("d-none"));
      const target = document.getElementById(tab+"Tab");
      if(target) target.classList.remove("d-none");
    });
  });
}

/*****************************************************************
 * PATIENT SEARCH
 *****************************************************************/
function bindPatientSearch(){
  const btn = document.getElementById("searchPatientBtn");
  if(!btn) return;
  btn.addEventListener("click", openPatientModal);
}

async function openPatientModal(){
  const res = await fetch("/api/patients/list");
  const result = await res.json();
  if(!result.success) return;

  const table = document.getElementById("patientSearchTable");
  if(!table) return;
  table.innerHTML = "";

  result.data.forEach(p => {
    const tr = document.createElement("tr");
    tr.style.fontSize = "10px";
    const name = getFullName(p);

    tr.innerHTML = `
<td>${p.CID || "-"}</td>
<td>${name}</td>
<td>${p.BIRTH_THAI || formatThaiDate(p.BIRTH) || "-"}</td>
<td>${calculateAge(p.BIRTH)}</td>
<td>${p.TELEPHONE || p.MOBILE || "-"}</td>
<td>
  <button class="btn btn-success btn-sm" style="font-size:10px;padding:2px 8px;">เลือก</button>
</td>
`;
    tr.querySelector("button").addEventListener("click",()=>selectPatient(p));
    table.appendChild(tr);
  });

  new bootstrap.Modal(document.getElementById("patientSearchModal")).show();
}

/*****************************************************************
 * SELECT PATIENT
 *****************************************************************/
function selectPatient(p){
  VaccineState.currentCID = p.CID;
  VaccineState.currentPatient = p;

  const name = getFullName(p);
  const birth = p.BIRTH;
  const age = calculateAge(birth);

  setText("vaccinePatientName","👤 "+name);
  setText("vaccineCID",p.CID);
  setText("vaccineBirthDate",birth);
  setText("vaccineAge",age);
  setText("vaccinePhone",p.MOBILE);

  setText("p_cid",p.CID);
  setText("p_name",name);
  setText("p_birth",birth);
  setText("p_age",age);

  const cidInput = document.getElementById("vaccineCIDInput");
  if(cidInput) cidInput.value = p.CID;

  loadTimeline(p.CID);
  loadVaccinationTable(p.CID);
  loadLatestVaccines(p.CID);
  loadAppointments(p.CID);

  const modal = bootstrap.Modal.getInstance(document.getElementById("patientSearchModal"));
  if(modal){
    document.activeElement.blur();
    modal.hide();
  }
}

/*****************************************************************
 * LOAD VACCINE MASTER
 *****************************************************************/
async function loadVaccineMaster(){
  const res = await fetch("/api/vaccination/master");
  const result = await res.json();
  if(!result.success) return;

  VaccineState.vaccineMaster = result.data;

  const select = document.getElementById("vaccineType");
  select.innerHTML = `<option value="">-- เลือกวัคซีน --</option>`;

  result.data.forEach(v=>{
    const opt = document.createElement("option");
    opt.value = v.code;
    opt.textContent = `${v.name} (${v.code})`;
    select.appendChild(opt);
  });
}

/*****************************************************************
 * FORM HANDLER
 *****************************************************************/
function bindForm(){
  const form = document.getElementById("vaccinationForm");
  if(!form) return;
  form.addEventListener("submit",saveVaccine);
}

async function saveVaccine(e){
  e.preventDefault();

  const dateService = document.getElementById("recordDate").value;
  if(!dateService){
    alert("กรุณาเลือกวันที่ฉีดวัคซีน");
    return;
  }

  const payload = {
    cid: VaccineState.currentCID,
    vaccineCode: document.getElementById("vaccineType").value,
    doseNo: Number(document.getElementById("doseNumber").value),
    dateService: document.getElementById("recordDate").value,
    providerRole: document.getElementById("providerRole").value,
    providerName: document.getElementById("providerName").value,
    locationType: document.getElementById("locationType").value,
    locationDetail: document.getElementById("locationDetail").value,
    lotNumber: document.getElementById("lotNumber").value
  };

  const res = await fetch("/api/vaccination/add",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(payload)
  });

  const result = await res.json();
  if(!result.success){
    alert(result.error || "บันทึกไม่สำเร็จ");
    return;
  }

  alert("บันทึกสำเร็จ");
  document.getElementById("vaccinationForm").reset();

  loadTimeline(payload.cid);
  loadVaccinationTable(payload.cid);
  loadLatestVaccines(payload.cid);
  loadAppointments(payload.cid);
}

/*****************************************************************
 * TIMELINE
 *****************************************************************/
async function loadTimeline(cid){
  try{
    const res = await fetch(`/api/vaccination/timeline/${cid}`);
    const result = await res.json();
    const box = document.getElementById("vaccinationTimeline");
    if(!box) return;
    box.innerHTML = "";

    if(!result.success || !result.data || result.data.length === 0){
      box.innerHTML = `<div class="text-muted">ยังไม่มีประวัติการฉีดวัคซีน</div>`;
      return;
    }

    result.data.forEach(v => {
      const item = document.createElement("div");
      item.className = "border rounded p-2 mb-2 bg-light";

      const vaccine = getVaccineName(v.vaccineCode);
      const dose = v.doseNo ?? "-";
      const date = formatThaiDate(v.dateService);

      item.innerHTML = `
<div class="fw-bold">💉 ${vaccine}</div>
<div class="small text-muted">เข็ม ${dose}</div>
<div>วันที่ฉีด : ${date}</div>
`;
      box.appendChild(item);
    });
  } catch(err){
    console.error("Timeline error:",err);
  }
}

/*****************************************************************
 * HISTORY TABLE
 *****************************************************************/
async function loadVaccinationTable(cid){
  const res = await fetch(`/api/vaccination/history/${cid}`);
  const result = await res.json();
  if(!result.success) return;

  const table = document.getElementById("vaccinationHistoryTable");
  table.innerHTML = "";

  result.data.forEach(v=>{
    const tr = document.createElement("tr");

    tr.innerHTML = `
<td style="font-size:10px;width:15%;">${v.vcn || "-"}</td>
<td style="font-size:10px;width:10%;">${formatThaiDate(v.dateService)}</td>
<td style="font-size:10px;width:15%;">${getVaccineName(v.vaccineCode)}</td>
<td style="font-size:10px;width:5%;">${v.doseNo}</td>
<td style="font-size:10px;width:10%;">${v.lotNumber || "-"}</td>
<td style="font-size:10px;width:15%;">${v.providerName || "-"}</td>
<td style="font-size:10px;width:15%;">${v.locationDetail || "-"}</td>
<td style="width:10%;">
  <button class="btn btn-success btn-sm send-line" style="font-size:10px;padding:2px 6px;">📲</button>
  <button class="btn btn-outline-danger btn-sm delete-vaccine" data-id="${v.vcn}" style="font-size:10px;padding:2px 6px;">🗑</button>
</td>
`;

    table.appendChild(tr);

    tr.querySelector(".send-line").addEventListener("click",()=>sendLineVaccine(v.vcn));
    tr.querySelector(".delete-vaccine").addEventListener("click",()=>deleteVaccine(v.vcn));
  });
}

/*****************************************************************
 * LATEST VACCINES
 *****************************************************************/
async function loadLatestVaccines(cid){
  const res = await fetch(`/api/vaccination/latest/${cid}`);
  const result = await res.json();
  if(!result.success) return;

  const box = document.getElementById("latestVaccines");
  if(!box) return;
  box.innerHTML = "";

  result.data.forEach(v=>{
    const badge = document.createElement("span");
    badge.className = "badge bg-info me-2";
    badge.textContent = `${v.vaccineCode} เข็ม ${v.doseNo}`;
    box.appendChild(badge);
  });
}

/*****************************************************************
 * APPOINTMENTS
 *****************************************************************/
async function loadAppointments(cid){
  console.log("📡 loadAppointments CID:", cid);

  const res = await fetch(`/api/vaccination/appointments/${cid}`);
  const result = await res.json();
  console.log("📦 API RESULT:", result);

  const table = document.getElementById("appointmentTable");
  if(!table) return;
  table.innerHTML = "";

  if(!result.success || !result.data || result.data.length === 0){
    table.innerHTML = `
<tr>
  <td colspan="5" class="text-center text-muted">ไม่มีนัดวัคซีน</td>
</tr>`;
    return;
  }

  result.data.forEach((row)=>{
    const vaccine = row.vaccineCode ?? row.VaccineCode ?? row[3] ?? "-";
    const dose = row.doseNo ?? row.DoseNo ?? row[4] ?? "-";
    const date = row.appointmentDate ?? row.AppointmentDate ?? row[5] ?? "-";
    const status = row.status ?? row.Status ?? row[6] ?? "-";

    const tr = document.createElement("tr");
    tr.innerHTML = `
<td>${getVaccineName(vaccine)}</td>
<td>เข็ม ${dose}</td>
<td>${formatThaiDate(date)}</td>
<td>${statusBadge(status)}</td>
<td>
  <button style="background:#198754;color:#fff;border:none;padding:6px 16px;font-size:10px;border-radius:6px;font-weight:500;cursor:pointer;"
    onclick="fillAppointment('${row.cid}','${row.vaccineCode}','${row.doseNo}','${row.apid}')">
    ฉีดตามนัด
  </button>
</td>
`;
    table.appendChild(tr);
  });
}

function statusBadge(status){
  if(status==="PENDING") return `<span class="badge bg-warning" style="font-size:10px;">รอนัด</span>`;
  if(status==="DONE") return `<span class="badge bg-success" style="font-size:10px;">ฉีดแล้ว</span>`;
  return `<span class="badge bg-secondary" style="font-size:10px;">${status}</span>`;
}

/*****************************************************************
 * NEXT VCN
 *****************************************************************/
async function loadNextVCN(){
  const res = await fetch("/api/vaccination/next-vcn");
  const result = await res.json();
  if(!result.success) return;

  const input = document.getElementById("cn");
  if(input) input.value = result.data.vcn;
}

/*****************************************************************
 * HELPER FUNCTIONS
 *****************************************************************/
function fillAppointment(cid,vaccineCode,doseNo){
  const cidInput = document.getElementById("cid");
  const vaccineInput = document.getElementById("vaccineType");
  const doseInput = document.getElementById("doseNumber");
  const dateInput = document.getElementById("recordDate");

  if(cidInput) cidInput.value = cid;
  if(vaccineInput) vaccineInput.value = vaccineCode;
  if(doseInput) doseInput.value = doseNo;
  if(dateInput) dateInput.value = new Date().toISOString().split("T")[0];

  document.getElementById("vaccinationForm")?.scrollIntoView({behavior:"smooth"});
}

async function deleteVaccine(vcn){
  if(!confirm("ต้องการลบรายการนี้หรือไม่ ?")) return;

  try{
    const res = await fetch(`/api/vaccination/delete/${vcn}`,{method:"DELETE"});
    const result = await res.json();

    if(!result.success){
      alert(result.error || "ลบไม่สำเร็จ");
      return;
    }

    alert("ลบสำเร็จ");

    if(VaccineState.currentCID){
      loadTimeline(VaccineState.currentCID);
      loadVaccinationTable(VaccineState.currentCID);
      loadLatestVaccines(VaccineState.currentCID);
    }
  }catch(err){
    console.error(err);
    alert("เกิดข้อผิดพลาด");
  }
}

async function sendLineVaccine(vcn){
  if(!confirm("ส่งข้อมูลวัคซีนไป LINE ?")) return;

  try{
    const res = await fetch(`/api/vaccination/send-line/${vcn}`,{method:"POST"});
    const result = await res.json();

    if(!result.success){
      alert(result.error || "ส่ง LINE ไม่สำเร็จ");
      return;
    }

    alert("📲 ส่ง LINE สำเร็จ");
  }catch(err){
    console.error(err);
    alert("Server error");
  }
}