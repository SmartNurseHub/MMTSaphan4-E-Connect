function calculateDueDate(baseDate, type, value) {
  const d = new Date(baseDate);

  switch ((type || "DAY").toUpperCase()) {
    case "DAY":
      d.setDate(d.getDate() + Number(value || 0));
      break;

    case "MONTH":
      d.setMonth(d.getMonth() + Number(value || 0));
      break;

    case "YEAR":
      d.setFullYear(d.getFullYear() + Number(value || 0));
      break;
  }

  return d;
}

function toISO(date) {
  return new Date(date).toISOString().slice(0, 10);
}

module.exports = {
  calculateDueDate,
  toISO
};