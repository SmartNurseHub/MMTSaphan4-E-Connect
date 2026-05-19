/******************************************************************
 * NURSING RECORDS CONTROLLER MODULE
 * NurseStationHub
 *
 * ---------------------------------------------------------------
 * หน้าที่:
 * - รับ request จาก client (API)
 * - ส่งต่อไปยัง service layer
 * - จัดการ response / error
 *
 * ---------------------------------------------------------------
 * ENDPOINTS:
 *
 * [READ]
 * - GET    /api/nursingRecords
 * - GET    /api/nursingRecords/next-nsr
 *
 * [CREATE]
 * - POST   /api/nursingRecords
 *
 * [UPDATE]
 * - PUT    /api/nursingRecords/:nsr
 *
 * [DELETE]
 * - DELETE /api/nursingRecords/:nsr   (Soft Delete)
 *
 * ---------------------------------------------------------------
 * FLOW:
 * Client → Controller → Service → Google Sheet
 *****************************************************************/


/* =========================================================
   IMPORT SERVICE
========================================================= */

const service = require("./nursingRecords.service");


/* =========================================================
   READ
========================================================= */

/**
 * GET ALL NURSING RECORDS
 */
exports.getAll = async (req, res) => {

  try {

    const records = await service.getAll();

    res.json({
      data: records
    });

  } catch (err) {

    console.error("❌ getAll error:", err);

    res.status(500).json({
      message: "Failed to load nursing records"
    });

  }

};


/**
 * GET NEXT NSR (Auto Running Number)
 */
exports.getNextNSR = async (req, res) => {

  try {

    const nsr = await service.getNextNSR();

    res.json({
      nsr
    });

  } catch (err) {

    console.error("❌ getNextNSR error:", err);

    res.status(500).json({
      message: "Failed to generate NSR"
    });

  }

};


/* =========================================================
   CREATE
========================================================= */

/**
 * CREATE NURSING RECORD
 */
exports.save = async (req, res) => {

  try {

    if (!req.body.NSR) {

      return res.status(400).json({
        message: "NSR is required"
      });

    }

    await service.save(req.body);

    res.json({
      success: true
    });

  } catch (err) {

    console.error("❌ save error:", err);

    res.status(500).json({
      message: "Failed to save nursing record"
    });

  }

};


/* =========================================================
   UPDATE
========================================================= */

/**
 * UPDATE NURSING RECORD BY NSR
 */
exports.update = async (req, res) => {

  try {

    const { nsr } = req.params;

    if (!nsr) {

      return res.status(400).json({
        message: "NSR is required"
      });

    }

    await service.updateByNSR(nsr, req.body);

    res.json({
      success: true
    });

  } catch (err) {

    console.error("❌ update error:", err);

    res.status(500).json({
      message: "Failed to update nursing record"
    });

  }

};


/* =========================================================
   DELETE (SOFT DELETE)
========================================================= */

/**
 * SOFT DELETE NURSING RECORD
 */
exports.delete = async (req, res) => {

  try {

    const { nsr } = req.params;

    console.log("🔥 DELETE API HIT", nsr);

    await service.softDeleteByNSR(nsr, "SYSTEM");

    res.json({
      success: true
    });

  } catch (err) {

    console.error("❌ DELETE error:", err);

    res.status(500).json({
      message: "Delete failed"
    });

  }

};