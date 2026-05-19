/*****************************************************************
 * date.utils.js (RE-ORGANIZED VERSION)
 *
 * แนวคิด:
 * - Utility สำหรับจัดการวันที่ (normalize / format / คำนวณอายุ)
 * - ใช้ร่วมกันทั้งระบบ (global functions)
 * - รองรับรูปแบบวันที่หลากหลาย
 *****************************************************************/

console.log("📅 date.utils.js LOADED");


/*****************************************************************
 * MODULE: NORMALIZE DATE
 * หน้าที่:
 * - แปลง input → YYYY-MM-DD
 * - รองรับ:
 *   - yyyy-mm-dd
 *   - yyyymmdd
 * - ใช้เป็นฐานสำหรับทุก function
 *****************************************************************/

function toRawDate(dateStr) {
  if (!dateStr) return "";

  const s = String(dateStr).trim();

  // yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // yyyymmdd
  if (/^\d{8}$/.test(s)) {
    return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`;
  }

  return "";
}


/*****************************************************************
 * MODULE: FULL THAI DATE FORMAT
 * หน้าที่:
 * - แปลงเป็นวันที่ภาษาไทยแบบเต็ม
 * - เช่น: 2026-02-12 → 12 กุมภาพันธ์ 2569
 *****************************************************************/

function toDisplayThaiDate(raw) {
  const s = toRawDate(raw);
  if (!s) return "";

  const [y, m, d] = s.split("-").map(Number);

  if (m < 1 || m > 12) return "";

  const thaiMonths = [
    "มกราคม","กุมภาพันธ์","มีนาคม","เมษายน",
    "พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม",
    "กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"
  ];

  return `${d} ${thaiMonths[m - 1]} ${y + 543}`;
}


/*****************************************************************
 * MODULE: SHORT THAI DATE FORMAT
 * หน้าที่:
 * - แปลงเป็นวันที่ภาษาไทยแบบย่อ
 * - เช่น: 2026-02-12 → 12 ก.พ. 2569
 *****************************************************************/

function toThaiShortDate(dateInput) {
  const s = toRawDate(dateInput);
  if (!s) return "";

  const [y, m, d] = s.split("-").map(Number);

  if (m < 1 || m > 12) return "";

  const thaiMonthsShort = [
    "ม.ค.","ก.พ.","มี.ค.","เม.ย.",
    "พ.ค.","มิ.ย.","ก.ค.","ส.ค.",
    "ก.ย.","ต.ค.","พ.ย.","ธ.ค."
  ];

  return `${d} ${thaiMonthsShort[m - 1]} ${y + 543}`;
}


/*****************************************************************
 * MODULE: CALCULATE AGE
 * หน้าที่:
 * - คำนวณอายุจากวันเกิด
 * - ตรวจสอบความถูกต้องของวันที่
 * - ป้องกันค่าอายุผิด (เช่น อนาคต)
 *****************************************************************/

function calculateAge(rawDate) {
  const s = toRawDate(rawDate);
  if (!s) return "";

  const [y, m, d] = s.split("-").map(Number);
  const birth = new Date(y, m - 1, d);

  if (isNaN(birth.getTime())) return "";

  const today = new Date();

  let age = today.getFullYear() - birth.getFullYear();

  if (
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() &&
     today.getDate() < birth.getDate())
  ) {
    age--;
  }

  return age < 0 ? "" : age;
}


/*****************************************************************
 * MODULE: GLOBAL EXPORT (SPA SAFE)
 * หน้าที่:
 * - export function ไปใช้ในหน้าอื่นผ่าน window
 * - รองรับ SPA (ไม่มี module bundler)
 *****************************************************************/

window.toRawDate = toRawDate;
window.toDisplayThaiDate = toDisplayThaiDate;
window.toThaiShortDate = toThaiShortDate;
window.calculateAge = calculateAge;