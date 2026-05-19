/* =========================================================
   sendLineVaccine
========================================================= */
async function sendLineVaccine(vcn) {

  const lockKey = `lock:line:${vcn}`;
  const sendingKey = `sending:line:${vcn}`;
  const sentKey = `sent:line:${vcn}`;

  // 🔒 กันยิงพร้อมกันทุก instance
  const locked = await acquireLock(lockKey, 14000);

  if (!locked) {
    logInfo("[SKIP_LOCKED]", { vcn });
    return { success: true, skipped: "LOCKED" };
  }

  try {

    logInfo("[SEND_LINE_VACCINE_START]", { vcn });

    // ✅ เคยส่งแล้ว → ไม่ต้องส่งอีก
    if (await isExists(sentKey)) {
      logInfo("[SKIP_DUPLICATE_SENT]", { vcn });
      return { success: true, skipped: "ALREADY_SENT" };
    }

    // ⛔ กำลังส่งอยู่ → skip
    if (await isExists(sendingKey)) {
      logInfo("[SKIP_SENDING]", { vcn });
      return { success: true, skipped: "SENDING" };
    }

    // 🔥 mark ว่ากำลังส่ง
    await setKey(sendingKey, 30000);

    /* ================= GET RECORD ================= */
    const record = await getVaccinationByVCN(vcn);
    if (!record) throw new Error("Vaccination record not found");

    /* ================= GET PATIENT ================= */
    const patient = await getPatient(record.cid);
    if (!patient) throw new Error("Patient not found");

    /* ================= LINE UID ================= */
    let lineUID = String(patient.lineUID || "").trim();

    if (!lineUID) {
      logInfo("[LINE_UID_CACHE_MISS]", { cid: record.cid });
      lineUID = await getLineUIDByCID(record.cid);
    }

    if (!lineUID) {
      logError("[LINE_UID_NOT_FOUND]", { cid: record.cid });
      return { success: false, error: "LINE UID not found" };
    }

    logInfo("[LINE_UID_FOUND]", { lineUID });

    /* ================= VACCINE MASTER ================= */
    const vaccines = await getVaccineMaster();

    const code = String(record.vaccineCode || "").trim().toUpperCase();

    const vaccine = vaccines.find(v =>
      String(v.code || "").trim().toUpperCase() === code
    ) || {};

    const vaccineNameTH = vaccine.TH_Name || "-";
    const vaccineNameEN = vaccine.name || "-";
    const totalDose = vaccine.totalDose ?? "-";

    /* ================= FLEX MESSAGE ================= */
    // ❗ ใช้ Flex เดิมของคุณ 그대로 (ไม่แก้ ไม่ตัด)

    const flex = {
      type: "flex",
      altText: "Vaccination Record",
      contents: {
        type: "bubble",
        size: "mega",
        hero: {
          type: "image",
          url: "https://drive.google.com/uc?export=view&id=1O366lb3XphBKeVv51F5nNHIOEvdEh-jI",
          size: "full",
          aspectRatio: "20:13",
          aspectMode: "cover"
        },
        body: {
          type: "box",
          layout: "vertical",
          spacing: "lg",
          contents: [
            {
              type: "text",
              text: "บันทึกการได้รับวัคซีน",
              weight: "bold",
              size: "xl",
              align: "center",
              color: "#006666"
            },
            {
              type: "text",
              text: "VACCINATION RECORD",
              size: "sm",
              align: "center",
              color: "#9E9E9E"
            },
            { type: "separator" },
            {
              type: "text",
              text: `${patient.firstName} ${patient.lastName}`,
              size: "xl",
              weight: "bold",
              align: "center",
              color: "#fba003fd"
            },
            { type: "separator" },
            {
              type: "text",
              text: "📅 วันที่รับบริการ",
              weight: "bold",
              color: "#0277BD"
            },
            {
              type: "text",
              text: record.dateService || "-",
              size: "md"
            },
            { type: "separator" },
            {
              type: "text",
              text: "📋 รายละเอียดวัคซีน",
              weight: "bold",
              color: "#0277BD"
            },
            {
              type: "box",
              layout: "vertical",
              spacing: "sm",
              margin: "md",
              contents: [
                {
                  type: "text",
                  text: vaccineNameTH,
                  weight: "bold",
                  size: "md",
                  wrap: true
                },
                {
                  type: "text",
                  text: `(${vaccineNameEN})`,
                  size: "xs",
                  color: "#757575"
                },
                {
                  type: "text",
                  text: `Lot: ${record.lotNumber || "-"} | Dose ${record.doseNo}/${totalDose}`,
                  size: "xs",
                  color: "#757575"
                }
              ]
            }
          ]
        },
        footer: {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          contents: [
            {
              type: "button",
              style: "primary",
              color: "#6A1B9A",
              action: {
                type: "uri",
                label: "💉 ประวัติวัคซีน",
                uri: `https://liff.line.me/2007902507-SCwT4XsP/vaccine-history.html?cid=${record.cid}`
              }
            }
          ]
        }
      }
    };

    /* ================= PUSH WITH RETRY ================= */

    let pushSuccess = false;
    let lastError = null;

    for (let i = 1; i <= 3; i++) {
      try {
        await lineService.pushMessage(lineUID, flex);
        pushSuccess = true;
        logInfo("[LINE_PUSH_SUCCESS]", { vcn, lineUID, try: i });
        break;
      } catch (err) {
        lastError = err;
        logError("[LINE_RETRY_FAIL]", { try: i, error: err.message });
        await new Promise(r => setTimeout(r, 500 * i));
      }
    }

    if (!pushSuccess) {
      logError("[LINE_PUSH_FAILED_FINAL]", lastError?.message);
      return { success: false, error: lastError?.message };
    }

    // ✅ mark ว่าส่งสำเร็จแล้ว
    await setKey(sentKey, 86400000); // 24 ชม.

    logInfo("[SEND_LINE_SUCCESS]", { vcn, lineUID });

    return { success: true };

  } catch (err) {

    logError("[SEND_LINE_ERROR]", err.message);

    return { success: false, error: err.message };

  } finally {

    // 🔓 ปล่อย lock เสมอ
    await releaseLock(lockKey);

    // ❗ ลบ sendingKey เพื่อให้ retry ได้
    await redis.del(sendingKey);

    logInfo("[SEND_LINE_FINISH]", { vcn });

  }
}


/* =========================================================
   sendLineByButton
========================================================= */    
async function sendLineByButton(vcn) {

  const key = `BTN_LINE_${vcn}`;

  if (isDuplicate(key)) {
    return { success: false, message: "duplicate click blocked" };
  }

  markDone(key);

  return await sendLineVaccine(vcn);
}


/* =========================================================
   pushLineRetry
========================================================= */
async function pushLineRetry(lineUID,message,retry=3){

  for(let i=0;i<retry;i++){

    try{

      await lineService.pushMessage(lineUID,message);

      logInfo("LINE_SENT",{lineUID});

      return true;

    }catch(err){

      logError("LINE_RETRY",{try:i+1,error:err.message});

      if(i === retry-1){
        throw err;
      }

      await new Promise(r=>setTimeout(r,1000));

    }

  }

}
