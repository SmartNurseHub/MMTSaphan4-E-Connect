/******************************************************************
 * MODULE: Nursing Records Routes
 * FILE: modules/nursingRecords/nursingRecords.routes.js
 *
 * ---------------------------------------------------------------
 * หน้าที่:
 * - กำหนดเส้นทาง (API Routes) สำหรับ Nursing Records
 * - เชื่อม request จาก client → ไปยัง controller
 *
 * ---------------------------------------------------------------
 * ROUTE OVERVIEW:
 *
 * GET     /api/nursingRecords
 *   → ดึงรายการทั้งหมด
 *
 * GET     /api/nursingRecords/next-nsr
 *   → สร้างเลข NSR ใหม่
 *
 * POST    /api/nursingRecords
 *   → บันทึกข้อมูลใหม่
 *
 * PUT     /api/nursingRecords/:nsr
 *   → แก้ไขข้อมูลตาม NSR
 *
 * DELETE  /api/nursingRecords/:nsr
 *   → ลบข้อมูล (soft delete)
 *
 ******************************************************************/

/* =========================================================
   IMPORTS
========================================================= */
const express = require("express");
const router = express.Router();

const controller = require("./nursingRecords.controller");


/* =========================================================
   ROUTES: READ
========================================================= */

/**
 * GET ALL RECORDS
 * → ดึงข้อมูล nursing ทั้งหมด
 */
router.get("/", controller.getAll);


/**
 * GET NEXT NSR
 * → ใช้ generate เลข NSR สำหรับ record ใหม่
 */
router.get("/next-nsr", controller.getNextNSR);


/* =========================================================
   ROUTES: CREATE
========================================================= */

/**
 * CREATE NEW RECORD
 * → บันทึกข้อมูล nursing ใหม่
 */
router.post("/", controller.save);


/* =========================================================
   ROUTES: UPDATE
========================================================= */

/**
 * UPDATE RECORD BY NSR
 * → แก้ไขข้อมูลตาม NSR
 */
router.put("/:nsr", controller.update);


/* =========================================================
   ROUTES: DELETE
========================================================= */

/**
 * DELETE RECORD (SOFT DELETE)
 * → ลบข้อมูลโดยไม่ลบจริง (soft delete)
 */
router.delete("/:nsr", controller.delete);


/* =========================================================
   EXPORT
========================================================= */
module.exports = router;