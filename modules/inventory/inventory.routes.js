const express = require("express");
const router = express.Router();

const ctrl = require("./inventory.controller");

/* ===============================
   UI
================================ */
router.get("/", (req, res) => {
  res.sendFile(__dirname + "/inventory.view.html");
});

/* ===============================
   MASTER
================================ */
router.get("/master", ctrl.getMaster);
router.post("/master", ctrl.saveMaster);

/* ===============================
   MOVEMENT
================================ */
router.get("/movement", ctrl.getMovement);
router.post("/movement", ctrl.saveMovement);

module.exports = router;