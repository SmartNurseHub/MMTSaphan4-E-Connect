/*****************************************************************
 * server.js — NurseStationHub (LINE PRODUCTION FIX FINAL)
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

const client = new line.Client(lineConfig);

/* =========================
   GLOBAL BODY PARSER (SAFE)
========================= */
app.use(express.json({ limit: "5mb" }));
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
   LEGACY FIX
========================= */
app.use("/api/patient", (req, res, next) => {
  req.url = req.url.replace("/patient", "/patients");
  req.originalUrl = req.originalUrl.replace("/patient", "/patients");
  next();
});

/* =========================
   TEST
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
   LINE WEBHOOK (NO middleware version = STABLE)
========================= */
app.post("/webhook", async (req, res) => {
  try {
    console.log("🔥 WEBHOOK HIT");

    const events = req.body?.events;

    if (!events || events.length === 0) {
      return res.sendStatus(200);
    }

    for (const event of events) {
      console.log("📩 EVENT:", event.type);

      if (event.type === "message" && event.message?.type === "text") {
        const text = event.message.text;

        await client.replyMessage(event.replyToken, {
          type: "text",
          text: `📌 คุณพิมพ์ว่า: ${text}`,
        });
      }
    }

    return res.sendStatus(200);
  } catch (err) {
    console.error("❌ WEBHOOK ERROR:", err);
    return res.sendStatus(200); // สำคัญมาก LINE ต้องได้ 200 เสมอ
  }
});

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