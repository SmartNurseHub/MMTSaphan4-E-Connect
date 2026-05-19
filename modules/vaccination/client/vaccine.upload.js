/*****************************************************************
 * VACCINE UPLOAD MODULE
 *****************************************************************/


/* =========================================================
 * TEMP STATE
 * =======================================================*/

window.uploadVaccines = [];


/* =========================================================
 * OPEN UPLOAD MODAL
 * =======================================================*/

window.openUploadVaccineModal = function () {

  const el =
    document.getElementById(
      "uploadVaccineModal"
    );

  if (!el) return;

  const modal =
    new bootstrap.Modal(el);

  modal.show();
};


/* =========================================================
 * READ VACCINE EXCEL
 * =======================================================*/

window.readVaccineExcel = function (event) {

  const file =
    event.target.files?.[0];

  if (!file) return;

  const reader =
    new FileReader();

  reader.onload = function (e) {

    try {

      /*******************************************************
       * READ WORKBOOK
       *******************************************************/

      const data =
        new Uint8Array(
          e.target.result
        );

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

      window.uploadVaccines = json
        .map((r) => ({

          code:
            String(

              r["รหัสยา"]

              ||

              r["Code"]

              ||

              r["code"]

              ||

              ""

            ).trim(),

          name:
            String(

              r["ชื่อยา"]

              ||

              r["Name"]

              ||

              r["name"]

              ||

              ""

            ).trim()

        }))
        .filter(
          (v) => v.code && v.name
        );


      /*******************************************************
       * RENDER TABLE
       *******************************************************/

      renderUploadTable();

    } catch (err) {

      console.error(
        "❌ readVaccineExcel:",
        err
      );

      Swal.fire({
        icon: "error",
        title: "อ่านไฟล์ไม่สำเร็จ"
      });
    }

  };

  reader.readAsArrayBuffer(file);
};


/* =========================================================
 * RENDER UPLOAD TABLE
 * =======================================================*/

window.renderUploadTable = function () {

  const tbody =
    document.getElementById(
      "uploadVaccineTable"
    );

  if (!tbody) return;


  /*******************************************************
   * SEARCH KEYWORD
   *******************************************************/

  const keyword =
    document
      .getElementById(
        "searchUploadVaccine"
      )
      ?.value
      ?.toLowerCase()
      ?.trim()

      ||

      "";


  /*******************************************************
   * DATA SOURCE
   *******************************************************/

  let data =
    window.uploadVaccines || [];


  /*******************************************************
   * FILTER
   *******************************************************/

  if (keyword) {

    data = data.filter((v) => {

      return (

        v.code
          .toLowerCase()
          .includes(keyword)

        ||

        v.name
          .toLowerCase()
          .includes(keyword)

      );

    });
  }


  /*******************************************************
   * EMPTY STATE
   *******************************************************/

  if (!data.length) {

    tbody.innerHTML = `

      <tr>

        <td
          colspan="3"
          class="text-center text-muted">

          ไม่มีข้อมูล

        </td>

      </tr>

    `;

    return;
  }


  /*******************************************************
   * RENDER TABLE
   *******************************************************/

  tbody.innerHTML = data
    .map((v) => `

      <tr>

        <td class="text-center">

          <input
            type="checkbox"
            class="vac-check"
            data-code="${v.code}"
            checked>

        </td>

        <td>${v.code}</td>

        <td>${v.name}</td>

      </tr>

    `)
    .join("");
};


/* =========================================================
 * TOGGLE ALL
 * =======================================================*/

window.toggleAllVaccines = function (el) {

  document
    .querySelectorAll(".vac-check")
    .forEach((c) => {

      c.checked = el.checked;

    });
};


/* =========================================================
 * SAVE SELECTED VACCINES
 * =======================================================*/

window.saveSelectedVaccines = async function () {

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
        title: "กรุณาเลือกรายการ"
      });
    }


    /*******************************************************
     * BUILD PAYLOAD
     *******************************************************/

    const selected = [];

    checked.forEach((chk) => {

      const code =
        chk.dataset.code;

      const row =
        window.uploadVaccines.find(
          (v) => v.code === code
        );

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
      title: "นำเข้าข้อมูลสำเร็จ",
      timer: 1200,
      showConfirmButton: false
    });


    /*******************************************************
     * CLOSE MODAL
     *******************************************************/

    bootstrap.Modal
      .getInstance(
        document.getElementById(
          "uploadVaccineModal"
        )
      )
      ?.hide();


    /*******************************************************
     * RESET STATE
     *******************************************************/

    window.uploadVaccines = [];


    /*******************************************************
     * RELOAD MASTER
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
        err.message || "นำเข้าไม่สำเร็จ"
    });
  }
};