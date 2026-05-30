
module.exports = {

  FOLLOW_SHEET: "FollowList",
  USER_SHEET: "UserList",

  LINE_UID_SHEET: "LineUID",

  NURSING_SHEET: "NursingRecords",

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