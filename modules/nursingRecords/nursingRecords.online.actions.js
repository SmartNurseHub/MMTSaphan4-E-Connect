/************************************************************
 * NURSING RECORDS ONLINE ACTIONS MODULE
 * NurseStationHub (Frontend - Action Layer)
 *
 * -----------------------------------------------------------
 * หน้าที่:
 * - จัดการ interaction ฝั่ง UI
 * - เชื่อม API → Table / Form / LINE
 * - ควบคุม event (click / search / send / edit)
 *
 * -----------------------------------------------------------
 * STRUCTURE:
 *
 * 1. Utilities
 * 2. Global State
 * 3. Patient Search
 * 4. Table (Load + Render)
 * 5. Table Actions (Edit / Delete / Print / Send)
 * 6. Form Support (Next NSR)
 * 7. Send Result (LINE)
 * 8. Export Module
 *
 ************************************************************/

console.log("⚙️ nursingRecords.online.actions.js LOADED");


/* =========================================================
   UTILITIES
========================================================= */

/**
 * แปลง text เป็น bullet list
 */
function formatBullet(text) {

  if (!text) return "";

  return String(text)
    .split("\n")
    .map(t => t.trim())
    .filter(Boolean)
    .map(t => "• " + t)
    .join("\n");

}


/* =========================================================
   GLOBAL EDITOR STATE
========================================================= */

window.EditorState = {

  mode: "add",
  record: null,

  setAdd() {

    this.mode = "add";
    this.record = null;

  },

  setEdit(r) {

    this.mode = "edit";
    this.record = r;

  },

  clear() {

    this.mode = "add";
    this.record = null;

  }

};


/* =========================================================
   MAIN MODULE
========================================================= */

window.NursingOnlineActions = (() => {


  /* =========================================================
     PATIENT SEARCH MODULE
  ========================================================= */

  function bindPatientSearch() {

    const input = document.getElementById("patientSearch");
    const resultBox = document.getElementById("searchResults");
    const btn = document.getElementById("btnSearchPatient");

    if (!input || !resultBox) return;

    const hideResults = () => {

      resultBox.innerHTML = "";
      resultBox.style.display = "none";

    };

    const doSearch = (keyword) => {

      if (!keyword) {

        hideResults();
        return;

      }

      PatientCore.searchPatientCore(keyword, rows => {

        PatientCore.renderPatientResults(
          resultBox,
          rows,
          patient => {

            if (window.fillNursingForm) {
              window.fillNursingForm(patient);
            }

            hideResults();

          }
        );

      });

    };

    /* search while typing */
    input.addEventListener("input", e => {

      doSearch(e.target.value.trim());

    });

    /* search button */
    if (btn) {

      btn.addEventListener("click", () => {

        doSearch(input.value.trim());

      });

    }

    input.addEventListener("blur", () => {

      setTimeout(hideResults, 200);

    });

  }


  /* =========================================================
     TABLE MODULE (LOAD + RENDER)
  ========================================================= */

  async function loadNursingRecords() {

    const tbody = document.getElementById("nursingTableBody");

    if (!tbody) return;

    tbody.innerHTML =
      `<tr><td colspan="7" class="text-center">⏳ กำลังโหลด...</td></tr>`;

    try {

      const res  = await fetch("/api/nursingRecords");
      const json = await res.json();

      const rows = Array.isArray(json)
        ? json
        : (json.data || []);

      tbody.innerHTML = "";

      if (!rows.length) {

        tbody.innerHTML =
          `<tr><td colspan="7" class="text-center text-muted">ไม่มีข้อมูล</td></tr>`;

        return;

      }

      rows.forEach(r => {

        const tr = document.createElement("tr");
        tr._record = r;

        tr.innerHTML = `
          <td>${r.NSR || ""}</td>
          <td>${r.DateService || "-"}</td>
          <td>${r.HN || "-"}</td>
          <td>${r.NAME || ""} ${r.LNAME || ""}</td>
          <td>${r.Activity || "-"}</td>
          <td>${r.Provider1 || "-"}</td>

          <td class="text-center">
            <div class="d-flex flex-wrap justify-content-center gap-1"
                 style="max-width:90px; margin:auto;">

              <button class="btn btn-warning btn-sm action-edit" style="width:40px;">✏️</button>

              <button class="btn btn-sm btn-info action-print" style="width:40px;">🖨️</button>

              <button class="btn btn-sm btn-success action-send"
                      data-nsr="${r.NSR}"
                      style="width:40px;">📲</button>

              <button class="btn btn-sm btn-danger action-delete" style="width:40px;">🗑️</button>

            </div>
          </td>
        `;

        tbody.appendChild(tr);

      });

    } catch (err) {

      console.error(err);

      tbody.innerHTML =
        `<tr><td colspan="7" class="text-center text-danger">
           โหลดข้อมูลไม่สำเร็จ
         </td></tr>`;

    }

  }


  /* =========================================================
     TABLE ACTIONS MODULE
  ========================================================= */

  function bindTableActions() {

    if (window.__nursingTableBound) return;
    window.__nursingTableBound = true;

    document.body.addEventListener("click", async e => {

      const btn = e.target.closest("button");
      if (!btn) return;

      const row = btn.closest("tr");
      if (!row || !row._record) return;

      const record = row._record;

      /* ---------- EDIT ---------- */
      if (btn.classList.contains("action-edit")) {

        EditorState.setEdit(record);
        loadSubView("online");

      }

      /* ---------- DELETE ---------- */
      if (btn.classList.contains("action-delete")) {

        deleteRecord(record.NSR);

      }

      /* ---------- PRINT ---------- */
      if (btn.classList.contains("action-print")) {

        handlePrint(record);

      }

      /* ---------- SEND LINE ---------- */
      if (btn.classList.contains("action-send")) {

        await sendReportToPatient(record.NSR, btn);

      }

    });

    console.log("🧷 Table actions bound");

  }


  /* =========================================================
     FORM SUPPORT MODULE
  ========================================================= */

  async function loadNextNSR() {

    if (EditorState.mode === "edit") return;

    const input = document.getElementById("NSR");
    if (!input) return;

    try {

      const res  = await fetch("/api/nursingRecords/next-nsr");
      const json = await res.json();

      input.value = json.nsr || "";

    } catch (err) {

      console.error("❌ loadNextNSR failed", err);

    }

  }


  /* =========================================================
     SEND RESULT MODULE (LINE OA)
  ========================================================= */

  async function sendReportToPatient(nsr, button) {

    if (!nsr) return;

    const confirmResult = await Swal.fire({
      title: "ยืนยันการส่งผล?",
      text: "ระบบจะส่งผลตรวจให้ผู้รับบริการผ่าน LINE OA",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "ส่งเลย",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#2e7d32",
      cancelButtonColor: "#6c757d",
      reverseButtons: true
    });

    if (!confirmResult.isConfirmed) return;

    try {

      button.disabled = true;
      button.innerHTML = "⏳";

      Swal.fire({
        title: "กำลังส่งผล...",
        text: "กรุณารอสักครู่",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      const res = await fetch("/api/lineOA/sendReport", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ nsr })
      });

      const data = await res.json();

      Swal.close();

      if (!data.success) {
        throw new Error(data.message || "ส่งไม่สำเร็จ");
      }

      button.innerHTML = "✅";
      button.classList.remove("btn-success");
      button.classList.add("btn-secondary");

      await Swal.fire({
        icon: "success",
        title: "ส่งผลสำเร็จ",
        text: "ผู้รับบริการได้รับผลเรียบร้อยแล้ว",
        confirmButtonColor: "#2e7d32"
      });

      console.log("✅ ส่งผลสำเร็จ:", nsr);

    } catch (err) {

      console.error("❌ Send error:", err);

      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: err.message
      });

      button.disabled = false;
      button.innerHTML = "📲";

    }

  }


  /* =========================================================
     EXPORT
  ========================================================= */

  return {
    bindPatientSearch,
    bindTableActions,
    loadNursingRecords,
    loadNextNSR
  };

})();