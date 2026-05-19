/******************************************************************
 * VACCINATION HELPER FUNCTIONS
 * Used for calculating next dose and detecting current dose number
 ******************************************************************/

/**
 * calculateNextDose
 * @param {Object} master - Vaccine master data { totalDose, intervalDays, ... }
 * @param {Number} dose - Current dose number
 * @param {String|Date} date - Date of the last dose
 * @returns {String|null} - ISO date of next dose or null if last dose reached
 */
exports.calculateNextDose = function(master, dose, date) {
  if (dose >= master.totalDose) return null;

  const next = new Date(date);
  next.setDate(next.getDate() + master.intervalDays);

  return next.toISOString().slice(0, 10);
};

/**
 * detectDose
 * @param {Array} history - Vaccination history array
 * @returns {Number} - Next dose number to be administered
 */
exports.detectDose = function(history) {
  if (!history.length) return 1;

  const lastDose = Math.max(...history.map(x => x.doseNumber));
  return lastDose + 1;
};