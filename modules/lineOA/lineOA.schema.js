/*****************************************************************
 * LINE OA SCHEMA MODULE
 * NurseStationHub
 *
 * ---------------------------------------------------------------
 * หน้าที่:
 * - กำหนดชื่อ Google Sheet ที่ใช้ในระบบ
 * - กำหนดตำแหน่ง column ของข้อมูล (index-based)
 *
 * ---------------------------------------------------------------
 * STRUCTURE:
 *
 * [LINE DATA]
 * - FOLLOW_SHEET
 * - USER_SHEET
 * - LINE_UID_SHEET
 *
 * [NURSING RECORDS]
 * - NURSING_SHEET
 * - NURSING_COLUMNS
 *
 * ---------------------------------------------------------------
 * หมายเหตุ:
 * - ใช้ index ของ array (Google Sheet row)
 * - ห้ามเปลี่ยนลำดับ column โดยไม่ sync กับ sheet จริง
 *****************************************************************/


module.exports = {

  /* =========================================================
     LINE DATA (LINE OA / USER)
  ========================================================= */

  FOLLOW_SHEET: "FollowList",
  USER_SHEET: "UserList",

  // ⭐ ใช้เก็บ mapping LINE user → CID / ข้อมูลผู้ป่วย
  LINE_UID_SHEET: "LineUID",


  /* =========================================================
     NURSING RECORDS (ผลตรวจสุขภาพ)
  ========================================================= */

  NURSING_SHEET: "NursingRecords",

  /**
   * Column Index Mapping (สำคัญมาก)
   * ใช้แทน magic number เช่น row[7]
   */
  NURSING_COLUMNS: {

    NSR: 0,        // Running number
    IDCARD: 1,     // เลขบัตรประชาชน
    STATUS: 2,     // สถานะ (pending/sent/etc)
    USERID: 3,     // LINE userId
    NAME: 4,       // ชื่อผู้ป่วย
    DATE: 5,       // วันที่ตรวจ
    LIST: 6,       // รายการตรวจ
    RESULT: 7,     // ผลตรวจ
    ADVICE: 8,     // คำแนะนำ
    FILEURL: 9,    // ไฟล์แนบ
    SENTSTAMP: 10  // เวลาที่ส่ง LINE แล้ว

  }

};