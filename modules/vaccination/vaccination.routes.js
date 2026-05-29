/******************************************************************
 * VACCINATION ROUTES
 * เส้นทาง API สำหรับระบบ Vaccination
 ******************************************************************/

const express = require("express");
const router = express.Router();
const controller = require("./vaccination.controller");

/* =======================================================
   TIMELINE, LATEST, HISTORY
======================================================= */
router.get("/timeline/:cid", controller.timeline);      // ประวัติ timeline ของผู้ป่วย
router.get("/latest/:cid", controller.latest);          // วัคซีนล่าสุด
router.get("/history/:cid", controller.history);        // ประวัติการฉีดทั้งหมด (secure / public)

/* =======================================================
   VACCINE MASTER & NEXT VCN
======================================================= */
router.get("/master", controller.getVaccineMaster);     // รายการวัคซีนทั้งหมด
router.get("/next-vcn", controller.getNextVCN);         // เลข VCN ถัดไปสำหรับการฉีด

/* =======================================================
   ADD / DELETE / SEND
======================================================= */
router.post("/add", controller.addVaccination);         // เพิ่มรายการวัคซีนใหม่
router.delete("/delete/:vcn", controller.deleteVaccination); // ลบรายการวัคซีน (แก้ตรงนี้)
router.post("/send-line/:vcn", controller.sendLineVaccine);   // ส่งข้อมูลไป LINE

/* =======================================================
   SECURE HISTORY FOR LINE
======================================================= */
router.get("/history-secure/:cid/:lineUID", controller.historySecure); // ประวัติ secure ผ่าน LINE UID

module.exports = router;