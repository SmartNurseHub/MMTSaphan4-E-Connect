/******************************************************************
 * MODULE      : Patients Controller
 * PURPOSE     : Handle HTTP requests for patient data
 * SCOPE       : Backend (Express.js)
 * DESCRIPTION :
 * - เชื่อมโยงกับ patients.service.js
 * - ใช้สำหรับ import, create, search, list, และ get by CID
 ******************************************************************/

const service = require("./patients.service");

/* =========================================================
   UTILITIES
   - normalizeCID: ปรับ CID ให้เป็นเลข 13 หลักมาตรฐาน
   - ใช้สำหรับ import, create, search
========================================================= */
function normalizeCID(cid) {
  if (!cid) return "";

  cid = String(cid);

  // ป้องกัน CID ที่มาเป็น scientific notation จาก Excel
  if (cid.includes("E") || cid.includes("e")) {
    cid = Number(cid).toFixed(0);
  }

  return cid
    .replace(/'/g, "")
    .replace(/\D/g, "")
    .padStart(13, "0");
}

/* =========================================================
   POST /api/patients/import
   - Import / Upsert หลายรายการ
   - CID-based
   - เรียกจาก patients.client.js (Large Import)
========================================================= */
exports.importPatients = async (req, res) => {
  try {
    const rows = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid payload" });
    }

    /* ---------- Normalize + Validate ---------- */
    const validRows = rows
      .map(r => ({ ...r, CID: normalizeCID(r.CID) }))
      .filter(r => r.CID && r.CID.length === 13);

    if (validRows.length === 0) {
      return res.status(400).json({ success: false, message: "No valid patient data" });
    }

    /* ---------- Call Service Layer ---------- */
    const result = await service.importPatientsService(validRows);

    res.json({ success: true, inserted: result.inserted, updated: result.updated });

  } catch (err) {
    console.error("IMPORT PATIENT ERROR:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* =========================================================
   POST /api/patients/create
   - บันทึกผู้ป่วย 1 ราย (Manual Entry)
   - เรียกจาก patients.client.js
========================================================= */
exports.createPatient = async (req, res) => {
  try {
    const { citizenId, firstName, lastName, birthDate, phone } = req.body;

    /* ---------- Normalize CID ---------- */
    const CID = normalizeCID(citizenId);

    if (!CID || CID.length !== 13) {
      return res.status(400).json({ success: false, message: "Citizen ID ไม่ถูกต้อง" });
    }
    if (!firstName || !lastName) {
      return res.status(400).json({ success: false, message: "ข้อมูลไม่ครบ" });
    }

    /* ---------- Call Service Layer ---------- */
    const result = await service.createPatientService({
      CID,
      NAME: firstName,
      LNAME: lastName,
      BIRTH: birthDate || "",
      MOBILE: phone || ""
    });

    res.json({ success: true, data: result });

  } catch (err) {
    console.error("CREATE PATIENT ERROR:", err);
    res.status(500).json({ success: false, message: err.message || "Server error" });
  }
};

/* =========================================================
   GET /api/patients/search?q=xxx
   - Realtime patient search for autocomplete / list
   - เรียกจาก nursingRecords.client.js
========================================================= */
exports.searchPatients = async (req, res) => {
  try {
    const keyword = req.query.q || "";
    const data = await service.searchPatients(keyword);

    // ส่ง array ตรง ๆ
    res.json(data);

  } catch (err) {
    console.error("❌ searchPatients error:", err);
    res.status(500).json([]);
  }
};

/* =========================================================
   GET /api/patients/list
   - ดึงรายชื่อผู้ป่วยทั้งหมด (Dropdown / List)
========================================================= */
exports.getPatientsList = async (req, res) => {
  try {
    const data = await service.getAllPatients();

    res.json({ success: true, data: data || [] });

  } catch (err) {
    console.error("GET PATIENT LIST ERROR:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* =========================================================
   GET /api/patients/:cid
   - ดึงข้อมูลผู้ป่วยด้วย CID
   - ใช้โดย Vaccination / NursingRecords modules
========================================================= */
exports.getPatientByCID = async (req, res) => {
  try {
    const cid = req.params.cid;

    const patient = await service.getPatientByCID(cid);

    if (!patient) {
      return res.status(404).json({ success:false, message:"Patient not found" });
    }

    res.json({ success:true, data:patient });

  } catch(err) {
    console.error("getPatientByCID error", err);
    res.status(500).json({ success:false, message:"Server error" });
  }
};