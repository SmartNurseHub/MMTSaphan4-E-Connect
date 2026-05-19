/*************************************************
 * MODULE      : Patients Routes
 * PURPOSE     : Define API endpoints for patient operations
 * SCOPE       : Backend (Express.js)
 * CONNECTS TO : patients.controller.js
 *************************************************/

const express = require("express");
const router = express.Router();
const controller = require("./patients.controller");

/* =========================================================
   PATIENTS API ROUTES
   - List, Search, Get by CID, Import, Create
========================================================= */

/* -------------------------------
   GET /api/patients/ or /list
   - ดึงรายชื่อผู้ป่วยทั้งหมด
   - ใช้สำหรับ dropdown / list view
--------------------------------- */
router.get("/", controller.getPatientsList);
router.get("/list", controller.getPatientsList);

/* -------------------------------
   GET /api/patients/search?q=xxx
   - ค้นหาผู้ป่วยแบบ realtime (autocomplete)
   - ใช้สำหรับฟังก์ชันค้นหาที่ frontend
--------------------------------- */
router.get("/search", controller.searchPatients);

/* -------------------------------
   GET /api/patients/:cid
   - ดึงข้อมูลผู้ป่วยด้วย CID
   - ใช้โดย Vaccination / NursingRecords modules
--------------------------------- */
router.get("/:cid", controller.getPatientByCID);

/* -------------------------------
   POST /api/patients/import
   - Import / Upsert หลายรายการจากไฟล์ TXT
   - เรียกจาก patients.client.js
--------------------------------- */
router.post("/import", controller.importPatients);

/* -------------------------------
   POST /api/patients/create
   - สร้างผู้ป่วย 1 ราย (Manual Entry)
   - Google Sheet based
--------------------------------- */
router.post("/create", controller.createPatient);

module.exports = router;