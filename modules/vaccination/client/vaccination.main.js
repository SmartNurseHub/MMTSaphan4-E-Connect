/*****************************************************************
 * INIT VACCINATION MODULE
 *****************************************************************/

window.initVaccination = async function () {

  try {

    /*************************************************************
     * BIND EVENTS
     *************************************************************/

    bindTabs();

    bindPatientSearch();

    bindForm();


    /*************************************************************
     * LOAD INVENTORY
     *************************************************************/

    await loadVaccineInventory();


    /*************************************************************
     * LOAD MASTER
     *************************************************************/

    await loadVaccineMaster();


    /*************************************************************
     * DEFAULT DATE
     *************************************************************/

    const dateInput =
      document.getElementById("recordDate");

    if (dateInput) {

      dateInput.value =
        new Date()
          .toISOString()
          .split("T")[0];
    }


    /*************************************************************
     * LOAD NEXT VCN
     *************************************************************/

    if (typeof loadNextVCN === "function") {

      await loadNextVCN();
    }


    /*************************************************************
     * LOAD DASHBOARD
     *************************************************************/

    if (typeof loadDashboard === "function") {

      await loadDashboard();
    }

  } catch (err) {

    console.error(
      "❌ initVaccination:",
      err
    );
  }
};