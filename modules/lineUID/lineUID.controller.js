/*****************************************************************
 * LINE UID CONTROLLER MODULE (FIXED: DELETE BY rowIndex)
 *****************************************************************/

const service = require("./lineUID.service");

/* =========================================================
   GET
========================================================= */
exports.getLineUID = async (req, res) => {
  try {
    const data = await service.getLineUIDList();

    res.json({
      success: true,
      data
    });

  } catch (err) {
    console.error("LineUID load error:", err);

    res.status(500).json({
      success: false,
      message: "Failed to load LineUID"
    });
  }
};


/* =========================================================
   ADD
========================================================= */
exports.addLineUID = async (req, res) => {
  try {
    await service.addLineUID(req.body);

    res.json({
      success: true
    });

  } catch (err) {
    console.error("LineUID save error:", err);

    res.status(500).json({
      success: false,
      message: "Failed to save LineUID"
    });
  }
};


/* =========================================================
   DELETE (FIXED)
========================================================= */
exports.deleteLineUID = async (req, res) => {

  try {

    const rowIndex = parseInt(req.params.rowIndex);

    if (!rowIndex || rowIndex < 2) {
      return res.status(400).json({
        success: false,
        message: "Invalid rowIndex"
      });
    }

    await service.deleteLineUID(rowIndex);

    res.json({
      success: true
    });

  } catch (err) {

    console.error("Delete error:", err);

    res.status(500).json({
      success: false
    });

  }

};