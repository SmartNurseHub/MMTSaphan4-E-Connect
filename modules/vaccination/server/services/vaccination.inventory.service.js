
const { getSheets } = require("../../../../config/google");
/* =========================================================
   getInventory
========================================================= */
async function getInventory() {
  try {

    const sheets = await getSheets();
    const spreadsheetId = process.env.SPREADSHEET_ID;

    const invRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "VaccineInventory!A2:I"
    });

    const masterRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "VaccineMaster!A2:F"
    });

    const invRows = invRes?.data?.values || [];
    const masterRows = masterRes?.data?.values || [];

    const vaccineMap = {};

    masterRows.forEach(r => {
      const code = String(r[0] || "").trim();
      vaccineMap[code] = {
        code,
        name: String(r[1] || "").trim()
      };
    });

    return invRows.map(r => {

      const code = String(r[2] || "").trim();
      const vaccine = vaccineMap[code] || {};

      return {
        INVID: r[0] || "",
        DateINV: r[1] || "",
        Code: code,
        Name: vaccine.name || "-",
        Quantity: Number(r[3] || 0),
        lot: r[4] || "",
        Exp: r[5] || "",
        DateReceived: r[8] || "-"
      };

    });

  } catch (err) {
    console.error("❌ getInventory ERROR:", err);

    // 🔥 สำคัญมาก: ต้อง return array เสมอ
    return [];
  }
}


/* =========================================================
   createInventory
========================================================= */
async function createInventory(data){

  try{

    console.log("📦 CREATE INVENTORY DATA:", data);

    const {
      appendRow
    } = require("../../../../config/google");

    const inventoryId =
      "INV" + Date.now();

    await appendRow("VaccineInventory",[

      // A
      inventoryId,

      // B
      new Date().toISOString(),

      // C = Code
      String(data.code || "").trim(),

      // D = Quantity
      Number(data.qty || 0),

      // E = Lot
      String(data.lot || "").trim(),

      // F = Exp
      String(data.exp || "").trim(),

      // G = From
      String(data.from || "").trim(),

      // H = Provider
      String(data.provider || "").trim(),

      String(data.dateReceived || "").trim()

    ]);

    await appendRow("VaccineMovement", [

  // Movement ID
  "MOV" + Date.now(),

  // Date
  new Date().toISOString(),

  // Vaccine Code
  String(data.code || "").trim(),

  // Type
  "IN",

  // Qty (รับเข้า)
  Number(data.qty || 0),

  // Balance (ค่อยคำนวณภายหลัง)
  "",

  // Lot
  String(data.lot || "").trim(),

  // Ref (อ้างอิง inventory)
  inventoryId

]);

    return {
      success:true,
      inventoryId
    };

  }catch(err){

    console.error("createInventory error:", err);

    return {
      success:false,
      error:err.message
    };

  }

};

/* =========================================================
   getVaccineInventory
========================================================= */
async function getVaccineInventory() {

  try {

    const sheets = await getSheets();

    const spreadsheetId =
      process.env.SPREADSHEET_ID;

    const res =
      await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "VaccineInventory!A2:I"
      });

    const rows =
      res?.data?.values || [];

    return rows.map(r => ({
      code: r[2] || "",
      stock: Number(r[3] || 0),
      lot: r[4] || "",
      exp: r[5] || ""
    }));

  } catch (err) {

    console.error(
      "❌ getVaccineInventory ERROR:",
      err
    );

    return [];

  }

}

module.exports = {
  getInventory,
  createInventory,
  getVaccineInventory
};
