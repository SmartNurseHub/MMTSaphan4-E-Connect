const express = require("express");
const router = express.Router();

const controller = require("./lineUID.controller");

console.log("🔥 lineUID.routes.js LOADED");

// GET
router.get("/", controller.getLineUID);

// POST
router.post("/save", controller.addLineUID);

// ✅ DELETE (ตัวเดียวพอ)
router.delete("/delete/:rowIndex", (req, res, next) => {
  console.log("🔥 DELETE HIT:", req.params.rowIndex);
  next();
}, controller.deleteLineUID);

module.exports = router;