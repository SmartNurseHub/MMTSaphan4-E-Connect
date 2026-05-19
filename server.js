/*****************************************************************
 * server.js — NurseStationHub (FIXED VERSION)
 *****************************************************************/

require("module-alias/register");
require("dotenv").config();

require("./jobs/reminder.job");

const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 4000;

/* =========================
   MIDDLEWARE
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
   API (USE CENTRAL ONLY)
========================= */
app.use("/api", require("./routes"));

/* =========================
   LEGACY COMPATIBILITY (TEMP FIX)
   👉 redirect old frontend /api/patient → /api/patients
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