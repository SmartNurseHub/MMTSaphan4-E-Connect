/*****************************************************************
 * public/js/patients.js (RE-ORGANIZED VERSION)
 * PATIENTS IMPORT — SPA SAFE VERSION
 *
 * แนวคิด:
 * - ใช้สำหรับ import ข้อมูลผู้ป่วยจากไฟล์ TXT
 * - รองรับ SPA (init ผ่าน window function)
 * - มี flow: เลือกไฟล์ → parse → preview → search → save
 *****************************************************************/

console.log("✅ patients.js loaded");


/*****************************************************************
 * MODULE: INIT (ENTRY POINT)
 * หน้าที่:
 * - เป็นจุดเริ่มต้นของ module (เรียกจาก SPA)
 * - bind DOM + event ทั้งหมด
 *****************************************************************/

window.init_patients = function () {
  console.log("🔧 init_patients START");


  /*****************************************************************
   * MODULE: DOM ELEMENTS
   * หน้าที่:
   * - เก็บ reference ของ element ต่าง ๆ ในหน้า
   *****************************************************************/

  const fileInput = document.getElementById("fileInput");
  const fileNameLabel = document.getElementById("fileName");
  const btnImport = document.getElementById("btnImport");

  const searchSection = document.getElementById("searchSection");
  const searchInput = document.getElementById("searchInput");

  const previewSection = document.getElementById("previewSection");
  const tableBody = document.getElementById("previewTableBody");
  const checkAllBox = document.getElementById("checkAll");
  const btnSave = document.getElementById("btnSaveSelected");


  /*****************************************************************
   * MODULE: DOM GUARD
   * หน้าที่:
   * - ป้องกัน error ถ้า DOM ยังไม่โหลด (SPA safe)
   *****************************************************************/

  if (!fileInput || !btnImport) {
    console.warn("⚠️ patients DOM not ready");
    return;
  }


  /*****************************************************************
   * MODULE: STATE MANAGEMENT
   * หน้าที่:
   * - เก็บข้อมูลผู้ป่วย (raw + filtered)
   *****************************************************************/

  let rawPatients = [];
  let filteredPatients = [];


  /*****************************************************************
   * MODULE: FILE SELECT
   * หน้าที่:
   * - แสดงชื่อไฟล์ที่เลือก
   *****************************************************************/

  fileInput.addEventListener("change", () => {
    fileNameLabel.textContent =
      fileInput.files[0]?.name || "ยังไม่ได้เลือกไฟล์";
  });


  /*****************************************************************
   * MODULE: IMPORT FILE
   * หน้าที่:
   * - อ่านไฟล์ TXT
   * - ส่งต่อไป parse
   *****************************************************************/

  btnImport.addEventListener("click", () => {
    const file = fileInput.files[0];

    if (!file) {
      alert("กรุณาเลือกไฟล์ TXT");
      return;
    }

    const reader = new FileReader();
    reader.onload = e => parseTXT(e.target.result);
    reader.readAsText(file, "utf-8");
  });


  /*****************************************************************
   * MODULE: PARSE TXT (HEADER BASED)
   * หน้าที่:
   * - แปลง TXT → JSON object
   * - ใช้ header เป็น key
   * - filter เฉพาะข้อมูลที่ valid
   *****************************************************************/

  function parseTxt(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim() !== "");

    if (lines.length < 2) {
      alert("ไฟล์ไม่มีข้อมูล");
      return;
    }

    // 1️⃣ อ่าน header
    const headers = lines[0].split("|").map(h => h.trim());

    // 2️⃣ map ข้อมูลแต่ละแถว
    patientsData = lines.slice(1).map(line => {
      const cols = line.split("|");
      const o = {}; // ✅ FIX: ประกาศ o ที่นี่

      headers.forEach((h, i) => {
        o[h] = (cols[i] || "").trim();
      });

      return {
        CID: o.CID,
        PRENAME: o.PRENAME,
        NAME: o.NAME,
        LNAME: o.LNAME,
        HN: o.HN,
        SEX: o.SEX,
        BIRTH: o.BIRTH,
        TELEPHONE: o.TELEPHONE,
        MOBILE: o.MOBILE,
        checked: true
      };
    }).filter(r => r.CID && r.NAME && r.LNAME);

    if (patientsData.length === 0) {
      alert("ไม่พบข้อมูลที่ถูกต้อง");
      return;
    }

    document.getElementById("searchSection").classList.remove("d-none");
    document.getElementById("previewSection").classList.remove("d-none");

    renderTable(patientsData);
  }


  /*****************************************************************
   * MODULE: RENDER TABLE
   * หน้าที่:
   * - แสดง preview ข้อมูลในตาราง
   *****************************************************************/

  function renderTable(data) {
    tableBody.innerHTML = "";

    data.forEach((p, i) => {
      tableBody.innerHTML += `
        <tr>
          <td class="text-center">
            <input type="checkbox"
                   class="row-check"
                   data-index="${i}">
          </td>
          <td>เลขประจำตัวประชาชน</td>
          <td>ชื่อ - นามสกุล</td>
        </tr>
      `;
    });

    checkAllBox.checked = false;
  }


  /*****************************************************************
   * MODULE: CHECK ALL
   * หน้าที่:
   * - เลือก/ยกเลิกเลือก checkbox ทั้งหมด
   *****************************************************************/

  checkAllBox.addEventListener("change", () => {
    document.querySelectorAll(".row-check")
      .forEach(cb => cb.checked = checkAllBox.checked);
  });


  /*****************************************************************
   * MODULE: SEARCH
   * หน้าที่:
   * - filter ข้อมูลผู้ป่วยแบบ real-time
   *****************************************************************/

  searchInput.addEventListener("input", () => {
    const keyword = searchInput.value.trim().toLowerCase();

    filteredPatients = rawPatients.filter(p =>
      (p.CID || "").toLowerCase().includes(keyword) ||
      (p.NAME || "").toLowerCase().includes(keyword) ||
      (p.LNAME || "").toLowerCase().includes(keyword)
    );

    renderTable(filteredPatients);
  });


  /*****************************************************************
   * MODULE: SAVE SELECTED
   * หน้าที่:
   * - ส่งข้อมูลที่เลือกไป backend
   *****************************************************************/

  btnSave.addEventListener("click", async () => {
    const checked = document.querySelectorAll(".row-check:checked");

    if (checked.length === 0) {
      alert("กรุณาเลือกข้อมูลอย่างน้อย 1 รายการ");
      return;
    }

    const payload = Array.from(checked).map(cb => {
      const p = filteredPatients[cb.dataset.index];
      return {
        CID: p.CID,
        PRENAME: p.PRENAME,
        NAME: p.NAME,
        LNAME: p.LNAME,
        HN: p.HN,
        SEX: p.SEX,
        BIRTH: p.BIRTH,
        TELEPHONE: p.TELEPHONE,
        MOBILE: p.MOBILE
      };
    });

    try {
      const res = await fetch("/api/patients/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const result = await res.json();

      if (!res.ok) throw new Error(result.message);

      alert(`✅ บันทึกสำเร็จ ${result.saved} รายการ`);

      resetPage();

    } catch (err) {
      console.error(err);
      alert("❌ ไม่สามารถบันทึกข้อมูล");
    }
  });


  /*****************************************************************
   * MODULE: RESET PAGE
   * หน้าที่:
   * - reset state และ UI กลับค่าเริ่มต้น
   *****************************************************************/

  function resetPage() {
    fileInput.value = "";
    fileNameLabel.textContent = "ยังไม่ได้เลือกไฟล์";
    searchInput.value = "";
    rawPatients = [];
    filteredPatients = [];
    tableBody.innerHTML = "";
    previewSection.classList.add("d-none");
    searchSection.classList.add("d-none");
  }

};