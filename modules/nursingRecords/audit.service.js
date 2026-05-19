/*****************************************************************
 * AUDIT LOG SERVICE MODULE
 * NurseStationHub
 *
 * ---------------------------------------------------------------
 * หน้าที่:
 * - บันทึกกิจกรรมสำคัญของระบบลง Google Sheet
 * - ใช้สำหรับ audit / tracking / debugging
 *
 * ---------------------------------------------------------------
 * LOG STRUCTURE (NursingAuditLog Sheet):
 *
 * [0] Timestamp
 * [1] NSR (เลข record)
 * [2] Action (เช่น SEND_RESULT, UPDATE, DELETE)
 * [3] User (ผู้กระทำ เช่น staff / system)
 * [4] Detail (รายละเอียดเพิ่มเติม)
 *
 * ---------------------------------------------------------------
 * FUNCTION LIST:
 *
 * 1. log({ nsr, action, user, detail })
 *    → บันทึก log ลง Google Sheet
 *
 * ---------------------------------------------------------------
 * FLOW:
 * Service/Controller → AuditLog → Google Sheet
 *****************************************************************/


/* =========================================================
   MAIN FUNCTION
========================================================= */

/**
 * WRITE AUDIT LOG
 */
exports.log = async ({ nsr, action, user, detail }) => {

  /* ===============================
     INIT GOOGLE SHEETS
  =============================== */

  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  /* ===============================
     APPEND LOG
  =============================== */

  await sheets.spreadsheets.values.append({

    spreadsheetId: SHEET_ID,

    range: `NursingAuditLog!A2`,

    valueInputOption: "USER_ENTERED",

    requestBody: {
      values: [[
        new Date().toISOString(),
        nsr,
        action,
        user,
        detail || ""
      ]]
    }

  });

};