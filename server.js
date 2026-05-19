/*****************************************************************
 * server.js — NurseStationHub (RE-ORGANIZED STABLE VERSION)
 *
 * แนวคิด:
 * - เป็น entry point หลักของระบบ
 * - ทำหน้าที่ config server, middleware, routes, cron job
 * - แยกโครงสร้างเป็น Module เพื่อให้อ่านง่ายและ scale ได้
 *****************************************************************/
require('module-alias/register');
require("dotenv").config();
require("./jobs/reminder.job");
const express = require("express");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 7000;


/*****************************************************************
 * MODULE: SERVICES IMPORT
 * หน้าที่:
 * - import service ที่ใช้ในระดับ server เช่น cron / background job
 *****************************************************************/

const { runReminderJob } =
  require("./modules/vaccination/vaccination.reminder.service");

/*****************************************************************
 * MODULE: MIDDLEWARE
 * หน้าที่:
 * - จัดการ request body (JSON / FORM)
 * - กำหนด limit เพื่อป้องกัน payload ใหญ่เกิน
 *****************************************************************/

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));


/*****************************************************************
 * MODULE: STATIC FILES
 * หน้าที่:
 * - ให้บริการไฟล์ frontend / assets
 * - ใช้สำหรับ SPA หรือ static web
 *****************************************************************/

app.use(express.static(path.join(__dirname, "public")));
app.use("/modules", express.static(path.join(__dirname, "modules")));
app.use("/views", express.static(path.join(__dirname, "views")));


/*****************************************************************
 * MODULE: API ROUTES (MAIN ENTRY)
 * หน้าที่:
 * - รวม route หลักทั้งหมดผ่าน /api
 *****************************************************************/
app.use("/api", require("./routes"));


/*****************************************************************
 * MODULE: DIRECT ROUTES (SPECIAL CASE)
 * หน้าที่:
 * - route ที่ถูก mount แยกโดยตรง (ซ้ำกับ /api บางส่วน)
 * - คงไว้ตามโค้ดเดิม (ไม่ลบ)
 *****************************************************************/

app.use(
  "/api/patient",
  require("./modules/patients/patients.routes")
);

app.use(
  "/api/vaccination",
  require("./modules/vaccination/vaccination.routes")
);

app.use(
  "/satisfaction-survey",
  require("./modules/satisfactionSurvey/satisfactionSurvey.routes")
);

app.use(
  "/lineoa",
  require("./modules/lineOA/lineOA.routes")
);

app.use(
  "/api/inventory",
  require("./modules/inventory/inventory.routes")
);


/*****************************************************************
 * MODULE: TEST / DEBUG ROUTES
 * หน้าที่:
 * - ใช้ทดสอบการทำงานของ background job (cron)
 * - เรียกใช้งาน reminder แบบ manual
 *****************************************************************/

app.get("/test-reminder", async (req, res) => {

  try {

    await runReminderJob();   // ✅ ใช้ตัวเดียวกับ cron

    res.send("✅ Reminder job executed");

  } catch (err) {

    console.error(err);
    res.status(500).send("error");

  }

});

router.post("/webhook", async (req, res) => {
  res.status(200).send("OK");

  setImmediate(async () => {
    try {
      await handleWebhook(req.body);
    } catch (err) {
      console.error(err);
    }
  });
});


/*****************************************************************
 * MODULE: CRON JOB (BACKGROUND TASK)
 * หน้าที่:
 * - ใช้ตั้งเวลาให้ระบบทำงานอัตโนมัติ เช่น ส่งแจ้งเตือนวัคซีน
 *
 * ⚠️ หมายเหตุ:
 * - ปัจจุบันมี import checkAndSendReminders แต่ยังไม่ได้ใช้
 * - คงไว้ตาม requirement (ไม่ลบโค้ด)
 *****************************************************************/

// (ยังไม่มี cron.schedule ในโค้ดเดิม แต่เตรียมโครงไว้)


/*****************************************************************
 * MODULE: SPA FALLBACK
 * หน้าที่:
 * - รองรับ Single Page Application (React/Vue/etc.)
 * - ทุก route ที่ไม่ใช่ API จะ redirect ไป index.html
 ****************************************************************

app.use((req, res, next) => {
  if (req.originalUrl.startsWith("/api")) {
    return res.status(404).json({
      success: false,
      message: "API not found"
    });
  }
  next();
});*/

app.get("*", (req, res) => {
  res.sendFile(
  path.join(__dirname,"views","index.html"));
});


/*****************************************************************
 * MODULE: START SERVER
 * หน้าที่:
 * - เริ่มต้น server และ listen port
 *****************************************************************/

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
