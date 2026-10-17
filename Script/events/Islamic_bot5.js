const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");

module.exports.config = {
  name: "joinNotify", //⚠️ 𝗗𝗼𝗻'𝘁 𝗖𝗵𝗮𝗻𝗴𝗲 𝗡𝗮𝗺𝗲 — 𝗖𝗺𝗱 𝗪𝗶𝗹𝗹 𝗡𝗼𝘁 𝗪𝗼𝗿𝗸✅
  eventType: ["log:subscribe"],
  version: "4.1.0",
  credits: "🔰𝐑𝐀𝐇𝐀𝐓 𝐈𝐒𝐋𝐀𝐌🔰", //⚠️ 𝗗𝗼𝗻'𝘁 𝗖𝗵𝗮𝗻𝗴𝗲 𝗖𝗿𝗲𝗱𝗶𝘁 — 𝗖𝗺𝗱 𝗪𝗼𝗻'𝘁 𝗪𝗼𝗿𝗸✅
  description: "Welcome image (API frame + profile circles) + local text overlay + caption"
};

const API_JSON_URL = "https://xrahat-dev-api.vercel.app/raw/All-Api";
const TEXT_LAYOUT = {
  addedName:   { x: 809.9,  y: 494.2, fontSize: 89,  color: "#0f2f2b", bold: true, italic: false },
  groupName:   { x: 1096.4, y: 620.1, fontSize: 48,  color: "#6b7280", bold: true, italic: false },
  memberCount: { x: 1089.9, y: 736.4, fontSize: 56,  color: "#6b7280", bold: true, italic: false },
  adderName:   { x: 1017.6, y: 791.3, fontSize: 56,  color: "#6b7280", bold: true, italic: false }
};

function drawAnchoredText(ctx, text, layout) {
  if (!text) text = "";
  const { x, y, fontSize, color, bold, italic } = layout;
  const style = `${italic ? "italic " : ""}${bold ? "bold " : ""}${fontSize}px Arial`;
  ctx.font = style;
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const firstCharWidth = ctx.measureText(text[0] || "").width;
  const startX = x - firstCharWidth / 2;
  ctx.fillText(text, startX, y);
}

async function getApiList(commandName) {
  const res = await axios.get(API_JSON_URL, { timeout: 15000 });
  const data = res.data || {};
  const cmdData = data[commandName];
  if (!cmdData || !cmdData.api) return [];
  return [cmdData.api, ...(cmdData.backupApis || [])].filter(Boolean);
}
async function fetchFromAPI(uid, name, adderId, adderName, groupName, memberCount, credit, apiList) {
  for (const base of apiList) {
    const cleanBase = base.replace(/\/+$/, "");
    const url = `${cleanBase}/api/frame?uid=${uid}&name=${encodeURIComponent(name)}&adderId=${adderId}&adderName=${encodeURIComponent(adderName)}&groupName=${encodeURIComponent(groupName)}&memberCount=${memberCount}&credit=${encodeURIComponent(credit)}`;
    try {
      const res = await axios.get(url, { timeout: 30000, responseType: 'json' });
      if (res.data.image && res.data.caption) {
        return {
          image: Buffer.from(res.data.image, 'base64'),
          caption: res.data.caption
        };
      }
    } catch (err) {
      continue;
    }
  }
  throw new Error("কোনো ওয়ার্কিং API পাওয়া যায়নি");
}

module.exports.run = async function ({ api, event }) {
  if (!event.logMessageData || !event.logMessageData.addedParticipants) return;

  // বট নিজে এড হলে
  if (event.logMessageData.addedParticipants.some(i => i.userFbId == api.getCurrentUserID())) {
    const botPrefix = global.config.PREFIX || "/";
    const botName = global.config.BOTNAME || "🔰𝐑𝐀𝐇𝐀𝐓 𝐈𝐒𝐋𝐀𝐌";
    api.changeNickname(`[ ${botPrefix} ] • ${botName}`, event.threadID, api.getCurrentUserID());
    api.sendMessage("গ্রুপে এড দেওয়ার জন্য ধন্যবাদ🙃🫣", event.threadID);
    return;
  }

  const threadID = event.threadID;
  const threadInfo = await api.getThreadInfo(threadID);
  const groupName = threadInfo.threadName || "এই গ্রুপ";
  const memberCount = threadInfo.participantIDs.length;
  const addedUsers = event.logMessageData.addedParticipants;

  const adderID = event.author;
  let adderName = "Unknown";
  try {
    const adderInfo = await api.getUserInfo(adderID);
    adderName = (adderInfo[adderID] && adderInfo[adderID].name) || adderName;
  } catch (e) {}

  let apiList;
  try {
    apiList = await getApiList("welcome");
  } catch (e) {
    return api.sendMessage(`⚠️ API লিস্ট লোড করতে সমস্যা: ${e.message}`, threadID);
  }

  const attachments = [];
  const mentions = addedUsers.map(u => ({ tag: u.fullName, id: u.userFbId }));
  let finalCaption = "";

  for (const user of addedUsers) {
    const uid = user.userFbId;
    const name = user.fullName;

    let baseImage, caption;
    try {
      const result = await fetchFromAPI(
        uid, name,
        adderID, adderName,
        groupName, memberCount,
        module.exports.config.credits,
        apiList
      );
      baseImage = result.image;
      caption = result.caption;
      if (!finalCaption) finalCaption = caption;
    } catch (err) {
      console.error(`API কল ব্যর্থ (${name}):`, err.message);
      continue;
    }

    const outPath = path.join(__dirname, `welcome_${uid}.png`);
    try {
      const img = await loadImage(baseImage);
      const canvas = createCanvas(1586, 992);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, 1586, 992);
      drawAnchoredText(ctx, name, TEXT_LAYOUT.addedName);
      drawAnchoredText(ctx, groupName, TEXT_LAYOUT.groupName);
      drawAnchoredText(ctx, String(memberCount), TEXT_LAYOUT.memberCount);
      drawAnchoredText(ctx, adderName, TEXT_LAYOUT.adderName);

      fs.writeFileSync(outPath, canvas.toBuffer('image/png'));
      attachments.push(fs.createReadStream(outPath));
    } catch (e) {
      console.error("টেক্সট রেন্ডার বা সেভ করতে সমস্যা:", e);
    }
  }

  if (attachments.length === 0) {
    return api.sendMessage("⚠️ইমেজ তৈরি করতে ব্যর্থ হয়েছে।", threadID);
  }

  try {
    await api.sendMessage({
      body: finalCaption,
      mentions,
      attachment: attachments
    }, threadID);
  } catch (e) {
    await api.sendMessage({ body: finalCaption, mentions }, threadID);
  }
  setTimeout(() => {
    for (const user of addedUsers) {
      const fp = path.join(__dirname, `welcome_${user.userFbId}.png`);
      try { if (fs.existsSync(fp)) fs.unlinkSync(fp); } catch (e) {}
    }
  }, 120000);
};
