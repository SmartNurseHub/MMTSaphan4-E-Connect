/public
│
├─ index.html        ← ไฟล์ที่คุณส่งมา
├─ style.css         ← CSS ที่คุณส่งมา
├─ app.js            ← (ใหม่) ตัวควบคุมระบบทั้งหมด
│
├─ views/
│   ├─ dashboard.html
│   ├─ patients.html
│   ├─ nursingRecords.html
│   ├─ appointments.html
│   ├─ reports.html
│   └─ settings.html

https://nursestationhub2026.onrender.com/api/lineOA/webhook 
https://haziness-shush-utilize.ngrok-free.dev/lineOA/webhook


cd /d "F:\Mithmitree_SP4\ระบบงานพยาบาล\NursingCareManagementSystem"


node test.js
node server.js
netstat -ano | findstr :4000
taskkill /PID <PID> /F

git status
git add .
git commit -m "modified1"
git pull origin main  # ดึงก่อน เผื่อมีคนแก้ก่อน
git push origin main


เลือกไฟล์
 → อ่านไฟล์ .txt (ยังไม่อัปโหลด)
 → แสดงข้อมูลเป็นตาราง (ค้นหา / เลือกได้)
 → ผู้ใช้ติ๊กเลือกเฉพาะแถวที่ต้องการ
 → กด “บันทึกลงระบบ”
 → ส่งเฉพาะแถวที่เลือกไป backend




NurseStationHub2026
 ┣ config
 ┃ ┗ google.js
 ┣ jobs
 ┃ ┣ autoSend.job.js
 ┃ ┗ reminder.job.js
 ┣ modules
 ┃ ┣ appointments
 ┃ ┃ ┗ appointments.routes.js
 ┃ ┣ dashboard
 ┃ ┃ ┣ dashboard.client.js
 ┃ ┃ ┣ dashboard.controller.js
 ┃ ┃ ┣ dashboard.routes.js
 ┃ ┃ ┣ dashboard.service.js
 ┃ ┃ ┗ dashboard.view.html
 ┃ ┣ followList
 ┃ ┃ ┣ followList.controller.js
 ┃ ┃ ┣ followList.routes.js
 ┃ ┃ ┗ followList.service.js
 ┃ ┣ lineOA
 ┃ ┃ ┣ lineOA.controller.js
 ┃ ┃ ┣ lineOA.line.service.js
 ┃ ┃ ┣ lineOA.registration.service.js
 ┃ ┃ ┣ lineOA.routes.js
 ┃ ┃ ┣ lineOA.schema.js
 ┃ ┃ ┗ lineOA.service.js
 ┃ ┣ lineUID
 ┃ ┃ ┣ lineUID.controller.js
 ┃ ┃ ┣ lineUID.routes.js
 ┃ ┃ ┣ lineUID.schema.js
 ┃ ┃ ┗ lineUID.service.js
 ┃ ┣ nursingRecords
 ┃ ┃ ┣ views
 ┃ ┃ ┃ ┣ nursingRecords.counselor.view.html
 ┃ ┃ ┃ ┗ nursingRecords.online.view.html
 ┃ ┃ ┣ audit.service.js
 ┃ ┃ ┣ nursingRecords.client.js
 ┃ ┃ ┣ nursingRecords.controller.js
 ┃ ┃ ┣ nursingRecords.online.actions.js
 ┃ ┃ ┣ nursingRecords.online.client.js
 ┃ ┃ ┣ nursingRecords.print.js
 ┃ ┃ ┣ nursingRecords.routes.js
 ┃ ┃ ┣ nursingRecords.service.js
 ┃ ┃ ┗ nursingRecords.view.html
 ┃ ┣ patientCore
 ┃ ┃ ┗ patientCore.client.js
 ┃ ┣ patients
 ┃ ┃ ┣ patients.client.js
 ┃ ┃ ┣ patients.controller.js
 ┃ ┃ ┣ patients.routes.js
 ┃ ┃ ┣ patients.service.js
 ┃ ┃ ┗ patients.view.html
 ┃ ┣ satisfactionSurvey
 ┃ ┃ ┣ views
 ┃ ┃ ┃ ┗ satisfactionSurvey.view.html
 ┃ ┃ ┣ satisfactionSurvey.controller.js
 ┃ ┃ ┣ satisfactionSurvey.routes.js
 ┃ ┃ ┣ satisfactionSurvey.schema.js
 ┃ ┃ ┗ satisfactionSurvey.service.js
 ┃ ┣ upload
 ┃ ┃ ┗ upload.routes.js
 ┃ ┣ vaccination
 ┃ ┃ ┣ vaccination.certificate.service.js
 ┃ ┃ ┣ vaccination.client.js
 ┃ ┃ ┣ vaccination.controller.js
 ┃ ┃ ┣ vaccination.engine.js
 ┃ ┃ ┣ vaccination.reminder.service.js
 ┃ ┃ ┣ vaccination.routes.js
 ┃ ┃ ┣ vaccination.service.js
 ┃ ┃ ┗ vaccination.view.html
 ┃ ┗ README.md
 ┣ public
 ┃ ┣ assets
 ┃ ┃ ┣ css
 ┃ ┃ ┃ ┗ main.css
 ┃ ┃ ┣ images
 ┃ ┃ ┃ ┗ LOGO.png
 ┃ ┃ ┗ js
 ┃ ┃ ┃ ┗ date.utils.js
 ┃ ┣ core
 ┃ ┃ ┣ app.js
 ┃ ┃ ┗ patient.shared.js
 ┃ ┣ images
 ┃ ┃ ┣ LOGO.png
 ┃ ┃ ┗ README.md
 ┃ ┣ js
 ┃ ┃ ┣ liff-common.js
 ┃ ┃ ┗ patients.js
 ┃ ┣ liff
 ┃ ┃ ┗ vaccine-history.html
 ┃ ┗ favicon.ico
 ┣ routes
 ┃ ┗ index.js
 ┣ uploads
 ┃ ┣ nursingRecords.client.js
 ┃ ┣ nursingRecords.counselor.view.html
 ┃ ┗ nursingRecords.view.html
 ┣ utils
 ┃ ┗ flexBuilder.js
 ┣ views
 ┃ ┗ index.html
 ┣ .env
 ┣ cloudflared.exe
 ┣ package-lock.json
 ┣ package.json
 ┣ README.md
 ┗ server.js
 


 const questions = [
  "ระยะเวลารอรับบริการมีความเหมาะสม",
  "ขั้นตอนการรับบริการเป็นไปอย่างต่อเนื่อง ไม่ซับซ้อน",
  "ความสุภาพและเป็นมิตรของเจ้าหน้าที่",
  "ความใส่ใจและการรับฟังของแพทย์/พยาบาล",
  "คำอธิบายเกี่ยวกับอาการและการรักษาเข้าใจง่าย",
  "ความชัดเจนของคำแนะนำในการดูแลตนเองหลังรับบริการ",
  "ความมั่นใจในคุณภาพการรักษาที่ได้รับ",
  "ความพึงพอใจต่อผลลัพธ์การรักษาโดยรวม",
  "ความรู้สึกปลอดภัยและความเชื่อมั่นในคลินิก",
  "โดยรวมแล้ว ท่านพึงพอใจกับการเข้ารับบริการครั้งนี้เพียงใด"
];


ลงทะเบียนผู้รับบริการ
        ↓
เจ้าหน้าที่บันทึกการฉีดวัคซีน
        ↓
ระบบคำนวณวันฉีดครั้งถัดไป
        ↓
สร้างวันนัด
        ↓
สร้างวันแจ้งเตือน (1เดือน /7วัน /3วัน /1วัน)
        ↓
Scheduler ตรวจทุกวัน
        ↓
ส่ง LINE/SMS แจ้งเตือน
        ↓
ผู้รับบริการมาฉีด
        ↓
เจ้าหน้าที่บันทึกการฉีด
        ↓
ระบบสร้างนัดครั้งถัดไป
        ↓
ทำซ้ำจนกว่าจะครบโดส


1. ภาพรวม Architecture (HIS Style)


                        ┌─────────────────────┐
                        │      Frontend       │
                        │  SPA + LIFF Client  │
                        └──────────┬──────────┘
                                   │
                           HTTP / REST API
                                   │
                        ┌──────────▼──────────┐
                        │      API Layer      │
                        │   (Controllers)     │
                        └──────────┬──────────┘
                                   │
                        ┌──────────▼──────────┐
                        │    Service Layer    │
                        │  Business Logic     │
                        └──────────┬──────────┘
                                   │
                 ┌─────────────────┴─────────────────┐
                 │                                   │
        ┌────────▼─────────┐               ┌─────────▼─────────┐
        │   Data Adapter   │               │  External Systems │
        │ Sheets / DB      │               │ LINE / SMS / API  │
        └────────┬─────────┘               └─────────┬─────────┘
                 │                                   │
           ┌─────▼─────┐                      ┌──────▼──────┐
           │   Cache   │                      │ Background  │
           │  Memory   │                      │ Jobs/Queue  │
           └───────────┘                      └─────────────┘


2. โครงสร้างระบบ (Production HIS Structure)

NurseStationHub2026
│
├─ server.js
├─ package.json
├─ .env
│
├─ config
│   ├─ google.js
│   ├─ line.js
│   └─ system.config.js
│
├─ core                ⭐ Shared system services
│   ├─ logger.js
│   ├─ cache.js
│   ├─ sheets.js
│   ├─ auth.js
│   └─ errors.js
│
├─ modules             ⭐ Business Domains
│
│   ├─ patients
│   ├─ nursingRecords
│   ├─ vaccination
│   ├─ appointments
│   ├─ followList
│   ├─ dashboard
│   ├─ satisfactionSurvey
│   ├─ lineOA
│   └─ lineUID
│
├─ jobs                ⭐ background automation
│   ├─ reminder.job.js
│   └─ autoSend.job.js
│
├─ integrations        ⭐ external systems
│   ├─ line
│   │   └─ line.client.js
│   └─ sms
│
├─ routes
│   └─ index.js
│
├─ public              ⭐ frontend
│   ├─ core
│   ├─ assets
│   └─ liff
│
├─ uploads
│
└─ views
    └─ index.html


3. Domain Modules (แบบ HIS จริง)
modules
 └─ patients
    ├─ api
    │   ├─ patients.routes.js
    │   ├─ patients.controller.js
    │   └─ patients.validator.js
    │
    ├─ services
    │   ├─ patients.service.js
    │   ├─ patients.cache.js
    │   └─ patients.repository.js
    │
    ├─ adapters
    │   └─ patients.sheet.js
    │
    ├─ client
    │   ├─ patients.client.js
    │   ├─ patients.table.js
    │   ├─ patients.form.js
    │   └─ patients.search.js
    │
    ├─ utils
    │   ├─ cid.util.js
    │   └─ date.util.js
    │
    └─ views
        └─ patients.view.html

4. Core System Services (สำคัญมาก)
core
 ├─ logger.js
 ├─ cache.js
 ├─ sheets.js
 ├─ auth.js
 └─ errors.js