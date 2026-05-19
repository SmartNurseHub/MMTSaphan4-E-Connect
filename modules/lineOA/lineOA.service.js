/******************************************************************
 * LINE OA SERVICE MODULE (CLEAN PRODUCTION VERSION)
 *****************************************************************/

const { Client } = require("@line/bot-sdk");
const lineAPI = require("./lineOA.line.service");
const nursingService = require("../nursingRecords/nursingRecords.service");

const {
  appendRow,
  readRows,
  updateRow,
  deleteRow
} = require("@config/google")

/* =========================================================
   CONFIG
========================================================= */

const LINE_UID_SHEET = "LineUID";
const FOLLOW_SHEET = "FollowList";

const lineClient = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
});

/* =========================================================
   UTILS
========================================================= */

const norm = (v) => (v ?? "").toString().trim();

const safeReply = async (event, message) => {
  if (!event?.replyToken || event.replyToken === "00000000000000000000000000000000") return;

  try {
    await lineClient.replyMessage(event.replyToken, message);
  } catch (err) {
    console.error("[LINE_REPLY_ERROR]", err.message);
  }
};

/* =========================================================
   LINE UID FINDER
========================================================= */

async function findUserRow(userId) {
  const rows = await readRows(LINE_UID_SHEET);
  if (!rows?.length) return null;

  const idx = rows.findIndex((r, i) => i > 0 && norm(r[4]) === userId);
  if (idx === -1) return null;

  return { row: rows[idx], index: idx };
}

/* =========================================================
   FOLLOW EVENT (CLEAN)
========================================================= */

async function handleFollowEvent(event) {
  try {
    const userId = norm(event.source?.userId);
    if (!userId) return;

    const profile = await lineAPI.getProfile(userId) || {};
    const found = await findUserRow(userId);

    if (found) {
      found.row[5] = profile.displayName || found.row[5];
      found.row[6] = profile.pictureUrl || found.row[6];

      await updateRow(LINE_UID_SHEET, found.index + 1, found.row);

      return safeReply(event, {
        type: "text",
        text: "ยินดีต้อนรับกลับค่ะ 😊"
      });
    }

    await appendRow(LINE_UID_SHEET, [
      new Date().toISOString(),
      "",
      "",
      "",
      userId,
      profile.displayName || "",
      profile.pictureUrl || "",
      "WAIT_CID",
      ""
    ]);

    return safeReply(event, {
      type: "text",
      text: "กรุณาลงทะเบียนด้วยเลขบัตรประชาชน 13 หลัก"
    });

  } catch (err) {
    console.error("[FOLLOW_ERROR]", err);
  }
};

/* =========================================================
   CHAT HANDLER
========================================================= */

async function handleChatMessage(event) {
  try {

    const userId = norm(event.source?.userId);
    const text = norm(event.message?.text);

    if (!userId) return;

    const found = await findUserRow(userId);

    if (!found) {
      return safeReply(event, {
        type: "text",
        text: "กรุณากดเพิ่มเพื่อนใหม่อีกครั้ง"
      });
    }

    const { row, index } = found;
    const status = norm(row[7]).toUpperCase();

    /* ================= WAIT_CID ================= */
    if (status === "WAIT_CID") {

      const cid = text.replace(/\D/g, "");

      if (!/^\d{13}$/.test(cid)) {
        return safeReply(event, {
          type: "text",
          text: "กรุณากรอกเลขบัตรประชาชน 13 หลัก"
        });
      }

      const rows = await readRows(LINE_UID_SHEET);

      const existsIndex = rows.findIndex((r, i) => i > 0 && norm(r[1]) === cid);

      if (existsIndex !== -1) {
        rows[existsIndex][4] = userId;
        rows[existsIndex][7] = "ACTIVE";

        await updateRow(LINE_UID_SHEET, existsIndex + 1, rows[existsIndex]);

        if (existsIndex !== index) {
          await deleteRow(LINE_UID_SHEET, index + 1);
        }

        return safeReply(event, {
          type: "text",
          text: "เชื่อมข้อมูลสำเร็จ ✅"
        });
      }

      row[1] = cid;
      row[7] = "WAIT_NAME";
      await updateRow(LINE_UID_SHEET, index + 1, row);

      return safeReply(event, {
        type: "text",
        text: "กรุณากรอกชื่อ นามสกุล"
      });
    }

    /* ================= WAIT_NAME ================= */
    if (status === "WAIT_NAME") {

      const parts = text.split(/\s+/);

      if (parts.length < 2) {
        return safeReply(event, {
          type: "text",
          text: "กรุณากรอก: ชื่อ นามสกุล"
        });
      }

      row[2] = parts[0];
      row[3] = parts.slice(1).join(" ");
      row[7] = "WAIT_PHONE";

      await updateRow(LINE_UID_SHEET, index + 1, row);

      return safeReply(event, {
        type: "text",
        text: "กรุณากรอกเบอร์โทร"
      });
    }

    /* ================= WAIT_PHONE ================= */
    if (status === "WAIT_PHONE") {

      if (!/^0\d{8,9}$/.test(text)) {
        return safeReply(event, {
          type: "text",
          text: "เบอร์โทรไม่ถูกต้อง"
        });
      }

      row[8] = text;
      row[7] = "ACTIVE";

      await updateRow(LINE_UID_SHEET, index + 1, row);

      return safeReply(event, {
        type: "text",
        text: "ลงทะเบียนสำเร็จ 🎉"
      });
    }

    /* ================= ACTIVE ================= */
    if (status === "ACTIVE") {
      if (text !== "สมัคร") return;

      return safeReply(event, {
        type: "text",
        text: "คุณลงทะเบียนแล้วค่ะ ✅"
      });
    }

  } catch (err) {
    console.error("[CHAT_ERROR]", err);
  }
}

/* =========================================================
   SEND REPORT
========================================================= */

async function sendReport(nsr) {
  const record = await nursingService.getByNSR(nsr);
  if (!record) throw new Error("NSR not found");

  const rows = await readRows(LINE_UID_SHEET);

  const user = rows.find(r =>
    norm(r[1]) === norm(record.CID) &&
    norm(r[7]).toUpperCase() === "ACTIVE"
  );

  if (!user) throw new Error("User not linked LINE");

  const userId = norm(user[4]);

  await lineAPI.pushFlexResult({
    userId,
    nsr,
    fullName: `${record.PRENAME} ${record.NAME} ${record.LNAME}`,
    dateService: record.DateService,
    list: record.Activity,
    result: record.HealthInform,
    advice: record.HealthAdvice,
    status: record.status,
    fileURL: record.fileURL || null
  });

  return true;
}

/* =========================================================
   UNFOLLOW
========================================================= */

async function handleUnfollowEvent(event) {
  try {
    const userId = norm(event.source?.userId);

    await appendRow(FOLLOW_SHEET, [
      new Date().toISOString(),
      "unfollow",
      userId,
      "",
      "",
      ""
    ]);
  } catch (err) {
    console.error("[UNFOLLOW_ERROR]", err);
  }
}


async function safePush(userId, message, retry = 3) {
  for (let i = 0; i < retry; i++) {
    try {
      const res = await lineClient.pushMessage(userId, message);
      console.log("📨 LINE PUSH SUCCESS:", res);
      return res;
    } catch (err) {
      console.error("❌ LINE PUSH ERROR:", {
        status: err.status,
        message: err.message,
        data: err.originalError?.response?.data
      });

      if (i === retry - 1) throw err;
      await new Promise(r => setTimeout(r, 500 * (i + 1)));
    }
  }
}
/* =========================================================
   EXPORT
========================================================= */
module.exports = {
  lineClient,
  handleFollowEvent,
  handleChatMessage,
  handleUnfollowEvent,

  pushMessage: safePush,   // ✅ ใส่ตรงนี้แทน

  safePush,
  sendReport
};