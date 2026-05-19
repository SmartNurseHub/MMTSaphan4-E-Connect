const express = require("express");
const router = express.Router();

const controller = require("./vaccination.controller");
const upload = require("../../../middleware/upload");

/* =========================================================
   VACCINE MASTER
========================================================= */

router.get("/master", controller.getVaccineMaster);

router.post("/master", controller.saveVaccineMaster);

router.post("/master/bulk", controller.saveBulkVaccineMaster);


/* =========================================================
   VACCINATION TRANSACTION
========================================================= */

router.post("/add", controller.addVaccination);

router.delete("/delete/:vcn", controller.deleteVaccination);


/* =========================================================
   INVENTORY
========================================================= */

router.post("/inventory/create", controller.createInventory);

router.get("/inventory/master", controller.getInventoryMaster);

router.get("/inventory", controller.getInventory);

router.get("/inventory", controller.getVaccineInventory);

router.get("/inventory/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const data = await db.findInventory(id);

    if (!data) {
      return res.status(404).json({
        success: false,
        error: "NOT FOUND",
      });
    }

    return res.json({
      success: true,
      data,
    });

  } catch (err) {
    console.error("inventory/:id error:", err);

    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});


/* =========================================================
   TIMELINE / HISTORY
========================================================= */

router.get("/timeline/:cid", controller.getVaccinationTimeline);

router.get("/latest/:cid", controller.getLatestVaccines);

router.get("/history/:cid", controller.getVaccinationHistory);

router.get("/history-secure/:cid/:lineUID", controller.historySecure);

router.post(
  "/his/upload",
  upload.single("file"),
  controller.uploadHISZip
);


/* =========================================================
   DASHBOARD / SCHEDULE
========================================================= */

router.get("/dashboard", controller.getDashboard);

router.get("/schedule", controller.getSchedule);

router.get("/next-vcn", controller.getNextVCN);

router.get("/appointments/:cid", controller.getAppointments);


/* =========================================================
   HIS IMPORT (INLINE HANDLER)
========================================================= */

router.post(
  "/his-import",
  upload.single("file"),
  async (req, res) => {
    try {
      const zipPath = req.file.path;

      // TODO: parse zip here

      return res.json({
        success: true,
        data: {
          file: req.file.originalname,
        },
      });

    } catch (err) {
      console.error(err);

      return res.json({
        success: false,
        error: err.message,
      });
    }
  }
);


/* =========================================================
   LINE NOTIFICATION
========================================================= */

router.post("/send-line/:vcn", controller.sendLineByButton);


module.exports = router;