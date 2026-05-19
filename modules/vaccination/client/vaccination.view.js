/*****************************************************************
 * VACCINATION VIEW / EXCEL IMPORT UI
 *****************************************************************/


/* =========================================================
 * TEMP STATE
 * =======================================================*/

let excelData = [];


/* =========================================================
 * HANDLE EXCEL UPLOAD
 * =======================================================*/

function handleExcelUpload() {

  const file =
    document
      .getElementById("excelFile")
      ?.files?.[0];

  if (!file) return;

  const reader =
    new FileReader();

  reader.onload = function (e) {

    try {

      const data =
        new Uint8Array(e.target.result);

      const workbook =
        XLSX.read(data, {
          type: "array"
        });

      const sheet =
        workbook.Sheets[
          workbook.SheetNames[0]
        ];

      const json =
        XLSX.utils.sheet_to_json(sheet);


      /*******************************************************
       * NORMALIZE DATA
       *******************************************************/

      excelData = json
        .map((r) => ({

          code:
            String(
              r.Code ||
              r.code ||
              ""
            ).trim(),

          name:
            String(
              r.Name ||
              r.name ||
              ""
            ).trim()

        }))
        .filter(v => v.code && v.name);


      /*******************************************************
       * RENDER PREVIEW
       *******************************************************/

      renderExcelPreview();

    } catch (err) {

      console.error(
        "❌ handleExcelUpload:",
        err
      );

      Swal.fire({
        icon: "error",
        title: "อ่านไฟล์ไม่สำเร็จ"
      });
    }

  };

  reader.readAsArrayBuffer(file);
}


/* =========================================================
 * RENDER EXCEL PREVIEW
 * =======================================================*/

function renderExcelPreview() {

  const div =
    document.getElementById(
      "excelPreview"
    );

  if (!div) return;


  /*******************************************************
   * NO DATA
   *******************************************************/

  if (!excelData.length) {

    div.innerHTML = `

      <div class="alert alert-warning mb-0">

        ไม่พบข้อมูลในไฟล์ Excel

      </div>
    `;

    return;
  }


  /*******************************************************
   * TABLE
   *******************************************************/

  div.innerHTML = `

    <table
      class="table table-sm table-bordered align-middle">

      <thead class="table-light">

        <tr>

          <th width="5%">

            <input
              type="checkbox"
              onclick="toggleAll(this)"
              checked>

          </th>

          <th width="25%">
            Code
          </th>

          <th>
            Name
          </th>

        </tr>

      </thead>


      <tbody>

        ${excelData.map((r, i) => `

          <tr>

            <td class="text-center">

              <input
                type="checkbox"
                class="vac-check"
                value="${i}"
                checked>

            </td>

            <td>${r.code}</td>

            <td>${r.name}</td>

          </tr>

        `).join("")}

      </tbody>

    </table>
  `;
}


/* =========================================================
 * TOGGLE ALL
 * =======================================================*/

function toggleAll(el) {

  document
    .querySelectorAll(".vac-check")
    .forEach((c) => {

      c.checked = el.checked;

    });
}


/* =========================================================
 * SAVE SELECTED VACCINES
 * =======================================================*/

async function saveSelectedVaccines() {

  try {

    const checked =
      document.querySelectorAll(
        ".vac-check:checked"
      );


    /*******************************************************
     * VALIDATE
     *******************************************************/

    if (!checked.length) {

      return Swal.fire({
        icon: "warning",
        title: "กรุณาเลือกข้อมูล"
      });
    }


    /*******************************************************
     * BUILD PAYLOAD
     *******************************************************/

    const selected = [];

    checked.forEach((c) => {

      const index =
        Number(c.value);

      const row =
        excelData[index];

      if (row) {

        selected.push({

          code:
            row.code,

          name:
            row.name

        });
      }

    });


    /*******************************************************
     * API REQUEST
     *******************************************************/

    const res =
      await fetch(
        "/api/vaccination/master/bulk",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify(selected)
        }
      );

    const result =
      await res.json();

    if (!result.success) {

      throw new Error(
        result.error || "save failed"
      );
    }


    /*******************************************************
     * SUCCESS
     *******************************************************/

    Swal.fire({
      icon: "success",
      title: "บันทึกสำเร็จ",
      timer: 1200,
      showConfirmButton: false
    });


    /*******************************************************
     * REFRESH DATA
     *******************************************************/

    if (
      typeof loadVaccineMaster
      === "function"
    ) {

      await loadVaccineMaster();
    }

    if (
      typeof loadVaccineMasterTab
      === "function"
    ) {

      await loadVaccineMasterTab();
    }

  } catch (err) {

    console.error(
      "❌ saveSelectedVaccines:",
      err
    );

    Swal.fire({
      icon: "error",
      title:
        err.message || "บันทึกไม่สำเร็จ"
    });
  }
}


/* =========================================================
 * OPEN MODAL
 * =======================================================*/

function openVaccineModal() {

  const modal =
    document.getElementById(
      "vaccineModal"
    );

  if (modal) {

    modal.style.display = "block";
  }
}


/* =========================================================
 * CLOSE MODAL
 * =======================================================*/

function closeVaccineModal() {

  const modal =
    document.getElementById(
      "vaccineModal"
    );

  if (modal) {

    modal.style.display = "none";
  }
}


/* =========================================================
 * SWITCH TAB
 * =======================================================*/

function switchTab(tab) {

  const manual =
    document.getElementById(
      "manualTab"
    );

  const excel =
    document.getElementById(
      "excelTab"
    );

  if (!manual || !excel) return;


  /*******************************************************
   * SWITCH
   *******************************************************/

  if (tab === "manual") {

    manual.style.display = "";

    excel.style.display = "none";

  } else {

    manual.style.display = "none";

    excel.style.display = "";
  }
}


/* =========================================================
 * SAVE MANUAL VACCINE
 * =======================================================*/

function saveManualVaccine() {

  alert("Save Vaccine");
}


/* =========================================================
 * BIND FORM
 * =======================================================*/

function bindForm() {

  const form =
    document.getElementById(
      "vaccinationForm"
    );

  if (!form) {

    console.warn(
      "⚠️ vaccinationForm not found"
    );

    return;
  }


  /*******************************************************
   * REMOVE OLD EVENT
   *******************************************************/

  form.removeEventListener(
    "submit",
    window.saveVaccination
  );


  /*******************************************************
   * BIND NEW EVENT
   *******************************************************/

  form.addEventListener(
    "submit",
    window.saveVaccination
  );

  console.log(
    "✅ vaccination form bind success"
  );
}


/* =========================================================
 * EXPORTS
 * =======================================================*/

window.bindForm =
  bindForm;

window.openVaccineModal =
  openVaccineModal;

window.closeVaccineModal =
  closeVaccineModal;

window.switchTab =
  switchTab;

window.saveManualVaccine =
  saveManualVaccine;

window.handleExcelUpload =
  handleExcelUpload;

window.toggleAll =
  toggleAll;

window.saveSelectedVaccines =
  saveSelectedVaccines;