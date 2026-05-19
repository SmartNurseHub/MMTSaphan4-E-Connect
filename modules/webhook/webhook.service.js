const { saveVaccination } = require("../vaccination/vaccination.service");
const { sendLineVaccine } = require("../vaccination/vaccination.service");

/**
 * MAIN WEBHOOK HANDLER
 * - รับ event จาก LINE
 * - ไม่ block response
 */
async function handleWebhook(body) {
  try {
    console.log("📩 WEBHOOK EVENT:", JSON.stringify(body, null, 2));

    const events = body?.events || [];

    for (const event of events) {

      // =========================
      // MESSAGE EVENT
      // =========================
      if (event.type === "message") {
        console.log("💬 message event:", event.message?.text);
      }

      // =========================
      // POSTBACK EVENT
      // =========================
      if (event.type === "postback") {
        const data = event.postback?.data;

        console.log("📌 postback:", data);

        // ตัวอย่าง: ยืนยันวัคซีน
        if (data?.startsWith("CONFIRM_VACCINE")) {
          const vcn = data.split(":")[1];

          setImmediate(() => {
  sendLineVaccine(vcn).catch(err => {
    console.error("sendLineVaccine error:", err);
  });
});
        }
      }
    }

  } catch (err) {
    console.error("❌ WEBHOOK ERROR:", err);
  }
}

module.exports = {
  handleWebhook
};