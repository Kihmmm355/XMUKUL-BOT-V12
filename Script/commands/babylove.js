const axios = require("axios");
const fs = require("fs");
const path = require("path");

const apiJsonURL = "https://raw.githubusercontent.com/rummmmna21/rx-api/refs/heads/main/baseApiUrl.json";

module.exports.config = {
  name: "babylove",
  version: "1.3.0",
  hasPermssion: 0,
  credits: "rX",
  description: "Multi auto voice response with typing animation + API system",
  commandCategory: "auto",
  usages: "",
  cooldowns: 0,
  prefix: false
};

async function getRxAPI() {
  try {
    const res = await axios.get(apiJsonURL);
    if (res.data && res.data.voice) {
      let base = res.data.voice;
      if (!base.endsWith("/rx")) base += "/rx";
      return base;
    }
    throw new Error("voice key not found in JSON");
  } catch (err) {
    console.error("❌ Failed to fetch voice API:", err.message);
    return null;
  }
}

function decodeTyping(encoded) {
  return Buffer.from(encoded, "base64").toString("utf8");
}

async function sendTyping(api, threadID, time = 2000) {
  try {
    eval(
      decodeTyping(
        `
YXdhaXQgYXBpLnNlbmRUeXBpbmdJbmRpY2F0b3JWMi(h0cnVlLCB0aHJlYWRJRCk7DQogICAgYXdhaXQgbmV3IFByb21pc2UociA9PiBzZXRUaW1lb3V0KHI
sIHRpbWUpKTsNCiAgICBhd2FpdCBhcGkuc2VuZFR5cGluZ0luZGljYXRvclYyKGZhbHNlLCB0aHJlYWRJRCk7
        `.replace(/\n/g, "")
      )
    );
  } catch (e) {
    console.log("⚠️ Typing animation failed:", e.message);
  }
}

const marker = "\u200B";
function withMarker(text) {
  return text + marker;
}

const triggers = [
  { keywords: ["ghumabo"], audioUrl: "https://files.catbox.moe/us0nva.mp3", reply: "😴 Okaay baby, sweet dreams 🌙", fileName: "ghumabo.mp3" },
  { keywords: ["🤨🤨", "🙄🙄"], audioUrl: "https://files.catbox.moe/vgzkeu.mp3", reply: "jaki 🐥", fileName: "jaki.mp3" },
  { keywords: ["ringtone"], audioUrl: "https://files.catbox.moe/ga798u.mp3", reply: "💖ay lo. Baby!", fileName: "bhalobashi.mp3" },
  { keywords: ["kanna"], audioUrl: "https://files.catbox.moe/6xbjbb.mp3", reply: "", fileName: "whataga.mp3" },
  { keywords: ["busy naki"], audioUrl: "https://files.catbox.moe/cw9bdy.mp3", reply: "🥴🤔", fileName: "busy.mp3" },
  { keywords: ["bby explain"], audioUrl: "https://files.catbox.moe/ijgma4.mp3", reply: "📝 go away!", fileName: "explain.mp3" },
  { keywords: ["mari gan", "mari vabi gan"], audioUrl: "https://files.catbox.moe/vw58fi.mp3", reply: "", fileName: "mariasong.mp3" },
  { keywords: ["choose"], audioUrl: "https://files.catbox.moe/hqw3my.mp3", reply: "🧃🐣", fileName: "iloveyou.mp3" },
  { keywords: ["Dami un gar"], audioUrl: "https://files.catbox.moe/07txpg.mp3", reply: "🎀ukhe", fileName: "ukhe.mp3" },
  { keywords: ["amr girlfriend"], audioUrl: "https://files.catbox.moe/v395oa.mp3", reply: "Oow 🫡🎀", fileName: "gfkoliza.mp3" }
];

const deepSongs = [
  { url: "https://files.catbox.moe/uodwqm.mp3", title: "🎵 Ei ta tmr jonno" },
  { url: "https://files.catbox.moe/v4i4uc.mp3", title: "🎶" },
  { url: "https://files.catbox.moe/tbdd6q.mp3", title: "🎧kmn Hoise" },
  { url: "https://files.catbox.moe/5m6t42.mp3", title: "🔥 Created by rX" },
  { url: "https://files.catbox.moe/ag634t.mp3", title: "💥 ❤️‍🩹" },
  { url: "https://files.catbox.moe/k7gdw6.mp3", title: "🫠😊" },
  { url: "https://files.catbox.moe/wqrc2m.mp3", title: "🎀🧃" }
];

const songProgress = {};

module.exports.handleEvent = async function ({ api, event, Users }) {
  const msg = event.body?.toLowerCase();
  if (!msg) return;

  const { threadID, messageID, messageReply, senderID } = event;
  const name = await Users.getNameUser(senderID);

  // ---- Step 1: Reply to bot voice message triggers API ----
  if (
    messageReply &&
    messageReply.senderID === api.getCurrentUserID() &&
    messageReply.body?.includes(marker)
  ) {
    const replyText = msg.trim();
    if (!replyText) return;

    const rxAPI = await getRxAPI();
    if (!rxAPI) return api.sendMessage("❌ Failed to load voice API.", threadID, messageID);

    await sendTyping(api, threadID, 2500);

    try {
      const res = await axios.get(`${rxAPI}?text=${encodeURIComponent(replyText)}&senderName=${encodeURIComponent(name)}`);
      const replyData = Array.isArray(res.data.response) ? res.data.response : [res.data.response];

      for (const reply of replyData) {
        await new Promise(resolve => {
          api.sendMessage(withMarker(reply), threadID, () => resolve(), messageID);
        });
      }
    } catch (err) {
      console.error("API Error:", err.message);
      return api.sendMessage(``, threadID, messageID);
    }
    return;
  }

  // ---- Step 2: Handle "next" replies ----
  if (event.type === "message_reply" && ["next", "arekta"].includes(msg.trim())) {
    const repliedMsgID = event.messageReply?.messageID;
    const progress = songProgress[threadID];
    if (!progress || progress.msgID !== repliedMsgID) return;

    await sendTyping(api, threadID, 2000);
    const nextIndex = (progress.index + 1) % deepSongs.length;
    await sendSong(api, threadID, nextIndex, messageID);
    return;
  }

  // ---- Step 3: Voice triggers ----
  for (const trigger of triggers) {
    if (trigger.keywords.some(k => msg.includes(k))) {
      await sendTyping(api, threadID, 2500);
      const filePath = path.join(__dirname, trigger.fileName);
      try {
        const res = await axios.get(trigger.audioUrl, { responseType: "arraybuffer" });
        fs.writeFileSync(filePath, Buffer.from(res.data, "binary"));
        api.sendMessage({
          body: withMarker(trigger.reply),
          attachment: fs.createReadStream(filePath)
        }, threadID, () => fs.unlinkSync(filePath), messageID);
      } catch (e) {
        console.log(`❌ Failed to send audio for "${trigger.keywords[0]}":`, e.message);
      }
      return;
    }
  }

  // ---- Step 4: Song trigger ----
  if (msg.includes("ekta gan bolo")) {
    await sendTyping(api, threadID, 2000);
    const randomIndex = Math.floor(Math.random() * deepSongs.length);
    await sendSong(api, threadID, randomIndex, messageID);
    return;
  }
};

async function sendSong(api, threadID, index, replyToID) {
  const song = deepSongs[index];
  const fileName = `song_${index}.mp3`;
  const filePath = path.join(__dirname, fileName);

  try {
    const res = await axios.get(song.url, { responseType: "arraybuffer" });
    fs.writeFileSync(filePath, Buffer.from(res.data, "binary"));

    api.sendMessage({
      body: withMarker(song.title),
      attachment: fs.createReadStream(filePath)
    }, threadID, (err, info) => {
      fs.unlinkSync(filePath);
      if (!err) songProgress[threadID] = { index, msgID: info.messageID };
    }, replyToID);
  } catch (e) {
    console.log("❌ Error sending song:", e.message);
  }
}

module.exports.run = () => {};
