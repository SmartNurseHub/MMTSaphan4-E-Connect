const express = require("express");
const router = express.Router();
const controller = require("./satisfactionSurvey.controller");

/* =========================================================
   SURVEY ROUTES
========================================================= */

// 🔹 Render survey page
router.get("/", controller.renderSurvey);

// 🔹 Submit survey data
router.post("/submit", controller.submitSurvey);

module.exports = router;