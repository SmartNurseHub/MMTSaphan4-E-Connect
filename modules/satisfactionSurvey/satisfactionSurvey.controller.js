const path = require("path");
const service = require("./satisfactionSurvey.service");

/* =========================================================
   RENDER SURVEY PAGE
   - ส่งไฟล์ HTML ให้ client
========================================================= */
exports.renderSurvey = (req, res) => {
  const filePath = path.join(
    __dirname,
    "views",
    "satisfactionSurvey.view.html"
  );

  console.log("📄 Render survey:", filePath);
  res.sendFile(filePath);
};

/* =========================================================
   SUBMIT SURVEY
   - รับ payload จาก client (req.body)
   - ส่งต่อไปยัง service.saveSurvey
   - ส่งผลลัพธ์กลับเป็น JSON
========================================================= */
exports.submitSurvey = async (req, res) => {
  try {
    console.log("📩 survey payload:", req.body);

    const result = await service.saveSurvey(req.body);

    return res.json(result);
  } catch (err) {
    console.error("❌ submitSurvey error:", err);
    return res.status(500).json({ status: "error" });
  }
};