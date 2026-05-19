/* =========================================================
   IMPORTS
========================================================= */

const { readRows, updateRow } = require("@config/google")
const { LINE_UID_SHEET } = require("./lineOA.schema");


/* =========================================================
   CACHE (ลดการเรียก Google Sheet)
========================================================= */

let sheetCache = null;
let lastLoad = 0;
const CACHE_TIME = 10000; // 10 sec

/**
 * โหลดข้อมูลจาก Sheet (ใช้ cache)
 */
async function getRows() {

  const now = Date.now();

  if (!sheetCache || (now - lastLoad) > CACHE_TIME) {

    try {

      const rows = await readRows(LINE_UID_SHEET);

      sheetCache = rows || [];
      lastLoad = now;

    } catch (err) {

      console.error("Sheet load error:", err);
      sheetCache = [];

    }

  }

  return sheetCache;
}


/* =========================================================
   CACHE CONTROL
========================================================= */

/**
 * ล้าง cache หลัง update
 */
function clearCache() {
  sheetCache = null;
}


/* =========================================================
   MAIN REGISTRATION FLOW (STATE MACHINE)
========================================================= */

/**
 * handleRegistrationFlow
 * ใช้ควบคุม flow การลงทะเบียนทีละ step
 */
exports.handleRegistrationFlow = async (lineClient, userId, text, replyToken) => {

  try {

    text = (text || "").trim();

    if (!userId) return false;

    const rows = await getRows();

    if (!rows.length) return false;

    const rowIndex = rows.findIndex((r, i) =>
      i > 0 && String(r[4] || "").trim() === userId
    );

    if (rowIndex === -1) return false;

    const row = rows[rowIndex];
    const status = String(row[7] || "").trim();

    console.log("Registration flow:", userId, "status:", status);


    /* =====================================================
       STEP 1 : CID (เลขบัตรประชาชน)
    ===================================================== */

    if (status === "PENDING_CID") {

      if (!/^\d{13}$/.test(text)) {

        await lineClient.replyMessage(replyToken, {
          type: "text",
          text: "กรุณากรอกเลขบัตรประชาชน 13 หลัก"
        });

        return true;
      }

      row[1] = text;
      row[7] = "PENDING_NAME";

      await updateRow(LINE_UID_SHEET, rowIndex + 1, row);

      clearCache();

      await lineClient.replyMessage(replyToken, {
        type: "text",
        text: "กรุณากรอกชื่อ–นามสกุล"
      });

      return true;
    }


    /* =====================================================
       STEP 2 : NAME (ชื่อ-นามสกุล)
    ===================================================== */

    if (status === "PENDING_NAME") {

      const parts = text.split(" ").filter(v => v);

      if (parts.length < 2) {

        await lineClient.replyMessage(replyToken, {
          type: "text",
          text: "กรุณากรอกชื่อและนามสกุล เว้นวรรค 1 ครั้ง"
        });

        return true;
      }

      row[2] = parts[0];
      row[3] = parts.slice(1).join(" ");
      row[7] = "PENDING_PHONE";

      await updateRow(LINE_UID_SHEET, rowIndex + 1, row);

      clearCache();

      await lineClient.replyMessage(replyToken, {
        type: "text",
        text: "กรุณากรอกเบอร์โทรศัพท์"
      });

      return true;
    }


    /* =====================================================
       STEP 3 : PHONE (เบอร์โทร)
    ===================================================== */

    if (status === "PENDING_PHONE") {

      if (!/^0\d{8,9}$/.test(text)) {

        await lineClient.replyMessage(replyToken, {
          type: "text",
          text: "กรุณากรอกเบอร์โทรให้ถูกต้อง"
        });

        return true;
      }

      row[8] = text;
      row[7] = "ACTIVE";

      await updateRow(LINE_UID_SHEET, rowIndex + 1, row);

      clearCache();

      await lineClient.replyMessage(replyToken, {
        type: "text",
        text: "ลงทะเบียนสำเร็จแล้ว 🎉"
      });

      return true;
    }

    return false;

  } catch (err) {

    console.error("Registration flow error:", err);

    try {

      await lineClient.replyMessage(replyToken, {
        type: "text",
        text: "ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง"
      });

    } catch (e) {}

    return false;
  }

};