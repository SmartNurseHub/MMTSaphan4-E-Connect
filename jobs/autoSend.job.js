/*****************************************************************
 * cron/nursingRecords.cron.js (RE-ORGANIZED VERSION)
 *
 * แนวคิด:
 * - ใช้สำหรับ background job ตรวจสอบ NursingRecords
 * - ถ้ามี status = PENDING → จะเรียก sendResult
 * - ทำงานอัตโนมัติด้วย cron schedule
 *****************************************************************/

const cron = require("node-cron");


/*****************************************************************
 * MODULE: SERVICE IMPORT
 * หน้าที่:
 * - import function ที่ใช้ใน job นี้
 *****************************************************************/

const { getSheet } = require("../config/google");
const { sendResult } = require("../modules/nursingRecords/nursingRecords.service");


/*****************************************************************
 * MODULE: CRON SCHEDULER
 * หน้าที่:
 * - ตั้งเวลาให้ job ทำงานอัตโนมัติ
 * - รูปแบบ: ทุก 9 นาที (ตาม cron expression)
 *****************************************************************/

cron.schedule("*/09 * * * *", async () => {


  /*****************************************************************
   * MODULE: FETCH DATA
   * หน้าที่:
   * - ดึงข้อมูลจาก Google Sheet (NursingRecords)
   *****************************************************************/

  const rows = await getSheet("NursingRecords");


  /*****************************************************************
   * MODULE: HEADER MAPPING
   * หน้าที่:
   * - หา index ของ column ที่ต้องใช้
   *****************************************************************/

  const headers = rows[0];
  const statusIdx = headers.indexOf("status");
  const nsrIdx = headers.indexOf("NSR");


  /*****************************************************************
   * MODULE: PROCESS LOOP
   * หน้าที่:
   * - วนลูปตรวจสอบแต่ละ record
   * - ถ้า status = PENDING → ส่งผลลัพธ์
   *****************************************************************/

  for (let i = 1; i < rows.length; i++) {

    if (rows[i][statusIdx] === "PENDING") {

      await sendResult(rows[i][nsrIdx]);

    }

  }

});