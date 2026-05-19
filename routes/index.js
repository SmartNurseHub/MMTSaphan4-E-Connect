/*****************************************************************
 * routes/index.js (FINAL VERSION)
 * NurseStationHub API
 *
 * แนวคิด:
 * - ศูนย์กลางรวมทุก Route ของระบบ
 * - ใช้ safe loader ป้องกัน server crash ถ้า module ใดพัง
 * - แยกโครงสร้าง module ชัดเจน
 *****************************************************************/

const express = require("express");
const router = express.Router();

/*****************************************************************
 * MODULE: HEALTH CHECK
 *****************************************************************/
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "NurseStationHub API",
    time: new Date().toISOString()
  });
});

/*****************************************************************
 * MODULE: SAFE ROUTE LOADER
 *****************************************************************/
function safeUse(path, modulePath, name) {
  try {
    router.use(path, require(modulePath));
    console.log(`✅ ${name} routes loaded`);
  } catch (err) {
    console.error(`❌ ${name} routes FAILED`);
    console.error(err.message);
  }
}

/*****************************************************************
 * MODULE: CORE ROUTES REGISTRATION
 *****************************************************************/

// Dashboard
safeUse("/dashboard", "../modules/dashboard/dashboard.routes", "Dashboard");

// Patients
safeUse("/patients", "../modules/patients/patients.routes", "Patients");

// Upload
safeUse("/upload", "../modules/upload/upload.routes", "Upload");

// Appointments
safeUse("/appointments", "../modules/appointments/appointments.routes", "Appointments");

// Nursing Records
safeUse("/nursingRecords", "../modules/nursingRecords/nursingRecords.routes", "NursingRecords");

// LineOA
safeUse("/lineOA", "../modules/lineOA/lineOA.routes", "LineOA");
safeUse("/line", "../modules/lineOA/lineOA.routes", "LineOA(alias)");

// FollowList
safeUse("/followlist", "../modules/followList/followList.routes", "FollowList");

// LineUID (case-sensitive path)
const lineUIDRoutes = require("../modules/lineUID/lineUID.routes");
router.use("/lineuid", lineUIDRoutes);

console.log("🔥 LineUID ROUTE LOADED");

// Vaccination
safeUse("/vaccination", "../modules/vaccination/vaccination.routes", "Vaccination");

// Satisfaction Survey
safeUse("/satisfaction-survey", "../modules/satisfactionSurvey/satisfactionSurvey.routes", "SatisfactionSurvey");

router.use("/inventory", require("../modules/inventory/inventory.routes"));
/*****************************************************************
 * MODULE: DIRECT IMPORT (SPECIAL CASE)
 * - ใช้ในกรณีต้องการ reference vaccination routes โดยตรง
 *****************************************************************/
const vaccinationRoutes = require("../modules/vaccination/vaccination.routes");
router.use("/vaccination", vaccinationRoutes);

/*****************************************************************
 * MODULE: FOLLOWLIST DELETE API (SAFE ENDPOINT)
 *****************************************************************/
router.post("/followlist/delete", async (req, res) => {
  try {
    const { userId, date } = req.body;

    if (!userId || !date) {
      return res.status(400).json({
        success: false,
        message: "Missing userId or date"
      });
    }

    // TODO: implement actual delete logic if needed

    return res.json({ success: true });

  } catch (err) {
    console.error("Delete follow error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

const path = require("path");


/*****************************************************************
 * EXPORT ROUTER
 *****************************************************************/
module.exports = router;