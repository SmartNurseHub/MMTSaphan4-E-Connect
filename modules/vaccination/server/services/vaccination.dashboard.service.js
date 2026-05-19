/* =========================================================
   DASHBOARD SUMMARY
========================================================= */
async function getDashboardSummary() {
  try {

    const sheets = await getSheets();
    const spreadsheetId = process.env.SPREADSHEET_ID;

    const [recordsRes, patientsRes, vaccineRes, apptRes] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId, range: "VaccinationRecords!A2:M" }),
      sheets.spreadsheets.values.get({ spreadsheetId, range: "Patients!A2:J" }),
      sheets.spreadsheets.values.get({ spreadsheetId, range: "VaccineMaster!A2:H" }),
      sheets.spreadsheets.values.get({ spreadsheetId, range: "VaccinationAppointments!A2:H" }),
    ]);

    const records = recordsRes.data.values || [];
    const patients = patientsRes.data.values || [];
    const vaccines = vaccineRes.data.values || [];
    const appointments = apptRes.data.values || [];

    // ---------------- MAP ----------------
    const patientMap = {};
    patients.forEach(r => {
      if (!r[0]) return;
      patientMap[r[0]] = `${r[2] || ""} ${r[3] || ""}`;
    });

    const vaccineMap = {};
    vaccines.forEach(r => {
      if (!r[0]) return;
      vaccineMap[r[0]] = r[1];
    });

    const apptMap = {};
    appointments.forEach(r => {
      const CID = r[1];
      const date = r[5];

      if (!CID || !date) return;

      if (!apptMap[CID]) apptMap[CID] = [];

      const d = new Date(date);
      if (!isNaN(d)) apptMap[CID].push(d);
    });

    // ---------------- GROUP ----------------
    const personMap = {};

    records.forEach(r => {
      const CID = r[1];
      if (!CID) return;

      if (!personMap[CID]) {
        personMap[CID] = {
          CID,
          fullname: patientMap[CID] || "-",
          vaccines: new Set(),
          lastDate: null
        };
      }

      const vaccineCode = r[3];
      const dateService = new Date(r[5]);

      if (vaccineCode) {
        const name = vaccineMap[vaccineCode] || vaccineCode;
        personMap[CID].vaccines.add(name);
      }

      if (!isNaN(dateService?.getTime?.())) {
        if (!personMap[CID].lastDate || dateService > new Date(personMap[CID].lastDate)) {
          personMap[CID].lastDate = dateService;
        }
      }
    });

    // ---------------- BUILD ----------------
    const result = Object.values(personMap).map(p => {

      let nextAppt = "-";

      if (apptMap[p.CID]) {
        const now = new Date();

        const future = apptMap[p.CID]
          .filter(d => d >= now)
          .sort((a, b) => a - b);

        if (future.length) {
          nextAppt = future[0];
        }
      }

      return {
        CID: p.CID,
        fullname: p.fullname,
        vaccines: Array.from(p.vaccines).join(", "),
        lastDate: p.lastDate,
        nextAppt
      };
    });

    return result;

  } catch (err) {
    console.error("❌ getDashboardSummary ERROR:", err);
    throw err;
  }
}