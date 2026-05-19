const service = require("./inventory.service");
const PQueue = require("p-queue").default;

/* ===============================
   SINGLE GLOBAL QUEUE (SAFE)
================================ */
const queue = new PQueue({
  concurrency: 1,
  timeout: 40000,
  throwOnTimeout: true
});

function safeResponse(res, data) {
  return res.json({
    success: true,
    data,
    timestamp: new Date().toISOString()
  });
}

function safeError(res, err, module = "inventory") {
  console.error(`[${module}]`, err);

  return res.status(500).json({
    success: false,
    module,
    error: err.message || "Unknown Error"
  });
}

/* ===============================
   MASTER
================================ */
async function getMaster(req, res) {
  try {
    const data = await service.getMaster();
    console.log("🔥 MASTER DATA OUTPUT:", data); // 👈 ADD THIS

    return safeResponse(res, data);
  } catch (err) {
    return safeError(res, err, "getMaster");
  }
}

async function saveMaster(req, res) {
  try {
    if (!Array.isArray(req.body)) {
      throw new Error("Invalid payload: expected array");
    }

    const result = await queue.add(() =>
      service.saveMaster(req.body)
    );

    return safeResponse(res, result);
  } catch (err) {
    return safeError(res, err, "saveMaster");
  }
}

/* ===============================
   MOVEMENT
================================ */
async function getMovement(req, res) {
  try {
    const data = await service.getMovement();
    return safeResponse(res, data);
  } catch (err) {
    return safeError(res, err, "getMovement");
  }
}

async function saveMovement(req, res) {
  try {
    if (!Array.isArray(req.body)) {
      throw new Error("Invalid payload: expected array");
    }

    const result = await queue.add(() =>
      service.saveMovement(req.body)
    );

    return safeResponse(res, result);
  } catch (err) {
    return safeError(res, err, "saveMovement");
  }
}



module.exports = {
  getMaster,
  saveMaster,
  getMovement,
  saveMovement
};