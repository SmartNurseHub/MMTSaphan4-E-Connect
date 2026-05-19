/*****************************************************************
 * FOLLOW LIST ROUTES MODULE (FINAL)
 * NurseStationHub
 *
 * หน้าที่:
 * - เชื่อม request ไปยัง controller followList
 * - รองรับ GET / (list follow)
 *****************************************************************/

const express = require("express");
const router = express.Router();

// 🔹 import controller
let controller;
try {
  controller = require("./followList.controller");
  if (!controller || typeof controller.getFollowList !== "function") {
    throw new Error("Controller missing getFollowList function");
  }
} catch (err) {
  console.error("❌ Failed to load followList.controller:", err.message);
  controller = {
    getFollowList: (req, res) => res.status(500).json({
      success: false,
      message: "FollowList controller not available"
    })
  };
}

// ==============================
// ROUTES
// ==============================

/**
 * GET /
 * ดึงรายการ Follow ทั้งหมด
 */
router.get("/", controller.getFollowList);

// 🌐 export router แบบ safe
module.exports = router;