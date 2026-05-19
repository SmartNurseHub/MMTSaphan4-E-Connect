/*****************************************************************
 * VACCINATION HIS IMPORT MODULE (FIXED)
 *****************************************************************/

/***************************************************************
 * GLOBAL STATE (IMPORTANT FIX)
 ***************************************************************/
window.VaccineState = window.VaccineState || {
  currentCID: null,
  selectedInventory: null,
  inventoryMap: {}   // 👈 เพิ่ม
};


/***************************************************************
 * TAB INITIALIZER
 ***************************************************************/
async function loadHISImportTab() {

  const preview =
    document.getElementById("hisPreview");

  if (!preview) return;

  preview.innerHTML = `
    <div class="alert alert-info mb-0">
      พร้อม Import ข้อมูล HIS
    </div>
  `;
}


/***************************************************************
 * UPLOAD ZIP
 ***************************************************************/
async function uploadHISZip() {

  try {

    const file =
      document.getElementById("hisZipFile")
        ?.files?.[0];

    if (!file) {

      Swal.fire({
        icon: "warning",
        title: "กรุณาเลือกไฟล์ ZIP"
      });

      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(
      "/api/vaccination/his-import",
      {
        method: "POST",
        body: formData
      }
    );

    const result = await res.json();

    if (!result.success) {
      throw new Error(result.error || "Import failed");
    }

    renderHISPreview(result.data || []);

    Swal.fire({
      icon: "success",
      title: "Import สำเร็จ",
      timer: 1200,
      showConfirmButton: false
    });

  } catch (err) {

    console.error("❌ uploadHISZip:", err);

    Swal.fire({
      icon: "error",
      title: err.message || "Import ไม่สำเร็จ"
    });

  }
}


/***************************************************************
 * RENDER PREVIEW
 ***************************************************************/
function renderHISPreview(rows) {

  const el = document.getElementById("hisPreview");
  if (!el) return;

  if (!rows.length) {

    el.innerHTML = `
      <div class="alert alert-warning mb-0">
        ไม่พบข้อมูลวัคซีน
      </div>
    `;
    return;
  }

  el.innerHTML = `
    <div class="table-responsive">
      <table class="table table-bordered table-sm align-middle" style="font-size:12px;">
        <thead class="table-light">
          <tr>
            <th>#</th>
            <th>CID</th>
            <th>ชื่อ</th>
            <th>วัคซีน</th>
            <th>วันที่</th>
          </tr>
        </thead>

        <tbody>
          ${rows.map((r, i) => `
            <tr>
              <td class="text-center">
                <input type="checkbox" checked data-index="${i}" />
              </td>
              <td>${r.CID || "-"}</td>
              <td>${r.NAME || ""} ${r.LNAME || ""}</td>
              <td>${r.VaccineName || "-"}</td>
              <td>${r.DateService || "-"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function getSelectedInventoryOption() {
  const el = document.getElementById("vaccineType");
  return el?.selectedOptions?.[0] || null;
}
/***************************************************************
 * FIX: SAVE VACCINATION (CORE FIX)
 ***************************************************************/
window.saveVaccination = async function (e) {
  e.preventDefault();

  try {

    const vaccineEl = document.getElementById("vaccineType");
    const invid = String(vaccineEl?.value || "").trim();

    const inv = window.VaccineState.inventoryMap[invid];

    if (!inv) {
      console.log("MAP STATE:", window.VaccineState.inventoryMap);
      console.log("SELECT VALUE:", invid);
      throw new Error("Inventory not synced");
    }

    console.log("INV DATA =", inv);

    // =========================
    // ✅ BUILD PAYLOAD (FIX HERE)
    // =========================
    const payload = {
      cid: VaccineState.currentCID,

      vaccineCode: inv.Code || inv.code,
      refInvid: inv.INVID || invid,

      doseNo: Number(document.getElementById("doseNumber")?.value || 0),
      dateService: document.getElementById("recordDate")?.value || "",

      providerRole: document.getElementById("providerRole")?.value || "",
      providerName: document.getElementById("providerName")?.value || "",

      locationType: document.getElementById("locationType")?.value || "",
      locationDetail: document.getElementById("locationDetail")?.value || "",

      lotNumber: inv.lot || ""
    };

    console.log("📦 PAYLOAD =", payload);

    const res = await fetch("/api/vaccination/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await res.json();

    if (!result.success) {
      throw new Error(result.error || "save failed");
    }

    Swal.fire({
      icon: "success",
      title: "บันทึกสำเร็จ",
      timer: 1200,
      showConfirmButton: false
    });

  } catch (err) {
    console.error("saveVaccination:", err);

    Swal.fire({
      icon: "error",
      title: err.message || "บันทึกไม่สำเร็จ"
    });
  }
};
/***************************************************************
 * INVENTORY BINDING (FIX สำคัญที่สุด)
 ***************************************************************/
function bindVaccineInventoryDropdown() {

  const select = document.getElementById("vaccineType");
  if (!select) return;

  select.onchange = () => {

    const id = select.value;
    const option = select.selectedOptions?.[0];

    if (!id || !option) return;

    VaccineState.selectedInventory = {
      INVID: id,
      CODE: option.dataset.code || "",
      LOTNUMBER: option.dataset.lot || "",
      EXP: option.dataset.exp || ""
    };
  };
}

/***************************************************************
 * EXPORTS
 ***************************************************************/
window.uploadHISZip = uploadHISZip;
window.renderHISPreview = renderHISPreview;
window.loadHISImportTab = loadHISImportTab;