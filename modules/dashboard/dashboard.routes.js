const express = require("express");
const router = express.Router();

const {
  getDashboardSummary,
  getFollowList,
  updateFollow,
  deleteFollowByCid
} = require("./dashboard.controller");

/* ===============================
   SUMMARY
================================ */
router.get("/summary", getDashboardSummary);

/* ===============================
   LINE UID
================================ */
router.get("/lineuid", getFollowList);
router.post("/lineuid/update", updateFollow);
router.delete("/lineuid/delete/:rowIndex", deleteFollowByCid);

module.exports = router;