const { appendRow, readRows } = require("@config/google")

const SHEET_NAME = "SatisfactionSurvey";

/* =========================================================
   SAVE SURVEY
   - อ่านข้อมูลทั้งหมด (เช็คซ้ำ UID)
   - เตรียม row ให้ตรงคอลัมน์
   - บันทึกลง Google Sheet
========================================================= */
exports.saveSurvey = async (data) => {

  // 🔹 อ่านข้อมูลทั้งหมด (ใช้เช็คซ้ำ)
  const rows = await readRows(SHEET_NAME);

  // rows[0] = header → ข้าม
  const duplicated = rows.slice(1).find(r => r[1] === data.uid);

  if (duplicated) {
    return { status: "duplicate" };
  }

  // 🔹 เตรียม row ให้ตรงคอลัมน์
  const row = [
    new Date().toISOString(),   // timestamp (A)
    data.uid || "",             // UID (B)
    data.serviceDate || "",     // วันที่รับบริการ (C)
    data.fullName || "",        // ชื่อ-นามสกุล (D)
    data.phone || "",           // เบอร์โทร (E)
    data.services || "",        // ชื่อบริการ (F)
    data.q1 || "",              // Q1
    data.q2 || "",              // Q2
    data.q3 || "",              // Q3
    data.q4 || "",              // Q4
    data.q5 || "",              // Q5
    data.q6 || "",              // Q6
    data.q7 || "",              // Q7
    data.q8 || "",              // Q8
    data.q9 || "",              // Q9
    data.q10 || "",             // Q10
    data.comment || ""          // ข้อความเพิ่มเติม
  ];

  // 🔹 บันทึกลง Google Sheet
  await appendRow(SHEET_NAME, row);

  return { status: "success" };
};