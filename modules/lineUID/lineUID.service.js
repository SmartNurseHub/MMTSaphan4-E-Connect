/*****************************************************************
 * lineUID.service.js (FIXED - USE getSheets ONLY)
 *****************************************************************/

const { readRows, appendRow, getSheets } = require("@config/google")
const { deleteRow } = require("@config/google")
const SHEET = "LineUID";

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_ID = parseInt(process.env.LINEUID_SHEET_ID || "0");

/* =========================================================
   GET LIST (ADD rowIndex)
========================================================= */
exports.getLineUIDList = async () => {

  try {

    const rows = await readRows(SHEET);

    if (!rows || rows.length <= 1) return [];

    return rows.slice(1).map((r, i) => ({
      rowIndex: i + 2, // 🔥 สำคัญ
      timestamp: r[0] || "",
      cid: r[1] || "",
      name: r[2] || "",
      lname: r[3] || "",
      userId: r[4] || "",
      displayName: r[5] || "",
      pictureUrl: r[6] || "",
      status: r[7] || "",
      phone: r[8] || ""
    }));

  } catch (err) {
    console.error("❌ getLineUIDList:", err);
    throw err;
  }

};


/* =========================================================
   ADD (WITH DUPLICATE GUARD)
========================================================= */

let isSaving = false;

exports.addLineUID = async (data) => {

  if (isSaving) {
    console.log("⚠️ SKIP: already saving");
    return;
  }

  isSaving = true;

  try {

    const rows = await readRows(SHEET);

    // 🔍 กันซ้ำด้วย userId
    const exists = rows.find(r => r[4] === data.userId);

    if (exists) {
      console.log("⚠️ DUPLICATE SKIPPED:", data.userId);
      return;
    }

    const now = new Date().toISOString();

    await appendRow(SHEET, [
      now,
      data.cid || "",
      data.name || "",
      data.lname || "",
      data.userId || "",
      data.displayName || "",
      data.pictureUrl || "",
      data.status || "ACTIVE",
      data.phone || ""
    ]);

    console.log("✅ INSERT SUCCESS:", data.userId);

  } catch (err) {

    console.error("❌ addLineUID:", err);
    throw err;

  } finally {
    isSaving = false;
  }

};


/* =========================================================
   DELETE (REAL DELETE BY rowIndex) ✅ FIXED
========================================================= */

exports.deleteLineUID = async (rowIndex) => {

  if (!rowIndex || rowIndex < 2) {
    throw new Error("Invalid rowIndex");
  }

  console.log("🗑️ DELETE (SERVICE):", rowIndex);

  await deleteRow("LineUID", rowIndex);

  console.log("✅ DELETE SUCCESS:", rowIndex);
};