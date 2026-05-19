const {
  getVaccineSchedule
} = require("./services/vaccination.master.service");

/* =========================================================
   CALCULATE NEXT DATE (SMART VERSION)
========================================================= */
function calculateDueDate(baseDate, type, value) {

  const d = new Date(baseDate);
  const v = Number(value || 0);

  switch (String(type).toUpperCase()) {

    case "DAY":
      d.setDate(d.getDate() + v);
      break;

    case "WEEK":
      d.setDate(d.getDate() + v * 7);
      break;

    case "MONTH":
      d.setMonth(d.getMonth() + v);
      break;

    default:
      d.setDate(d.getDate() + v);

  }

  return d;
}

/* =========================================================
   DETECT NEXT DOSE (FROM HISTORY)
========================================================= */
function detectNextDose(history = []) {

  if (!Array.isArray(history) || history.length === 0) {
    return 1;
  }

  const maxDose = Math.max(
    ...history.map(x => Number(x.doseNo || 0))
  );

  return maxDose + 1;
}

/* =========================================================
   BUILD FULL SCHEDULE FLOW (CORE ENGINE)
========================================================= */
async function buildVaccinationFlow({
  vaccineCode,
  history = [],
  baseDate
}) {

  const schedule = await getVaccineSchedule(vaccineCode);

  if (!schedule.length) return [];

  const nextDose = detectNextDose(history);

  const result = [];

  for (const s of schedule) {

    const doseNo = Number(s.doseNo);

    // skip past doses
    if (doseNo < nextDose) continue;

    const dueDate = calculateDueDate(
      baseDate,
      s.intervalType,
      s.intervalValue
    );

    result.push({
      doseNo,
      dueDate: dueDate.toISOString().slice(0, 10),
      intervalType: s.intervalType,
      intervalValue: s.intervalValue
    });

  }

  return result;
}

/* =========================================================
   CHECK COMPLETION STATUS
========================================================= */
function isCompleted(history = [], masterTotalDose = 0) {

  if (!history.length) return false;

  const maxDose = Math.max(
    ...history.map(x => Number(x.doseNo || 0))
  );

  return maxDose >= masterTotalDose;
}

/* =========================================================
   GET CURRENT STATE (DEBUG / UI / FLOW CONTROL)
========================================================= */
function getVaccinationState(history = [], master = {}) {

  const nextDose = detectNextDose(history);

  return {

    nextDose,

    completed: isCompleted(history, master.totalDose),

    lastDose: history.length
      ? Math.max(...history.map(x => x.doseNo))
      : 0

  };
}

module.exports = {

  calculateDueDate,
  detectNextDose,
  buildVaccinationFlow,
  isCompleted,
  getVaccinationState

};