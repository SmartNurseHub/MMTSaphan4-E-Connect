function calculateDueDate(baseDate, type, value) {

  const d = new Date(baseDate);
  const v = Number(value || 0);

  if (type === "DAY") d.setDate(d.getDate() + v);
  if (type === "MONTH") d.setMonth(d.getMonth() + v);
  if (type === "YEAR") d.setFullYear(d.getFullYear() + v);

  return d;

}

function toISO(date) {
  return new Date(date).toISOString().split("T")[0];
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + Number(days));
  return d;
}

function genId(prefix = "ID") {
  return `${prefix}${Date.now()}`;
}

module.exports = {
  calculateDueDate,
  toISO,
  addDays,
  genId
};