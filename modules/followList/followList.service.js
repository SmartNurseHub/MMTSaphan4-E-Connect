/*****************************************************************
 * followList.service.js (FINAL FIX)
 *****************************************************************/

const { readRows } = require("@config/google")

const SHEET = "FollowList";

exports.getFollowList = async () => {

  try {

    const rows = await readRows(SHEET);

    if (!rows || rows.length <= 1) return [];

    // ตัด header ออก + map object
    return rows.slice(1).map(r => ({
      timestamp: r[0] || "",
      event: r[1] || "",
      userId: r[2] || "",
      displayName: r[3] || "",
      pictureUrl: r[4] || ""
    }));

  } catch (err) {

    console.error("❌ getFollowList service:", err);
    throw err;

  }

};