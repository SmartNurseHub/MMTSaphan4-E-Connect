/*****************************************************************
 * server.js — NurseStationHub (PRODUCTION FIXED LINE WEBHOOK)
 *****************************************************************/

require("module-alias/register");
require("dotenv").config();

require("./jobs/reminder.job");

const express = require("express");
const path = require("path");
const line = require("@line/bot-sdk");

const app = express();
const PORT = process.env.PORT || 4000;

/* =========================
   LINE CONFIG
========================= */
const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const lineMiddleware = line.middleware(lineConfig);

/* =========================
   IMPORTANT: BODY PARSER FIX
   (กัน LINE signature fail)
========================= */
app.use((req, res, next) => {
  if (req.path === "/webhook") return next();

  express.json({ limit: "5mb" })(req, res, next);
});

app.use(express.urlencoded({ extended: true, limit: "5mb" }));

/* =========================
   STATIC
========================= */
app.use(express.static(path.join(__dirname, "public")));
app.use("/modules", express.static(path.join(__dirname, "modules")));
app.use("/views", express.static(path.join(__dirname, "views")));

/* =========================
   API
========================= */
app.use("/api", require("./routes"));

/* =========================
   LEGACY COMPATIBILITY
========================= */
app.use("/api/patient", (req, res, next) => {
  req.url = req.url.replace("/patient", "/patients");
  req.originalUrl = req.originalUrl.replace("/patient", "/patients");
  next();
});

/* =========================
   TEST ROUTE
========================= */
app.get("/test-reminder", async (req, res) => {
  try {
    const { runReminderJob } = require("./modules/vaccination/server/vaccination.reminder.service");
    await runReminderJob();
    res.send("✅ Reminder job executed");
  } catch (err) {
    console.error(err);
    res.status(500).send("error");
  }
});

/* =========================
   LINE CLIENT
========================= */
const client = new line.Client(lineConfig);

/* =========================
   LINE WEBHOOK (FIXED)
========================= */
app.post("/webhook", lineMiddleware, async (req, res) => {
  try {
    console.log("🔥 LINE WEBHOOK HIT");

    const events = req.body.events;

    if (!events || events.length === 0) {
      return res.sendStatus(200);
    }

    for (const event of events) {
      console.log("📩 Event:", event.type);

      if (event.type === "message" && event.message.type === "text") {
        await handleText(event);
      }
    }

    return res.sendStatus(200);
  } catch (err) {
    console.error("❌ Webhook error:", err);

    // สำคัญ: LINE ต้องได้ 200 เสมอ
    return res.sendStatus(200);
  }
});

/* =========================
   MESSAGE HANDLER
========================= */
async function handleText(event) {
  try {
    const text = event.message.text;

    await client.replyMessage(event.replyToken, {
      type: "text",
      text: `📌 คุณพิมพ์ว่า: ${text}`,
    });
  } catch (err) {
    console.error("❌ Reply error:", err);
  }
}

/* =========================
   SPA FALLBACK
========================= */
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "index.html"));
});

/* =========================
   START SERVER
========================= */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});