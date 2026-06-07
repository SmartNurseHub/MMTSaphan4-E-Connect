require("module-alias/register");
require("dotenv").config();

const express = require("express");
const path = require("path");

const app = express(); // ❗ ต้องมีแค่ตัวเดียว
const PORT = process.env.PORT || 7000;

/* =========================
   IMPORT SERVICES
========================= */
const { runReminderJob } =
  require("./modules/vaccination/vaccination.reminder.service");

const { handleWebhook } = require("./modules/webhook/webhook.service");
/* =========================
   MIDDLEWARE
========================= */
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

/* =========================
   STATIC FILES
========================= */
app.use(express.static(path.join(__dirname, "public")));
app.use("/modules", express.static(path.join(__dirname, "modules")));
app.use("/views", express.static(path.join(__dirname, "views")));

/* =========================
   ROUTES
========================= */
app.use("/api", require("./routes"));

app.use("/api/patient", require("./modules/patients/patients.routes"));
app.use("/api/vaccination", require("./modules/vaccination/vaccination.routes"));
app.use("/api/inventory", require("./modules/inventory/inventory.routes"));
app.use("/satisfaction-survey", require("./modules/satisfactionSurvey/satisfactionSurvey.routes"));
app.use("/lineoa", require("./modules/lineOA/lineOA.routes"));
app.use("/lineuid", require("./modules/lineUID/lineUID.routes"));
app.use("/followlist", require("./modules/followList/followList.routes"));

/* =========================
   TEST ROUTE
========================= */
app.get("/test-reminder", async (req, res) => {
  try {
    await runReminderJob();
    res.send("✅ Reminder job executed");
  } catch (err) {
    console.error(err);
    res.status(500).send("error");
  }
});

/* =========================
   ✅ WEBHOOK (FIXED)
   - ต้องตอบทันที
   - ไม่ block event loop
========================= */
const line = require("@line/bot-sdk");

const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

app.post(
  "/webhook",
  line.middleware(lineConfig),
  async (req, res) => {

    res.sendStatus(200);

    handleWebhook(req.body)
      .catch(err => console.error("WEBHOOK:", err));

  }
);


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