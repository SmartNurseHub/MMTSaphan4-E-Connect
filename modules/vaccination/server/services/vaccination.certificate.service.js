/*****************************************************************
 * Module: Vaccination Certificate Generator
 * Description:
 *   Module นี้ใช้สำหรับสร้างใบรับรองการฉีดวัคซีน (Vaccination Certificate)
 *   โดยรับข้อมูลผู้ป่วยและประวัติการฉีดวัคซีน แล้วสร้าง PDF ออกมา
 *****************************************************************/

const PDFDocument = require("pdfkit");

/**
 * generateCertificate
 * @param {Array} history - ประวัติการฉีดวัคซีน [{vaccineCode, doseNumber, vaccineDate}, ...]
 * @param {Object} patient - ข้อมูลผู้ป่วย {name, cid}
 * @returns {PDFDocument} doc - PDFDocument object ของใบรับรอง
 *
 * หลักการทำงาน:
 *   1. สร้างเอกสาร PDF ใหม่
 *   2. ใส่หัวข้อ "Vaccination Certificate"
 *   3. ใส่ข้อมูลผู้ป่วย
 *   4. ใส่ประวัติการฉีดวัคซีนทีละรายการ
 *   5. จบเอกสารและ return PDFDocument object
 */
exports.generateCertificate = async (history, patient) => {
  // สร้าง PDF ใหม่
  const doc = new PDFDocument();

  // ตั้งค่าขนาดฟอนต์และหัวข้อ
  doc.fontSize(20).text("Vaccination Certificate");
  doc.moveDown();

  // ข้อมูลผู้ป่วย
  doc.text(`Name: ${patient.name}`);
  doc.text(`CID: ${patient.cid}`);
  doc.moveDown();

  // ประวัติการฉีดวัคซีน
  history.forEach(v => {
    doc.text(`${v.vaccineCode} Dose ${v.doseNumber} : ${v.vaccineDate}`);
  });

  // จบเอกสาร
  doc.end();

  return doc;
};