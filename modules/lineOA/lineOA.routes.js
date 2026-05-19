/*****************************************************************
 * LINE OA ROUTES MODULE
 * NurseStationHub
 *
 * ---------------------------------------------------------------
 * หน้าที่:
 * - กำหนด API endpoints สำหรับ LINE OA
 * - เชื่อมต่อ request → controller
 *
 * ---------------------------------------------------------------
 * ROUTE GROUP:
 *
 * [WEBHOOK]
 * - POST /webhook
 *
 * [REPORT]
 * - POST /send-result
 * - POST /sendReport
 *
 * [DATA]
 * - GET /follows
 * - GET /messages
 *
 * [SYSTEM]
 * - GET /health
 *
 * ---------------------------------------------------------------
 * FLOW:
 * Client / LINE → Routes → Controller → Service
 *****************************************************************/


/* =========================================================
   IMPORTS
========================================================= */

const express = require("express");
const router = express.Router();

const controller = require("./lineOA.controller");


/* =========================================================
   LINE WEBHOOK
========================================================= */

/**
 * @route   POST /webhook
 * @desc    รับ event จาก LINE Messaging API
 */
router.post("/webhook", controller.handleWebhook);


/* =========================================================
   REPORT APIs
========================================================= */

/**
 * @route   POST /send-result
 * @desc    ส่งผลตรวจ (ใช้ NSR จาก body)
 */
router.post("/send-result", controller.sendResultByNSR);

/**
 * @route   POST /sendReport
 * @desc    (alias) ส่งผลตรวจ
 */
router.post("/sendReport", controller.sendResultByNSR);


/* =========================================================
   DATA APIs
========================================================= */

/**
 * @route   GET /follows
 * @desc    ดึงรายการผู้ติดตาม
 */
router.get("/follows", controller.getFollowList);

/**
 * @route   GET /messages
 * @desc    ดึง chat log
 */
router.get("/messages", controller.getUserMessages);


/* =========================================================
   SYSTEM
========================================================= */

/**
 * @route   GET /health
 * @desc    ตรวจสอบสถานะ service
 */
router.get("/health", (req, res) => {
  res.json({ status: "LINE OA OK" });
});


/* =========================================================
   EXPORT
========================================================= */

module.exports = router;