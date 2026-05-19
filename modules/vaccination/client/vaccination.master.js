/*****************************************************************
 * VACCINATION MASTER MODULE
 *****************************************************************/


/* =========================================================
 * GLOBAL STATE
 * =======================================================*/

window.uploadVaccines = [];


/* =========================================================
 * LOAD MASTER
 * =======================================================*/

async function loadVaccineMaster() {

  const res =
    await fetch("/api/vaccination/master");

  const result =
    await res.json();

  if (!result.success) {
    throw new Error(result.error);
  }

  const data =
    result.data || [];

  VaccineState.vaccineMaster = data;

  return data;
}


/* =========================================================
 * LOAD MASTER TAB
 * =======================================================*/

async function loadVaccineMasterTab() {

  const el =
    document.getElementById("vaccineMasterTab");

  if (!el) return;

  const data =
    VaccineState.vaccineMaster || [];

  el.innerHTML = `

    <div class="card shadow-sm border-0">

      <!-- HEADER -->
      <div
        class="card-header d-flex justify-content-between text-white"
        style="background:#006666;">

        <div>💉 Vaccine Master</div>

        <div class="d-flex gap-2">

          <button
            class="btn btn-light btn-sm"
            onclick="openAddVaccineModal()">
            ➕ เพิ่ม
          </button>

          <button
            class="btn btn-warning btn-sm"
            onclick="openUploadVaccineModal()">
            ⬆️ Upload
          </button>

        </div>
      </div>


      <!-- BODY -->
      <div class="card-body">

        <table class="table table-sm table-bordered">

          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>

            ${
              data.length

                ? data.map(v => `
                    <tr>
                      <td>${v.code}</td>
                      <td>${v.name}</td>
                      <td>
                        <span class="badge bg-success">
                          Active
                        </span>
                      </td>
                    </tr>
                  `).join("")

                : `
                    <tr>
                      <td colspan="3" class="text-center">
                        No Data
                      </td>
                    </tr>
                  `
            }

          </tbody>

        </table>

      </div>
    </div>

    ${renderAddVaccineModal()}
    ${renderUploadVaccineModal()}
  `;
}


/* =========================================================
 * ADD MODAL
 * =======================================================*/

function renderAddVaccineModal() {

  return `

    <div class="modal fade"
         id="addVaccineModal"
         tabindex="-1">

      <div class="modal-dialog">

        <div class="modal-content">

          <!-- HEADER -->
          <div class="modal-header">

            <h5>เพิ่มวัคซีน</h5>

            <button
              class="btn-close"
              data-bs-dismiss="modal">
            </button>

          </div>


          <!-- BODY -->
          <div class="modal-body">

            <input
              id="vacCode"
              class="form-control mb-2"
              placeholder="Code">

            <input
              id="vacName"
              class="form-control"
              placeholder="Name">

          </div>


          <!-- FOOTER -->
          <div class="modal-footer">

            <button
              class="btn btn-secondary"
              data-bs-dismiss="modal">
              ปิด
            </button>

            <button
              class="btn btn-success"
              onclick="saveVaccineMaster()">
              บันทึก
            </button>

          </div>

        </div>
      </div>
    </div>
  `;
}


/* =========================================================
 * UPLOAD MODAL
 * =======================================================*/

function renderUploadVaccineModal() {

  return `

    <div class="modal fade"
         id="uploadVaccineModal"
         tabindex="-1">

      <div class="modal-dialog modal-lg">

        <div class="modal-content">

          <!-- HEADER -->
          <div class="modal-header">

            <h5>Upload Vaccine</h5>

            <button
              class="btn-close"
              data-bs-dismiss="modal">
            </button>

          </div>


          <!-- BODY -->
          <div class="modal-body">

            <!-- FILE -->
            <input
              type="file"
              class="form-control"
              onchange="readVaccineExcel(event)">


            <!-- TOOLBAR -->
            <div
              class="d-flex justify-content-between mt-2">

              <div id="uploadTotal"></div>

              <input
                class="form-control w-50"
                id="searchUploadVaccine"
                oninput="renderUploadTable()"
                placeholder="search">

            </div>


            <!-- TABLE -->
            <table class="table table-sm mt-2">

              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      onclick="toggleAllVaccines(this)">
                  </th>
                  <th>Code</th>
                  <th>Name</th>
                </tr>
              </thead>

              <tbody id="uploadVaccineTable"></tbody>

            </table>

          </div>


          <!-- FOOTER -->
          <div class="modal-footer">

            <button
              class="btn btn-secondary"
              data-bs-dismiss="modal">
              ปิด
            </button>

            <button
              class="btn btn-success"
              onclick="saveSelectedVaccines()">
              บันทึก
            </button>

          </div>

        </div>
      </div>
    </div>
  `;
}


/* =========================================================
 * OPEN MODALS
 * =======================================================*/

function openAddVaccineModal() {

  bootstrap.Modal
    .getOrCreateInstance(
      document.getElementById("addVaccineModal")
    )
    .show();
}


function openUploadVaccineModal() {

  const el =
    document.getElementById("uploadVaccineModal");

  if (!el) {

    console.warn(
      "modal ยังไม่ถูก render -> render tab ก่อน"
    );

    loadVaccineMasterTab();

    return;
  }

  bootstrap.Modal
    .getOrCreateInstance(el)
    .show();
}


/* =========================================================
 * READ EXCEL
 * =======================================================*/

function readVaccineExcel(event) {

  const file =
    event.target.files[0];

  if (!file) return;

  const reader =
    new FileReader();

  reader.onload = function (e) {

    const data =
      new Uint8Array(e.target.result);

    const wb =
      XLSX.read(data, { type: "array" });

    const ws =
      wb.Sheets[wb.SheetNames[0]];

    const json =
      XLSX.utils.sheet_to_json(ws);

    window.uploadVaccines = json
      .map(r => ({

        code:
          String(
            r["Code"] ||
            r["รหัสยา"] ||
            ""
          ),

        name:
          String(
            r["Name"] ||
            r["ชื่อยา"] ||
            ""
          )

      }))
      .filter(v => v.code && v.name);

    renderUploadTable();
  };

  reader.readAsArrayBuffer(file);
}


/* =========================================================
 * RENDER UPLOAD TABLE
 * =======================================================*/

function renderUploadTable() {

  const tbody =
    document.getElementById("uploadVaccineTable");

  if (!tbody) return;

  const data =
    window.uploadVaccines || [];

  tbody.innerHTML =
    data.map(v => `

      <tr>

        <td>
          <input
            type="checkbox"
            class="vac-check"
            data-code="${v.code}"
            checked>
        </td>

        <td>${v.code}</td>

        <td>${v.name}</td>

      </tr>

    `).join("");
}


/* =========================================================
 * SAVE BULK
 * =======================================================*/

async function saveSelectedVaccines() {

  const selected = [];

  document
    .querySelectorAll(".vac-check:checked")
    .forEach(c => {

      const code =
        c.dataset.code;

      const v =
        window.uploadVaccines.find(
          x => x.code === code
        );

      if (v) {
        selected.push(v);
      }
    });

  await fetch(
    "/api/vaccination/master/bulk",
    {
      method: "POST",

      headers: {
        "Content-Type":"application/json"
      },

      body:
        JSON.stringify(selected)
    }
  );

  bootstrap.Modal
    .getInstance(
      document.getElementById(
        "uploadVaccineModal"
      )
    )
    ?.hide();

  window.uploadVaccines = [];

  await refreshVaccineUI();
}


/* =========================================================
 * SAVE MASTER
 * =======================================================*/

async function saveVaccineMaster() {

  try {

    const code =
      document.getElementById("vacCode")
      .value
      .trim();

    const name =
      document.getElementById("vacName")
      .value
      .trim();

    if (!code || !name) {

      return Swal.fire({
        icon: "warning",
        title: "กรอกข้อมูลไม่ครบ"
      });
    }

    await fetch(
      "/api/vaccination/master",
      {
        method: "POST",

        headers: {
          "Content-Type":"application/json"
        },

        body:
          JSON.stringify({
            code,
            name
          })
      }
    );

    Swal.fire({
      icon: "success",
      title: "บันทึกสำเร็จ",
      timer: 1200,
      showConfirmButton: false
    });

    bootstrap.Modal
      .getInstance(
        document.getElementById(
          "addVaccineModal"
        )
      )
      .hide();

    await refreshVaccineUI();

  } catch (err) {

    console.error(err);

    Swal.fire({
      icon: "error",
      title: "บันทึกไม่สำเร็จ"
    });
  }
}


/* =========================================================
 * REFRESH UI
 * =======================================================*/

async function refreshVaccineUI() {

  const data =
    await loadVaccineMaster();

  VaccineState.vaccineMaster =
    data || [];

  await loadVaccineMasterTab(
    VaccineState.vaccineMaster
  );
}


/* =========================================================
 * LOAD INVENTORY
 * =======================================================*/

async function loadVaccineInventory() {

  try {

    const res =
      await fetch(
        "/api/vaccination/inventory"
      );

    const result =
      await res.json();

    const list =
      result?.data ?? result ?? [];

    window.__INVENTORY_CACHE__ = list;


    /*************************************************
     * SELECT
     *************************************************/

    const select =
      document.getElementById("vaccineType");

    if (!select) return;

    select.innerHTML = `
      <option value="">
        -- เลือกวัคซีน --
      </option>
    `;


    /*************************************************
     * RESET MAP
     *************************************************/

    VaccineState.inventoryMap = {};


    /*************************************************
     * BUILD OPTIONS
     *************************************************/

    list.forEach(v => {

      const invid =
        v.INVID || v.invid;

      if (!invid) return;

      VaccineState.inventoryMap[invid] = v;

      const opt =
        document.createElement("option");

      opt.value = invid;

      opt.dataset.invid = invid;

      opt.dataset.lot =
        v.Lot || v.lot || "";

      opt.dataset.code =
        v.Code || v.code || "";

      opt.textContent =
        `${v.Name || v.name || "-"}
         | LOT: ${v.Lot || v.lot || "-"}`;

      select.appendChild(opt);
    });

    return true;

  } catch (err) {

    console.error(err);

    return false;
  }
}


/* =========================================================
 * EXPORTS
 * =======================================================*/

window.openAddVaccineModal =
  openAddVaccineModal;

window.openUploadVaccineModal =
  openUploadVaccineModal;

window.readVaccineExcel =
  readVaccineExcel;

window.renderUploadTable =
  renderUploadTable;

window.saveSelectedVaccines =
  saveSelectedVaccines;

window.saveVaccineMaster =
  saveVaccineMaster;

window.refreshVaccineUI =
  refreshVaccineUI;