function formatBullet(text) {

  if (!text) return ["-"];

  return String(text)
    .split("\n")
    .map(t => t.trim())
    .filter(Boolean)
    .map(t => "• " + t);
}


function splitLongText(text, limit = 500) {

  if (!text) return ["-"];

  const arr = [];
  let str = String(text);

  while (str.length > limit) {
    arr.push(str.slice(0, limit));
    str = str.slice(limit);
  }

  arr.push(str);

  return arr;
}


function buildFlex(record) {

  const result = record.HealthInform || "-";
  let color = "#00796B";

  const lower = result.toLowerCase();

  if (lower.includes("ปกติ")) color = "#2E7D32";
  else if (lower.includes("ติดตาม")) color = "#F9A825";
  else if (lower.includes("ผิดปกติ") || lower.includes("พบ")) color = "#C62828";

  return {
    type: "flex",
    altText: "📢 แจ้งผลการตรวจ",
    contents: {
      type: "bubble",
      size: "mega",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: "📋 แจ้งผลการตรวจ", weight: "bold", size: "lg" },
          { type: "text", text: `${record.NAME} ${record.LNAME}`, weight: "bold", size: "xl", margin: "md" },
          { type: "separator", margin: "md" },
          { type: "text", text: "ผลตรวจ:", weight: "bold", margin: "md" },
          { type: "text", text: result, color, wrap: true }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            style: "primary",
            action: {
              type: "message",
              label: "✅ ยืนยันรับผลแล้ว",
              text: "ยืนยันรับผลแล้ว"
            }
          }
        ]
      }
    }
  };
}


module.exports = {
  formatBullet,
  splitLongText,
  buildFlex
};