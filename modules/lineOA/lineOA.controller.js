/* =========================================================
   IMPORTS
========================================================= */
const service = require("./lineOA.service");
const { readRows,appendRow} = require("@config/google")
const { FOLLOW_SHEET, USER_SHEET } = require("./lineOA.schema");
const registrationService = require("./lineOA.registration.service");
const { formatBullet, buildFlex } = require("../../utils/flexBuilder");
/* =========================================================
   LINE WEBHOOK ENTRY POINT
========================================================= */
exports.handleWebhook = (req, res) => {
  console.log("📩 WEBHOOK HIT:", JSON.stringify(req.body));
  // ตอบ LINE ทันที (กัน timeout)
  res.status(200).send("OK");
  // ทำงานต่อแบบ async background
  setImmediate(async () => {
    try {const events = req.body.events || [];
      if (!events.length) {console.log("No events");return;}
      for (const event of events) {
        console.log("📦 EVENT TYPE:", event.type);
        if (!event) continue;
        try {
          /* ================= FOLLOW ================= */
          if (event.type === "follow") {
            console.log("➡️ CALL handleFollowEvent");
            await service.handleFollowEvent(event);}
          /* ================= UNFOLLOW ================= */
          if (event.type === "unfollow") {
            console.log("UNFOLLOW USER:", event.source?.userId);
            await service.handleUnfollowEvent(event);}
          /* ================= MESSAGE ================= */
          if (event.type === "message" && event.message?.type === "text") {
            const userId = event.source?.userId;
            const text = event.message.text;
            const replyToken = event.replyToken;
            console.log("USER:", userId);
            console.log("MESSAGE:", text);
            try {
              /* ---------- REGISTRATION FLOW ---------- */
              const handled = await registrationService.handleRegistrationFlow(
                service.lineClient,
                userId,
                text,
                replyToken
              );
              if (handled) {
                console.log("Registration handled");
                continue;
              }

              /* ---------- NORMAL CHAT ---------- */

              await service.handleChatMessage(event);

            } catch (err) {

              console.error("Message handling error:", err);

            }

          }

          /* ================= POSTBACK ================= */

          if (event.type === "postback") {

            const data = event.postback?.data;

            console.log("POSTBACK:", data);

            if (data?.startsWith("CONFIRM_RESULT:")) {

              const nsr = data.replace("CONFIRM_RESULT:", "");

              await service.handleChatMessage({
                type: "postback",
                postback: { data },
                source: event.source,
                replyToken: event.replyToken
              });

            }

          }

        } catch (err) {

          console.error("EVENT ERROR:", err);

        }

      }

    } catch (err) {

      console.error("Webhook background error:", err);

    }

  });

};


/* =========================================================
   FOLLOW / UNFOLLOW HANDLER
========================================================= */

/**
 * HANDLE UNFOLLOW EVENT
 */
exports.handleUnfollowEvent = async (event) => {

  try {

    const userId = event.source.userId;

    await appendRow(FOLLOW_SHEET, [
      new Date().toISOString(),
      "unfollow",
      userId,
      "",
      "",
      ""
    ]);

    console.log("User unfollow:", userId);

  } catch (err) {

    console.error("handleUnfollowEvent error:", err);

  }

};


/* =========================================================
   REPORT / RESULT API
========================================================= */

/**
 * SEND RESULT BY NSR
 */
exports.sendResultByNSR = async (req, res) => {

  try {

    const { nsr } = req.body;

    if (!nsr) {

      return res.status(400).json({
        success: false,
        message: "NSR is required"
      });

    }

    await service.sendReport(nsr);

    res.json({ success: true });

  } catch (err) {

    console.error("sendResultByNSR error:", err.message);

    res.status(500).json({
      success: false,
      message: err.message
    });

  }

};


/* =========================================================
   DATA QUERY APIs
========================================================= */

/**
 * READ FOLLOW LIST
 */
exports.getFollowList = async (req, res) => {

  try {

    const rows = await readRows(FOLLOW_SHEET);

    res.json({ data: rows });

  } catch (err) {

    res.status(500).json({ error: err.message });

  }

};


/**
 * READ USER CHAT LOG
 */
exports.getUserMessages = async (req, res) => {

  try {

    const rows = await readRows(USER_SHEET);

    res.json({ data: rows });

  } catch (err) {

    res.status(500).json({ error: err.message });

  }

};