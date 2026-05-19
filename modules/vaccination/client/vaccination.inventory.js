/*****************************************************************
 * VACCINATION INVENTORY MODULE
 *****************************************************************/


/*****************************************************************
 * GLOBAL STATE
 *****************************************************************/

window.__INV_EDIT_MODE__ =
  window.__INV_EDIT_MODE__ || false;

window.__EDIT_INVID__ =
  window.__EDIT_INVID__ || null;

window.__INVENTORY_CACHE__ = [];

let __AUTO_FILL_BOUND__ = false;


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

    const res =
      await fetch("/api/vaccination/inventory");

    const result =
      await res.json();

    if (!result.success) {
      throw new Error(
        result.error || "โหลด inventory ไม่สำเร็จ"
      );
    }

    const rows =
      result.data || [];

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

    tbody.innerHTML =
      rows.map(r => `
        <tr style="font-size:12px;">

          <td>${r.Code || r.code || "-"}</td>
          <td>${r.Name || r.name || "-"}</td>
          <td>${r.Quantity ?? r.qty ?? 0}</td>
          <td>${r.Lot || r.lot || "-"}</td>
          <td>${r.Exp || r.exp || "-"}</td>
          <td>${r.DateReceived || r.dateReceived || "-"}</td>

          <td>
            <button
              class="btn btn-sm btn-warning me-1"
              onclick="editInventory('${r.INVID}')">
              ✏️
            </button>

            <button
              class="btn btn-sm btn-danger"
              onclick="deleteInventory('${r.INVID}')">
              🗑
            </button>
          </td>

        </tr>
      `).join("");

  } catch (err) {

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


/*****************************************************************
 * LOAD INVENTORY MASTER DROPDOWN
 *****************************************************************/

async function loadInventoryMasterDropdown() {

  const select =
    document.getElementById("invCode");

  if (!select) return;

  try {

    const res =
      await fetch(
        "/api/vaccination/inventory/master"
      );

    const result =
      await res.json();

    if (!result.success) {

      throw new Error(
        result.error || "Load master failed"
      );
    }

    const rows =
      result.data || [];

    select.innerHTML = `
      <option value="">
        เลือกวัคซีน
      </option>
    `;

    rows.forEach(r => {

      select.innerHTML += `
        <option value="${r.code}">
          ${r.code} - ${r.name}
        </option>
      `;
    });

  } catch (err) {

    console.error(
      "❌ loadInventoryMasterDropdown:",
      err
    );
  }
}


/*****************************************************************
 * OPEN INVENTORY MODAL
 *****************************************************************/

async function openInventoryModal() {

  try {

    window.__INV_EDIT_MODE__ = false;
    window.__EDIT_INVID__ = null;

    await loadInventoryMasterDropdown();

    const modal =
      new bootstrap.Modal(
        document.getElementById(
          "vaccineInventoryModal"
        )
      );

    modal.show();

  } catch (err) {

    console.error(
      "❌ openInventoryModal:",
      err
    );
  }
}


/*****************************************************************
 * SAVE INVENTORY
 *****************************************************************/

async function saveInventory() {

  try {

    const isEdit =
      window.__INV_EDIT_MODE__;

    const payload = {

      id:
        window.__EDIT_INVID__ || null,

      code:
        document.getElementById("invCode")
        ?.value?.trim(),

      qty:
        Number(
          document.getElementById("invQty")
          ?.value || 0
        ),

      lot:
        document.getElementById("invLot")
        ?.value?.trim(),

      exp:
        document.getElementById("invExp")
        ?.value,

      from:
        document.getElementById("invFrom")
        ?.value?.trim(),

      provider:
        document.getElementById("invProvider")
        ?.value?.trim(),

      dateReceived:
        document.getElementById("invDateReceived")
        ?.value
    };


    /*************************************************************
     * VALIDATION
     *************************************************************/

    if (!payload.code) {
      throw new Error("กรุณาเลือกวัคซีน");
    }

    if (!payload.qty || payload.qty <= 0) {
      throw new Error("กรุณากรอกจำนวน");
    }

    if (!payload.dateReceived) {
      throw new Error("กรุณาเลือกวันที่รับเข้า");
    }


    /*************************************************************
     * SELECT ENDPOINT
     *************************************************************/

    const url =
      isEdit
        ? "/api/vaccination/inventory/update"
        : "/api/vaccination/inventory/create";


    /*************************************************************
     * API REQUEST
     *************************************************************/

    const res =
      await fetch(url, {

        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body:
          JSON.stringify(payload)
      });

    const result =
      await res.json();

    if (!result.success) {

      throw new Error(
        result.error || "Save failed"
      );
    }


    /*************************************************************
     * SUCCESS ALERT
     *************************************************************/

    Swal.fire({
      icon: "success",
      title:
        isEdit
          ? "แก้ไขสำเร็จ"
          : "บันทึกสำเร็จ",
      timer: 1200,
      showConfirmButton: false
    });


    /*************************************************************
     * CLOSE MODAL
     *************************************************************/

    bootstrap.Modal
      .getInstance(
        document.getElementById(
          "vaccineInventoryModal"
        )
      )
      ?.hide();


    /*************************************************************
     * RESET STATE
     *************************************************************/

    window.__INV_EDIT_MODE__ = false;
    window.__EDIT_INVID__ = null;


    /*************************************************************
     * RELOAD UI
     *************************************************************/

    await loadInventoryPage();

    if (typeof loadDashboard === "function") {
      await loadDashboard();
    }

  } catch (err) {

    console.error(
      "❌ saveInventory:",
      err
    );

    Swal.fire({
      icon: "error",
      title:
        err.message || "บันทึกไม่สำเร็จ"
    });
  }
}


/*****************************************************************
 * EDIT INVENTORY
 *****************************************************************/

async function editInventory(id) {

  try {

    const res =
      await fetch(
        `/api/vaccination/inventory/${id}`
      );

    const result =
      await res.json();

    if (!result.success) {

      throw new Error(
        result.error || "Load failed"
      );
    }

    const d =
      result.data;


    /*************************************************************
     * FILL FORM
     *************************************************************/

    document.getElementById("invCode").value =
      d.code || "";

    document.getElementById("invQty").value =
      d.qty || 0;

    document.getElementById("invLot").value =
      d.lot || "";

    document.getElementById("invExp").value =
      d.exp || "";

    document.getElementById("invFrom").value =
      d.from || "";

    document.getElementById("invProvider").value =
      d.provider || "";

    document.getElementById("invDateReceived").value =
      d.dateReceived || "";


    /*************************************************************
     * ENABLE EDIT MODE
     *************************************************************/

    window.__INV_EDIT_MODE__ = true;
    window.__EDIT_INVID__ = id;


    /*************************************************************
     * OPEN MODAL
     *************************************************************/

    const modal =
      new bootstrap.Modal(
        document.getElementById(
          "vaccineInventoryModal"
        )
      );

    modal.show();

  } catch (err) {

    console.error(
      "❌ editInventory:",
      err
    );

    Swal.fire({
      icon: "error",
      title:
        err.message || "โหลดข้อมูลไม่สำเร็จ"
    });
  }
}


/*****************************************************************
 * LOAD VACCINE INVENTORY
 *****************************************************************/

async function loadVaccineInventory() {

  try {

    const res =
      await fetch("/api/vaccination/inventory");

    const result =
      await res.json();

    const list =
      result?.data || [];


    /*************************************************************
     * STATE
     *************************************************************/

    window.VaccineState.inventory = list;

    window.VaccineState.inventoryMap = {};


    /*************************************************************
     * SELECT
     *************************************************************/

    const select =
      document.getElementById("vaccineType");

    if (!select) return;

    select.innerHTML = `
      <option value="">
        -- เลือกวัคซีน --
      </option>
    `;


    /*************************************************************
     * BUILD OPTIONS
     *************************************************************/

    list.forEach(v => {

      const id =
        String(v.INVID || "").trim();

      if (!id) return;

      window.VaccineState.inventoryMap[id] = v;

      const opt =
        document.createElement("option");

      opt.value = id;

      opt.dataset.invid = id;

      opt.dataset.lot =
        v.Lot ||
        v.lot ||
        v.LOTNUMBER ||
        "";

      opt.textContent =
        `${v.Name || v.name || v.CODE}
         | LOT: ${opt.dataset.lot}`;

      select.appendChild(opt);
    });

    return true;

  } catch (err) {

    console.error(
      "loadVaccineInventory:",
      err
    );

    return false;
  }
}


/*****************************************************************
 * AUTO FILL
 *****************************************************************/

/*
function bindVaccineAutoFill() {

  const select =
    document.getElementById("vaccineType");

  if (!select) return;

  select.onchange = (e) => {

    const val = e.target.value;

    if (!item) return;

    document.getElementById("invLot").value =
      item.Lot ||
      item.lot ||
      item.BatchNo ||
      "";
  };
}

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    await loadVaccineInventory();

    bindVaccineAutoFill();
  }
);
*/


/*****************************************************************
 * GLOBAL EXPORTS
 *****************************************************************/

window.openInventoryModal =
  openInventoryModal;

window.saveInventory =
  saveInventory;

window.editInventory =
  editInventory;

window.loadInventoryPage =
  loadInventoryPage;

window.loadVaccineInventory =
  loadVaccineInventory;