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

          // เช็คก่อน save
          const exists =
            await findLineUser(userId);

          // ---------------------------------
          // USER EXISTS
          // ---------------------------------

          if (exists.found) {

            console.log(
              "FOLLOW USER EXISTS"
            );

            return;
          }

          // ---------------------------------
          // NEW FOLLOW USER
          // ---------------------------------

          const profile =
            await lineClient.getProfile(userId);

          await addLineUID({
            userId,
            displayName:
              profile.displayName || "",
            pictureUrl:
              profile.pictureUrl || "",
            status: "PENDING_CID"
          });

          console.log(
            "NEW FOLLOW USER SAVED"
          );

          await lineClient.replyMessage(
            event.replyToken,
            {
              type: "text",
              text:
                "ขอบคุณที่เพิ่มเพื่อน 🙏\nกรุณาพิมพ์ 'ลงทะเบียน'"
            }
          );

        }

        // =================================================
        // MESSAGE EVENT
        // =================================================

        if (event.type === "message") {

          const userId =
            event.source?.userId;

          const text =
            (event.message?.text || "").trim();

          console.log("UID:", userId);

          console.log("TEXT:", text);

          // =============================================
          // REGISTRATION STATE MACHINE
          // =============================================

          const handled =
            await handleRegistrationFlow(
              lineClient,
              userId,
              text,
              event.replyToken
            );

          if (handled) {

            console.log(
              "STATE MACHINE HANDLED"
            );

            return;
          }

          // =============================================
          // REGISTER COMMAND
          // =============================================

          if (text === "ลงทะเบียน") {

            console.log("REGISTER FLOW");

            const exists =
              await findLineUser(userId);

            // =========================================
            // USER EXISTS
            // =========================================

            if (exists.found) {

              const status =
                exists.data?.status || "";

              console.log(
                "USER STATUS:",
                status
              );

              // ---------------------------------------
              // PENDING_CID
              // ---------------------------------------

              if (
                status === "PENDING_CID"
              ) {

                await lineClient.replyMessage(
                  event.replyToken,
                  {
                    type: "text",
                    text:
                      "กรุณากรอกเลขบัตรประชาชน 13 หลัก"
                  }
                );

                return;
              }

              // ---------------------------------------
              // ACTIVE
              // ---------------------------------------

              if (status === "ACTIVE") {

                await lineClient.replyMessage(
                  event.replyToken,
                  {
                    type: "text",
                    text:
                      "ท่านลงทะเบียนเรียบร้อยแล้ว ✅"
                  }
                );

                return;
              }

            }

            // =========================================
            // OLD USER NOT FOUND IN SHEET
            // =========================================

            const profile =
              await lineClient.getProfile(userId);

            await addLineUID({
              userId,
              displayName:
                profile.displayName || "",
              pictureUrl:
                profile.pictureUrl || "",
              status: "PENDING_CID"
            });

            console.log(
              "OLD USER SAVED"
            );

            await lineClient.replyMessage(
              event.replyToken,
              {
                type: "text",
                text:
                  "กรุณากรอกเลขบัตรประชาชน 13 หลัก"
              }
            );

          }

        }

        // =================================================
        // POSTBACK EVENT
        // =================================================

        if (event.type === "postback") {

          const data =
            event.postback?.data;

          console.log(
            "📌 postback:",
            data
          );

          // =============================================
          // CONFIRM VACCINE
          // =============================================

          if (
            data?.startsWith(
              "CONFIRM_VACCINE"
            )
          ) {

            const vcn =
              data.split(":")[1];

            sendLineVaccine(vcn)
              .catch(err => {

                console.error(
                  "sendLineVaccine error:",
                  err
                );

              });

          }

        }

      } catch (eventErr) {

        console.error(
          "EVENT ERROR:",
          eventErr
        );

      }

    }

  } catch (err) {

    console.error(
      "❌ WEBHOOK ERROR:",
      err
    );

  }

}

// =====================================================
// EXPORT
// =====================================================

module.exports = {
  handleWebhook
};