const { Client } = require("@line/bot-sdk");

const lineClient = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
});

async function broadcastRegister() {

  try {

    await lineClient.broadcast({
  type: "flex",
  altText: "ลงทะเบียนใช้งานระบบ",
  contents: {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      contents: [
        {
          type: "text",
          text: "📢 ระบบอัปเดตใหม่",
          weight: "bold",
          size: "lg"
        },
        {
          type: "text",
          text: "กรุณากดปุ่มด้านล่างเพื่อลงทะเบียนใช้งานระบบ",
          wrap: true
        }
      ]
    },
    footer: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "button",
          style: "primary",
          action: {
            type: "message",
            label: "ลงทะเบียน",
            text: "ลงทะเบียน"
          }
        }
      ]
    }
  }
});

    console.log("✅ Broadcast success");

  } catch (err) {

    console.error("❌ Broadcast error:", err);

  }

}

module.exports = {
  broadcastRegister
};