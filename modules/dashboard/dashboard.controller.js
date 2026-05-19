/*****************************************************************
 * dashboard.controller.js (FINAL STABLE VERSION)
 *****************************************************************/

const dashboardService = require("./dashboard.service");
const lineUIDService = require("../lineUID/lineUID.service");
/*****************************************************************
 * DASHBOARD SUMMARY
 *****************************************************************/
async function getDashboardSummary(req, res) {
  try {
    const summary = await dashboardService.getDashboardSummary();
    res.json({ success: true, data: summary });
  } catch (err) {
    console.error("dashboard summary error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

/*****************************************************************
 * FOLLOW LIST
 *****************************************************************/
async function getFollowList(req, res) {
  try {
    const data = await dashboardService.getFollowListService();
    res.json({ success: true, data });
  } catch (err) {
    console.error("follow list error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

/*****************************************************************
 * UPDATE FOLLOW
 *****************************************************************/
async function updateFollow(req, res) {
  try {
    const { userId, fullName, cid } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId required"
      });
    }

    if (cid && cid.length !== 13) {
      return res.status(400).json({
        success: false,
        message: "CID must be 13 digits"
      });
    }

    await dashboardService.updateFollowService(userId, fullName, cid);

    res.json({
      success: true,
      message: "Updated successfully"
    });

  } catch (err) {
    console.error("update follow error:", err);

    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
}


/*****************************************************************
 * DELETE FOLLOW (FIX: BY rowIndex)
 *****************************************************************/
async function deleteFollowByCid(req, res) {
  try {

    const rowIndex = parseInt(req.params.rowIndex);

    if (!rowIndex || rowIndex < 2) {
      return res.status(400).json({
        success: false,
        message: "Invalid rowIndex"
      });
    }

    await lineUIDService.deleteLineUID(rowIndex);

    res.json({
      success: true,
      message: "Deleted successfully"
    });

  } catch (err) {
    console.error("delete error:", err);

    res.status(500).json({
      success: false,
      message: err.message || "Internal server error"
    });
  }
}

/*****************************************************************
 * EXPORT
 *****************************************************************/
module.exports = {
  getDashboardSummary,
  getFollowList,
  updateFollow,
  deleteFollowByCid
};