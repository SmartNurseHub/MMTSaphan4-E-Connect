/*****************************************************************
 * appointments.routes.js (RE-ORGANIZED VERSION)
 *
 * แนวคิด:
 * - ใช้สำหรับจัดการ route ของ appointments
 * - ปัจจุบันมี endpoint สำหรับ health check
 *****************************************************************/

const express = require("express");
const router = express.Router();


/*****************************************************************
 * MODULE: HEALTH CHECK
 * หน้าที่:
 * - ใช้ตรวจสอบว่า appointments module ทำงานปกติ
 *****************************************************************/

router.get("/health", (req, res) => {
  res.json({ status: "appointments ok" });
});


/*****************************************************************
 * MODULE: EXPORT ROUTER
 * หน้าที่:
 * - export router ให้ระบบหลักใช้งาน
 *****************************************************************/

module.exports = router;