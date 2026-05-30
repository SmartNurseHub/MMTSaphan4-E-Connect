const { Client } = require("@line/bot-sdk");

const {
  sendLineVaccine
} = require("../vaccination/vaccination.service");

const {
  addLineUID,
  findLineUser
} = require("../lineUID/lineUID.service");

const {
  handleRegistrationFlow
} = require("../lineOA/lineOA.registration.service");

// =====================================================
// LINE CLIENT
// =====================================================

const lineClient = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
});

// =====================================================
// SAFE REPLY
// =====================================================

async function safeReply(replyToken, msg) {
  try {
    await lineClient.replyMessage(replyToken, msg);
    return true;
  } catch (err) {
    console.error("❌ REPLY ERROR:", err?.originalError?.response?.data || err);
    return false;
  }
}

// =====================================================
// SAFE PUSH (fallback)
// =====================================================

async function safePush(userId, msg) {
  try {
    await lineClient.pushMessage(userId, msg);
    return true;
  } catch (err) {
    console.error("❌ PUSH ERROR:", err?.originalError?.response?.data || err);
    return false;
  }
}

// =====================================================
// MAIN WEBHOOK
// =====================================================

async function handleWebhook(body) {

  try {

    console.log("📩 WEBHOOK EVENT");

    const events = body?.events || [];

    for (const event of events) {

      try {

        // =================================================
        // FOLLOW EVENT
        // =================================================

        if (event.type === "follow") {

          const userId = event.source?.userId;

          console.log("NEW FOLLOW:", userId);

          const exists = await findLineUser(userId);

          if (exists.found) {

            const ok = await safeReply(event.replyToken, {
              type: "text",
              text: "ยินดีต้อนรับกลับ 🙏"
            });

            if (!ok) {
              await safePush(userId, {
                type: "text",
                text: "ยินดีต้อนรับกลับ 🙏"
              });
            }

            continue;
          }

          const profile = await lineClient.getProfile(userId);

          await addLineUID({
            userId,
            displayName: profile.displayName || "",
            pictureUrl: profile.pictureUrl || "",
            status: "PENDING_CID"
          });

          const ok = await safeReply(event.replyToken, {
            type: "text",
            text: "ขอบคุณที่เพิ่มเพื่อน 🙏\nกรุณาพิมพ์ 'ลงทะเบียน'"
          });

          if (!ok) {
            await safePush(userId, {
              type: "text",
              text: "ขอบคุณที่เพิ่มเพื่อน 🙏 กรุณาพิมพ์ 'ลงทะเบียน'"
            });
          }

          continue;
        }

        // =================================================
        // MESSAGE EVENT
        // =================================================

        if (event.type === "message") {

          const userId = event.source?.userId;
          const text = (event.message?.text || "").trim();

          console.log("UID:", userId);
          console.log("TEXT:", text);

          // =================================================
          // STATE MACHINE
          // =================================================

          let handled = false;

          try {
            handled = await handleRegistrationFlow(
              lineClient,
              userId,
              text,
              event.replyToken
            );

            console.log("REG FLOW RESULT:", handled);

          } catch (err) {
            console.error("REG FLOW ERROR:", err);

            await safeReply(event.replyToken, {
              type: "text",
              text: "ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง"
            });

            continue;
          }

          if (handled) {
            continue;
          }

          // =================================================
          // COMMAND: ลงทะเบียน
          // =================================================

          if (text === "ลงทะเบียน") {

            const exists = await findLineUser(userId);

            if (exists.found) {

              const status = exists.data?.status || "";

              if (status === "PENDING_CID") {
                await safeReply(event.replyToken, {
                  type: "text",
                  text: "กรุณากรอกเลขบัตรประชาชน 13 หลัก"
                });
                continue;
              }

              if (status === "ACTIVE") {
                await safeReply(event.replyToken, {
                  type: "text",
                  text: "ท่านลงทะเบียนเรียบร้อยแล้ว ✅"
                });
                continue;
              }
            }

            const profile = await lineClient.getProfile(userId);

            await addLineUID({
              userId,
              displayName: profile.displayName || "",
              pictureUrl: profile.pictureUrl || "",
              status: "PENDING_CID"
            });

            await safeReply(event.replyToken, {
              type: "text",
              text: "กรุณากรอกเลขบัตรประชาชน 13 หลัก"
            });

            continue;
          }

          // =================================================
          // FALLBACK (NO SILENT MODE)
          // =================================================

          const ok = await safeReply(event.replyToken, {
            type: "text",
            text: "กรุณาพิมพ์ 'ลงทะเบียน' เพื่อเริ่มใช้งาน"
          });

          if (!ok) {
            await safePush(userId, {
              type: "text",
              text: "กรุณาพิมพ์ 'ลงทะเบียน' เพื่อเริ่มใช้งาน"
            });
          }

          continue;
        }

        // =================================================
        // POSTBACK EVENT
        // =================================================

        if (event.type === "postback") {

          const data = event.postback?.data;

          console.log("📌 postback:", data);

          if (data?.startsWith("CONFIRM_VACCINE")) {

            const vcn = data.split(":")[1];

            sendLineVaccine(vcn).catch(err => {
              console.error("sendLineVaccine error:", err);
            });

          }

          continue;
        }

      } catch (eventErr) {

        console.error("EVENT ERROR:", eventErr);

        try {
          await safeReply(event.replyToken, {
            type: "text",
            text: "ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง"
          });
        } catch (e) {}
      }
    }

  } catch (err) {
    console.error("❌ WEBHOOK ERROR:", err);
  }
}

// =====================================================
// EXPORT
// =====================================================

module.exports = {
  handleWebhook
};