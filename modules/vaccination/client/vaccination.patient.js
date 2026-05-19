/*****************************************************************
 * PATIENT MODULE
 *****************************************************************/


/* =========================================================
 * BIND PATIENT SEARCH
 * =======================================================*/

function bindPatientSearch() {

  const btn =
    document.getElementById(
      "searchPatientBtn"
    );

  /*********************************************************
   * GUARD
   *********************************************************/

  if (!btn || btn.dataset.bound) return;

  btn.dataset.bound = "true";


  /*********************************************************
   * EVENT
   *********************************************************/

  btn.addEventListener(
    "click",
    openPatientModal
  );
}


/* =========================================================
 * OPEN PATIENT MODAL
 * =======================================================*/

async function openPatientModal() {

  try {

    /*********************************************************
     * FETCH PATIENT LIST
     *********************************************************/

    const res =
      await fetch("/api/patients/list");

    const result =
      await res.json();

    if (!result.success) {

      throw new Error(
        result.error ||
        "โหลดข้อมูลผู้ป่วยไม่สำเร็จ"
      );
    }


    /*********************************************************
     * TABLE
     *********************************************************/

    const table =
      document.getElementById(
        "patientSearchTable"
      );

    if (!table) return;

    table.innerHTML = "";


    /*********************************************************
     * RENDER ROWS
     *********************************************************/

    result.data.forEach((p) => {

      const tr =
        document.createElement("tr");

      tr.style.fontSize = "10px";

      tr.innerHTML = `

        <td>${p.CID || "-"}</td>

        <td>
          ${getFullName(p)}
        </td>

        <td>
          ${
            p.BIRTH_THAI ||
            formatThaiDate(p.BIRTH) ||
            "-"
          }
        </td>

        <td>
          ${calculateAge(p.BIRTH)}
        </td>

        <td>
          ${
            p.TELEPHONE ||
            p.MOBILE ||
            "-"
          }
        </td>

        <td>

          <button
            class="btn btn-success btn-sm">

            เลือก

          </button>

        </td>
      `;


      /*******************************************************
       * SELECT ACTION
       *******************************************************/

      tr.querySelector("button")
        .onclick = () => selectPatient(p);

      table.appendChild(tr);

    });


    /*********************************************************
     * OPEN MODAL
     *********************************************************/

    const modal =
      new bootstrap.Modal(
        document.getElementById(
          "patientSearchModal"
        )
      );

    modal.show();

  } catch (err) {

    console.error(
      "❌ openPatientModal:",
      err
    );

    Swal.fire({
      icon: "error",
      title:
        err.message ||
        "โหลดข้อมูลผู้ป่วยไม่สำเร็จ"
    });
  }
}


/* =========================================================
 * FORMAT BIRTH DISPLAY
 * =======================================================*/

function formatBirthDisplay(birth) {

  return `${formatThaiDate(birth)}`;
}


/* =========================================================
 * SELECT PATIENT
 * =======================================================*/

function selectPatient(p) {

  if (!p) return;


  /*********************************************************
   * STATE
   *********************************************************/

  VaccineState.currentCID =
    p.CID;

  VaccineState.currentPatient =
    p;


  /*********************************************************
   * HIDDEN FIELDS
   *********************************************************/

  const cidEl =
    document.getElementById("cid");

  if (cidEl) {
    cidEl.value = p.CID || "";
  }

  const apidEl =
    document.getElementById("apid");

  if (apidEl) {
    apidEl.value = p.APID || "";
  }


  /*********************************************************
   * UI
   *********************************************************/

  setText(
    "p_cid",
    p.CID
  );

  setText(
    "p_name",
    getFullName(p)
  );

  setText(
    "p_birth",
    formatBirthDisplay(p.BIRTH)
  );

  setText(
    "p_age",
    calculateAge(p.BIRTH)
  );


  /*********************************************************
   * LOAD DATA
   *********************************************************/

  try {

    if (
      typeof loadTimeline === "function"
    ) {
      loadTimeline(p.CID);
    }

    if (
      typeof loadVaccinationTable
      === "function"
    ) {
      loadVaccinationTable(p.CID);
    }

    if (
      typeof loadLatestVaccines
      === "function"
    ) {
      loadLatestVaccines(p.CID);
    }

    if (
      typeof loadAppointments
      === "function"
    ) {
      loadAppointments(p.CID);
    }

  } catch (err) {

    console.error(
      "❌ selectPatient load error:",
      err
    );
  }


  /*********************************************************
   * CLOSE MODAL
   *********************************************************/

  const modalEl =
    document.getElementById(
      "patientSearchModal"
    );

  const modalInstance =
    bootstrap.Modal.getInstance(
      modalEl
    );

  if (modalInstance) {
    modalInstance.hide();
  }
}


/* =========================================================
 * LOAD NEXT VCN
 * =======================================================*/

async function loadNextVCN() {

  try {

    console.log(
      "🚀 loadNextVCN CALLED"
    );

    const res =
      await fetch(
        "/api/vaccination/next-vcn"
      );

    const result =
      await res.json();

    console.log(
      "🔥 RAW RESPONSE =",
      result
    );

    const el =
      document.getElementById("cn");

    if (!el) {

      console.warn(
        "❌ #cn not found in DOM"
      );

      return;
    }

    const vcnValue =
      result?.vcn || "-";

    el.value = vcnValue;

    console.log(
      "✅ SET VCN =",
      vcnValue
    );

  } catch (err) {

    console.error(
      "❌ loadNextVCN error:",
      err
    );
  }
}

/* =========================================================
 * EXPORTS
 * =======================================================*/

window.selectPatient =
  selectPatient;