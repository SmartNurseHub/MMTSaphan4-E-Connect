/*****************************************************************
 * JOB: REMINDER CRON (FINAL PRODUCTION SAFE)
 *****************************************************************/

const cron = require("node-cron"); // ✅ สำคัญมาก (แก้ error)
const reminderService = require("../modules/vaccination/server/services/vaccination.reminder.service")
let isRunning = false; // 🔒 กัน cron ชนกัน

/**
 * ⏰ RUN EVERY 5 MINUTES
 */
cron.schedule("*/5 * * * *", async () => {

  // 🔒 กัน job ซ้อน
  if (isRunning) {
    console.log("⏭️ [CRON] Skip: job still running");
    return;
  }

  isRunning = true;

  const startTime = new Date();
  console.log("⏰ [CRON] Reminder Job START:", startTime.toISOString());

  try {

    // 🚀 ให้ service จัดการทั้งหมด
    await reminderService.runReminderJob();

    const endTime = new Date();
    console.log("✅ [CRON] DONE:", endTime.toISOString());

  } catch (err) {

    console.error("❌ [CRON ERROR]", err);

  } finally {

    // 🔓 ปลด lock เสมอ (สำคัญมาก)
    isRunning = false;

  }

}, {
  timezone: "Asia/Bangkok" // 🇹🇭 กันเวลาเพี้ยน
});