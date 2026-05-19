/*****************************************************************
 * VACCINATION TAB SYSTEM
 *****************************************************************/


/* =========================================================
 * GLOBAL GUARD
 * =======================================================*/

if (!window.__VACCINE_TAB_SYSTEM__) {

  window.__VACCINE_TAB_SYSTEM__ = true;
}


/* =========================================================
 * TAB CONFIG
 * =======================================================*/

const TAB_MAP = {

  addVaccine: "addVaccineTab",

  timeline: "timelineTab",

  table: "tableTab",

  vaccineMaster: "vaccineMasterTab",

  vaccineInventory: "vaccineInventoryPage",

  vaccineSchedule: "vaccineScheduleTab",

  hisImport: "hisImportTab",

  stockCard: "stockCard"
};

/* =========================================================
 * SAFE HELPERS
 * =======================================================*/

function safeCall(fn, ...args) {

  if (typeof fn === "function") {

    return fn(...args);
  }
}


function hideAllTabs() {

  document
    .querySelectorAll(".vaccine-tab")
    .forEach(el => {

      el.classList.add("d-none");

    });
}


function showTab(id) {

  document
    .getElementById(id)
    ?.classList.remove("d-none");
}


/* =========================================================
 * DASHBOARD
 * =======================================================*/

function showDashboard() {

  document
    .getElementById("mainContainer")
    ?.classList.add("d-none");

  hideAllTabs();

  document
    .getElementById("VaccineDashboard")
    ?.classList.remove("d-none");
}

window.showDashboard =
  showDashboard;


/* =========================================================
 * TAB BINDING
 * =======================================================*/

function bindTabs() {

  if (window.__VACCINE_TAB_BOUND__) return;

  window.__VACCINE_TAB_BOUND__ = true;


  /*********************************************************
   * GLOBAL CLICK EVENT
   *********************************************************/

  document.addEventListener(
    "click",
    async (e) => {

      const btn =
        e.target.closest(".open-tab"); 

      if (!btn) return;

      e.preventDefault();


      /*******************************************************
       * TAB NAME
       *******************************************************/

      const tab =
        btn.dataset.tab;

      if (!tab) return;


      /*******************************************************
       * SWITCH UI MODE
       *******************************************************/

      document
        .getElementById("VaccineDashboard")
        ?.classList.add("d-none");

      document
        .getElementById("mainContainer")
        ?.classList.remove("d-none");

      hideAllTabs();


      /*******************************************************
       * PATIENT SEARCH VISIBILITY
       *******************************************************/

      const patientSearchCard =
        document.getElementById(
          "patientSearchCard"
        );

      const hideSearchTabs = [

        "vaccineMaster",

        "vaccineSchedule",

        "vaccineInventory",

        "hisImport",

        "stockCard"
      ];

      if (patientSearchCard) {

        patientSearchCard.classList.toggle(
          "d-none",
          hideSearchTabs.includes(tab)
        );
      }


      /*******************************************************
       * RESOLVE TARGET TAB
       *******************************************************/

      const targetId =
        TAB_MAP[tab];

      if (!targetId) return;


      /*******************************************************
       * TAB ROUTING
       *******************************************************/

      try {

        /* ---------------------------------------------------
         * VACCINE MASTER
         * -------------------------------------------------*/

        if (tab === "vaccineMaster") {

          safeCall(
            window.loadVaccineMasterTab
          );
        }


        /* ---------------------------------------------------
         * VACCINE SCHEDULE
         * -------------------------------------------------*/

        if (tab === "vaccineSchedule") {

          safeCall(
            window.loadVaccineScheduleTab
          );
        }


        /* ---------------------------------------------------
         * INVENTORY
         * -------------------------------------------------*/

        if (tab === "vaccineInventory") {

          await loadInventoryPage();

          if (
            typeof loadInventoryMasterDropdown
            === "function"
          ) {

            await loadInventoryMasterDropdown();
          }
        }


        /* ---------------------------------------------------
         * HIS IMPORT
         * -------------------------------------------------*/

        if (tab === "hisImport") {

          safeCall(
            window.loadHISImportTab
          );
        }

      } catch (err) {

        console.error(
          "TAB ROUTE ERROR:",
          err
        );
      }


      /*******************************************************
       * SHOW TARGET TAB
       *******************************************************/

      showTab(targetId);

    }
  );
}


/* =========================================================
 * INIT
 * =======================================================*/

document.addEventListener(
  "DOMContentLoaded",
  () => {

    bindTabs();

  }
);