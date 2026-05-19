/*****************************************************************
 * followList.controller.js (RE-ORGANIZED VERSION)
 *
 * แนวคิด:
 * - Controller สำหรับ Follow List
 * - รับ request → เรียก service → ส่ง response กลับ
 *****************************************************************/

const service = require("./followList.service");


/*****************************************************************
 * MODULE: GET FOLLOW LIST
 * หน้าที่:
 * - ดึงรายการผู้ติดตามทั้งหมด
 * - ส่งจำนวน (count) + data กลับ
 *****************************************************************/

exports.getFollowList = async (req, res) => {
  try {

    const data = await service.getFollowList();

    res.json({
      success: true,
      count: data.length,
      data
    });

  } catch (err) {

    console.error("FollowList error:", err);

    res.status(500).json({
      success: false,
      message: "Failed to load follow list"
    });

  }
};