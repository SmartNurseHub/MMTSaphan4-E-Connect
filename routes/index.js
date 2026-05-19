/*****************************************************************
 * routes/index.js — FIXED CLEAN VERSION
 *****************************************************************/

const express = require("express");
const router = express.Router();

/* =========================
   HEALTH CHECK
========================= */
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "NurseStationHub API",
    time: new Date().toISOString()
  });
});

/* =========================
   SAFE LOADER
========================= */
function safeUse(path, modulePath, name) {

  try {

    router.use(path, require(modulePath));
    console.log(`✅ ${name} routes loaded`);

  } catch (err) {

    console.error(`❌ ${name} routes FAILED`);
    console.error(err.message);

  }

}

/* =========================
   MODULE ROUTES (STANDARDIZED)
========================= */

safeUse("/dashboard", "../modules/dashboard/dashboard.routes", "Dashboard");
safeUse("/patients", "../modules/patients/patients.routes", "Patients");   // ✅ MAIN FIX
safeUse("/upload", "../modules/upload/upload.routes", "Upload");
safeUse("/appointments", "../modules/appointments/appointments.routes", "Appointments");
safeUse("/nursingRecords", "../modules/nursingRecords/nursingRecords.routes", "NursingRecords");

safeUse("/lineOA", "../modules/lineOA/lineOA.routes", "LineOA");
safeUse("/line", "../modules/lineOA/lineOA.routes", "LineOA(alias)");

safeUse("/followlist", "../modules/followList/followList.routes", "FollowList");

safeUse("/vaccination", "../modules/vaccination/server/vaccination.routes", "Vaccination");

safeUse("/inventory", "../modules/inventory/inventory.routes", "Inventory");

safeUse("/satisfaction-survey", "../modules/satisfactionSurvey/satisfactionSurvey.routes", "SatisfactionSurvey");

/* =========================
   FOLLOW DELETE (TEMP)
========================= */
router.post("/followlist/delete", async (req, res) => {

  const { userId, date } = req.body;

  if (!userId || !date) {
    return res.status(400).json({
      success: false,
      message: "Missing userId or date"
    });
  }

  return res.json({ success: true });

});

/* =========================
   404 FALLBACK
========================= */
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found"
  });
});

module.exports = router;