/*****************************************************************
 * UTILITIES MODULE
 *****************************************************************/


/* =========================================================
 * CALCULATE AGE
 * =======================================================*/

function calculateAge(birth) {

  if (!birth) return "-";

  try {

    /*********************************************************
     * HIS FORMAT (DDMMYY)
     *********************************************************/

    if (

      typeof birth === "string"

      &&

      birth.length === 6

    ) {

      const d =
        birth.substring(0, 2);

      const m =
        birth.substring(2, 4);

      const y =
        Number(
          birth.substring(4, 6)
        ) + 2500 - 543;

      birth = `${y}-${m}-${d}`;
    }


    /*********************************************************
     * DATE OBJECT
     *********************************************************/

    const b =
      new Date(birth);

    if (isNaN(b.getTime())) {

      return "-";
    }

    const t =
      new Date();

    let age =
      t.getFullYear()
      -
      b.getFullYear();


    /*********************************************************
     * CHECK BIRTHDAY
     *********************************************************/

    if (

      t.getMonth() < b.getMonth()

      ||

      (
        t.getMonth() === b.getMonth()
        &&
        t.getDate() < b.getDate()
      )

    ) {

      age--;
    }

    return age;

  } catch (err) {

    console.error(
      "❌ calculateAge:",
      err
    );

    return "-";
  }
}


/* =========================================================
 * GET FULL NAME
 * =======================================================*/

function getFullName(p) {

  if (!p) return "-";

  const prename = {

    1: "ด.ช.",

    2: "ด.ญ.",

    3: "นาย",

    4: "นาง",

    5: "น.ส."
  };

  return `

    ${prename[p.PRENAME] || ""}
    ${p.NAME || ""}
    ${p.LNAME || ""}

  `
    .replace(/\s+/g, " ")
    .trim();
}


/* =========================================================
 * FORMAT THAI DATE
 * =======================================================*/

function formatThaiDate(date) {

  if (!date) return "-";

  try {

    const months = [

      "ม.ค.",
      "ก.พ.",
      "มี.ค.",
      "เม.ย.",

      "พ.ค.",
      "มิ.ย.",
      "ก.ค.",
      "ส.ค.",

      "ก.ย.",
      "ต.ค.",
      "พ.ย.",
      "ธ.ค."

    ];

    const d =
      new Date(date);


    /*********************************************************
     * INVALID DATE
     *********************************************************/

    if (isNaN(d.getTime())) {

      return date;
    }

    return `

      ${d.getDate()}
      ${months[d.getMonth()]}
      ${d.getFullYear() + 543}

    `
      .replace(/\s+/g, " ")
      .trim();

  } catch (err) {

    console.error(
      "❌ formatThaiDate:",
      err
    );

    return date;
  }
}


/* =========================================================
 * GET VACCINE NAME
 * =======================================================*/

function getVaccineName(code) {

  if (!code) return "-";


  /*********************************************************
   * SAFETY CHECK
   *********************************************************/

  if (

    !window.VaccineState

    ||

    !Array.isArray(
      VaccineState.vaccineMaster
    )

  ) {

    return code;
  }


  /*********************************************************
   * FIND MASTER
   *********************************************************/

  const vaccine =
    VaccineState.vaccineMaster.find(
      v => v.code === code
    );

  return vaccine
    ? vaccine.name
    : code;
}


/* =========================================================
 * SET TEXT
 * =======================================================*/

function setText(id, val) {

  const el =
    document.getElementById(id);

  if (!el) return;

  el.textContent =
    val || "-";
}


/* =========================================================
 * SHOW DASHBOARD
 * =======================================================*/

function showDashboard() {

  document
    .getElementById("mainContainer")
    ?.classList.add("d-none");

  document
    .querySelectorAll(".vaccine-tab")
    .forEach(el => {

      el.classList.add("d-none");

    });

  document
    .getElementById("VaccineDashboard")
    ?.classList.remove("d-none");
}


/* =========================================================
 * FILL APPOINTMENT
 * =======================================================*/

function fillAppointment(
  cid,
  vaccineCode,
  doseNo
) {

  const vaccineInput =
    document.getElementById(
      "vaccineType"
    );

  const doseInput =
    document.getElementById(
      "doseNumber"
    );

  const dateInput =
    document.getElementById(
      "recordDate"
    );


  /*********************************************************
   * SET VALUES
   *********************************************************/

  if (vaccineInput) {

    vaccineInput.value =
      vaccineCode || "";
  }

  if (doseInput) {

    doseInput.value =
      doseNo || "";
  }

  if (dateInput) {

    dateInput.value =
      new Date()
        .toISOString()
        .split("T")[0];
  }


  /*********************************************************
   * SCROLL TO FORM
   *********************************************************/

  document
    .getElementById("vaccinationForm")
    ?.scrollIntoView({
      behavior: "smooth"
    });
}


/* =========================================================
 * EXPORTS
 * =======================================================*/

window.calculateAge =
  calculateAge;

window.getFullName =
  getFullName;

window.formatThaiDate =
  formatThaiDate;

window.getVaccineName =
  getVaccineName;

window.setText =
  setText;

window.showDashboard =
  showDashboard;

window.fillAppointment =
  fillAppointment;