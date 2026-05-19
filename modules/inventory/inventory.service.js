const repo = require("./inventory.repo");
const cache = require("./inventory.cache");

/* ===============================
   MASTER
================================ */
async function getMaster() {
   cache.clear(); // 👈 TEMP FIX (ใช้ debug)
  const cached = cache.getMaster();
  if (cached) return cached;

  const rows = await repo.getMasterRows();

  const data = rows.map(r => ({
    id: r[0],
    name: r[1],
    size: r[2],
    min_qty: Number(r[3] || 0),
    unit: r[4]
  }));

  cache.setMaster(data);
  return data;
}

async function saveMaster(data) {
  const values = [
    ["id", "name", "size", "min_qty", "unit"],
    ...data.map(r => ([
      r.id || "",
      r.name || "",
      r.size || "",
      Number(r.min_qty || 0),
      r.unit || ""
    ]))
  ];

  await repo.writeMaster(values);
  cache.clear();

  return { ok: true };
}

/* ===============================
   MOVEMENT
================================ */
async function getMovement() {
  const cached = cache.getMovement();
  if (cached) return cached;

  const rows = await repo.getMovementRows();

  const data = rows.map(r => ({
    Lotid: r[0],
    Item_id: r[1],
    Date: r[2],
    Type: r[3],
    Lot: r[4],
    Exp: r[5],
    Qty: Number(r[6] || 0),
    Status: r[7],
    From: r[8],
    Providers: r[9],
    QRCode: r[10]
  }));

  cache.setMovement(data);
  return data;
}

async function saveMovement(data) {
  const values = [
    [
      "Lotid","Item_id","Date","Type","Lot","Exp",
      "Qty","Status","From","Providers","QRCode"
    ],
    ...data.map(r => ([
      r.Lotid || "",
      r.Item_id || "",
      r.Date || new Date(),
      r.Type || "IN",
      r.Lot || "",
      r.Exp || "",
      Number(r.Qty || 0),
      r.Status || "ACTIVE",
      r.From || "",
      r.Providers || "",
      r.QRCode || ""
    ]))
  ];

  await repo.writeMovement(values);
  cache.clear();

  return { ok: true };
}



module.exports = {
  getMaster,
  saveMaster,
  getMovement,
  saveMovement
};