/******************************************************************
 * LINE OA SERVICE MODULE
 * NurseStationHub
 *****************************************************************/

const line = require("@line/bot-sdk");

const client = new line.Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
});

const { formatBullet } = require("../../utils/flexBuilder");
const nursingService = require("../nursingRecords/nursingRecords.service");


/* =========================================================
   CORE: SAFE PUSH (ของเดิมคุณ 100%)
========================================================= */
async function safePush(userId, message) {

  if (!userId || !message) {
    console.log("⚠️ safePush invalid params");
    return false;
  }

  if (!client || !client.pushMessage) {
    console.error("❌ LINE client.pushMessage missing");
    return false;
  }

  const messages = Array.isArray(message) ? message : [message];

  try {

    await new Promise(r => setTimeout(r, 120));

    await Promise.race([
      client.pushMessage(userId, messages),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("LINE timeout")), 8000)
      )
    ]);

    return true;

  } catch (err) {

    const msg = String(err.response?.data?.message || err.message);

    if (msg.includes("not a friend") || msg.includes("blocked")) {
      console.log("⚠️ user cannot receive:", userId);
      return false;
    }

    console.log("⚠️ retry push:", userId);

    try {

      await client.pushMessage(userId, messages);
      return true;

    } catch (err2) {

      const msg2 = err2.response?.data?.message || err2.message;
      console.error("❌ push error:", msg2);

      return false;

    }

  }

}


/* =========================================================
   RESULT: PUSH HEALTH RESULT (ของเดิมคุณ 100%)
========================================================= */
async function pushFlexResult({
  userId,
  nsr,
  fullName,
  dateService,
  list,
  result,
  advice,
  fileURL
}) { 

  if (!userId) {
  console.log("⚠️ LINE userId not found");
  return;
}

  /* ================= RESULT TRIAGE COLOR ================= */

  let resultColor = "#2E7D32";
  let resultIcon = "🟢";

  if (result) {

    const lower = Array.isArray(result)
      ? result.join(" ").toLowerCase()
      : String(result).toLowerCase();

    if (lower.includes("ปกติ")) {
      resultColor = "#2E7D32";
      resultIcon = "🟢";
    }

    else if (lower.includes("ติดตาม") || lower.includes("เสี่ยง")) {
      resultColor = "#FF6600";
      resultIcon = "🟡";
    }

    else if (
      lower.includes("ผิดปกติ") ||
      lower.includes("พบ") ||
      lower.includes("เชื้อ")
    ) {
      resultColor = "#C62828";
      resultIcon = "🔴";
    }

  }

  /* ================= FORMAT TEXT ================= */

  const listLines = formatBullet(list || []).slice(0, 10);
  const resultLines = formatBullet(result || []).slice(0, 10);
  const adviceLines = formatBullet(advice || []).slice(0, 10);

  /* ================= FLEX BODY ================= */

  const contents = [

    {
      type: "text",
      text: "📋 ผลการตรวจสุขภาพ",
      weight: "bold",
      size: "xl",
      align: "center",
      color: "#1B5E20"
    },

    {
      type: "text",
      text: fullName || "-",
      align: "center",
      size: "lg",
      margin: "sm",
      color: "#0D47A1"
    },

    { type: "separator", margin: "md" },

    /* ---------- TEST LIST ---------- */

    {
      type: "text",
      text: "📄 รายการตรวจ",
      weight: "bold",
      color: "#0288D1",
      size: "lg"
    },

    { type: "separator", margin: "md" },

    ...listLines.map(t => ({
      type: "text",
      text: t,
      size: "sm",
      wrap: true
    })),

    { type: "separator", margin: "md" },

    /* ---------- SERVICE DATE ---------- */

    {
      type: "box",
      layout: "vertical",
      margin: "md",
      spacing: "xs",
      contents: [

        {
          type: "text",
          text: "📅 วันที่ตรวจ",
          weight: "bold",
          color: "#0288D1",
          size: "lg"
        },

        { type: "separator", margin: "sm" },

        {
          type: "text",
          text: dateService || "-",
          size: "sm",
          color: "#555555"
        }

      ]
    },

    { type: "separator", margin: "md" },

    /* ---------- RESULT ---------- */

    {
      type: "text",
      text: "📊 ผลตรวจ",
      weight: "bold",
      color: "#0288D1",
      size: "lg"
    },

    { type: "separator", margin: "md" },

    {
      type: "text",
      text: `${resultIcon} สรุปผล`,
      weight: "bold",
      size: "sm",
      color: resultColor
    },

    ...resultLines.map(t => ({
      type: "text",
      text: t,
      wrap: true,
      size: "sm",
      color: resultColor
    })),

    { type: "separator", margin: "md" },

    /* ---------- ADVICE ---------- */

    {
      type: "text",
      text: "💡 คำแนะนำจากพยาบาล",
      weight: "bold",
          color: "#0288D1",
          size: "lg"
    },

    { type: "separator", margin: "md" },

    ...adviceLines.map(t => ({
      type: "text",
      text: t,
      wrap: true,
      size: "sm"
    }))

  ];

  /* ================= FILE ATTACHMENT ================= */

  if (fileURL) {

    contents.push(

      { type: "separator", margin: "lg" },

      {
        type: "button",
        style: "primary",
        color: "#0288D1",
        margin: "md",
        action: {
          type: "uri",
          label: "📎 เปิดไฟล์ผลตรวจ",
          uri: fileURL
        }
      }

    );

  }

  /* ================= FLEX MESSAGE ================= */

  const flex = {

    type: "flex",
    altText: "แจ้งผลการตรวจสุขภาพ",

    contents: {

      type: "bubble",
      size: "mega",

      hero: {
        type: "image",
        url: "https://drive.google.com/uc?export=view&id=1O366lb3XphBKeVv51F5nNHIOEvdEh-jI",
        size: "full",
        aspectRatio: "20:13",
        aspectMode: "cover"
      },

      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents
      },

      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [

          {
            type: "text",
            text: "กรุณากดยืนยันรับผลตรวจ\nและประเมินความพึงพอใจ\nเพื่อเป็นข้อมูลในการปรับปรุง\nบริการให้ดียิ่งขึ้น",
            align: "center",
            size: "sm",
            margin: "sm",
            color: "#0D47A1",
            wrap: true
          },

          {
            type: "button",
            style: "primary",
            color: "#2E7D32",
            action: {
              type: "message",
              label: "✅ ยืนยันรับผลแล้ว",
              text: `CONFIRM_RESULT:${nsr}`
            }
          },

          {
            type: "button",
            style: "secondary",
            color: "#F9A825",
            action: {
              type: "uri",
              label: "⭐ ประเมินความพึงพอใจ",
              uri: "https://liff.line.me/2007902507-7OKhdnNW?nsr=" + nsr
            }
          }

        ]
      }

    }

  };

  /* ================= PUSH ================= */
  let pushSuccess = false;

  try {

  if (!client || !client.pushMessage) {
  console.error("❌ LINE client.pushMessage missing");
  return;
}

pushSuccess = await safePush(userId, flex)

if (!pushSuccess) {
  console.log("⚠️ pushFlexResult skipped:", userId)
  return
}

console.log("✅ pushFlexResult sent:", userId)

} catch (err) {

  const msg = String(err.response?.data?.message || err.message);

  if (msg.includes("not a friend")) {
    console.log("⚠️ user not follow bot:", userId);
    return;
  }

  if (msg.includes("blocked")) {
    console.log("⚠️ user blocked bot:", userId);
    return;
  }

  console.error("❌ pushFlexResult error:", msg);

}

  /* 🔧 FIX สำคัญ — บันทึกว่า LINE ส่งผลแล้ว */

  if (nsr && pushSuccess) {
  try {

    await nursingService.markLineSent(nsr);
      
    console.log("✅ LineSent updated:", nsr);

    } catch (err) {

      console.error("❌ markLineSent failed:", err);

    }

  }

};

async function getProfile(userId) {

  if (!userId) {
    console.log("⚠️ getProfile: missing userId");
    return {};
  }

  try {

    const profile = await client.getProfile(userId);

    console.log("✅ getProfile success:", profile);

    return profile;

  } catch (err) {

    const msg = err.response?.data || err.message;

    console.error("❌ getProfile error:", msg);

    return {};

  }

}

/* =========================================================
   🔥 FIX จริง (ไม่ตัดอะไรเลย เพิ่มแค่นี้)
========================================================= */
module.exports = {
  safePush,
  pushFlexResult,
  getProfile
};