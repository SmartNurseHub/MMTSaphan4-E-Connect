SPA Core (public/core/app.js)
    1. Entry point ของระบบ SPA — ควบคุมการโหลด module หน้า HTML + JS
    2. Sidebar toggle: ฟังก์ชันพับ/ขยาย sidebar
    3. VIEW_CONFIG: กำหนด module ทั้งหมด
        3.1 dashboard, patients, appointments
        3.2 nursingRecords, nursingCounselor, reports, vaccination
        3.3 แต่ละ module มี view (HTML), script (JS), init (function เริ่มต้น)
    4. loadView(name):
        4.1 โหลด HTML ลง #view-container
        4.2 โหลด script ของ module และเรียก init function (ถ้ามี)
        4.3 ลบ script เก่าเพื่อป้องกันซ้ำซ้อน
    5. openNursingCounselor(tab):
        5.1 เปิด form ของ nursingCounselor จากทุก module
        5.2 สามารถเลือก tab: general, disease, universal
        5.3 scroll ไปที่ form อัตโนมัติ
    6. SPA Navigation:
        6.1 คลิก element [data-nav] → โหลด module ตามชื่อ
    7. Init: โหลด dashboard เป็นหน้าแรก (DOMContentLoaded)


Module: SPA Core (Single Page Application)
    1. Purpose: โหลดและจัดการทุก module ของระบบแบบ SPA
    2. Responsibilities:
        2.1 จัดการ Sidebar toggle
        2.2 เก็บ View Config เป็น “source of truth” สำหรับทุก module
        2.3 ฟังก์ชัน loadView(name) → โหลด HTML + script ของ module แบบ dynamic
        2.4 จัดการ script lifecycle (ลบ script เก่า, โหลด script ใหม่, เรียก init function)
        2.5 เปิด Nursing Counselor form และสลับ tab ตามต้องการ
        2.6 SPA navigation: ฟัง event click [data-nav] → โหลดหน้า module
    3. Init: โหลด dashboard เป็นหน้าเริ่มต้น (DOMContentLoaded)

ศูนย์กลาง Route ของ NurseStationHub API
    1. รวมทุก module route ไว้ในไฟล์เดียว
    2. ใช้ safe loader ป้องกัน server crash หาก module ใดโหลดไม่สำเร็จ
    3. MODULES ที่รองรับ
        3.1 /health → ตรวจสอบสถานะ API (health check)
        3.2 /dashboard → Dashboard module
        3.3 /patients → Patients module
        3.4 /upload → Upload module
        3.5 /appointments → Appointments module
        3.6/nursingRecords → Nursing Records module
        3.7 /lineOA & /line → Line OA module
        3.8 /followlist → FollowList module
        3.9 /lineuid → LineUID module
        3.10 /vaccination → Vaccination module
        3.11 /satisfaction-survey → Satisfaction Survey module
    4. ฟีเจอร์พิเศษ
        4.1 ใช้ safeUse() สำหรับโหลด module อย่างปลอดภัย พร้อม log ว่าโหลดสำเร็จหรือไม่
        4.2 มี endpoint POST /followlist/delete แบบ validate input ป้องกัน error
        4.3 รองรับ direct import ของ vaccination routes สำหรับกรณีต้องการ reference โดยตรง
    5. Export
        5.1 ส่งออก router ให้ server.js หรือ app.js ใช้งาน


