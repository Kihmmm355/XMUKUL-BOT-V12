const axios = require("axios");

module.exports.config = {
  name: "ffinfo",
  aliases: ["freefireinfo", "ffstats"],
  version: "2.1.0",
  hasPermssion: 0,
  credits: "🔰𝐑𝐀𝐇𝐀𝐓 𝐈𝐒𝐋𝐀𝐌🔰",
  description: "Show complete Free Fire player info",
  commandCategory: "Game",
  usages: "ffinfo <uid>",
  cooldowns: 5
};

module.exports.run = async function ({ api, event, args }) {
  try {
    const uid = args[0];
    if (!uid) {
      return api.sendMessage(
        "⚠️ Free Fire UID দাও\n📌 Example: ffinfo 3160644273",
        event.threadID,
        event.messageID
      );
    }

    const wait = await api.sendMessage(
      "⏳ Free Fire player info আনা হচ্ছে...",
      event.threadID
    );

    const url = `https://ff.mlbbai.com/info/?uid=${uid}`;
    const res = await axios.get(url);
    const data = res.data;

    if (!data || !data.basicInfo) {
      return api.editMessage(
        "❌ UID ভুল বা ডাটা পাওয়া যায়নি!",
        wait.messageID
      );
    }

    const b = data.basicInfo;
    const clan = data.clanBasicInfo || {};
    const pet = data.petInfo || {};
    const social = data.socialInfo || {};
    const credit = data.creditScoreInfo || {};
    const cap = data.captainBasicInfo || {};

    const msg = `
🎮 𝐅ʀᴇᴇ 𝐅ɪʀᴇ 𝐏ʟᴀʏᴇʀ 𝐈ɴꜰᴏ
━━━━━━━━━━━━━━
👤 Name: ${b.nickname || "N/A"}
🆔 UID: ${b.accountId || uid}
🌍 Region: ${b.region || "N/A"}
⭐ Level: ${b.level || "N/A"}
❤️ Likes: ${b.liked || 0}

🏆 Rank: ${b.rank || "N/A"}
🎯 Rank Points: ${b.rankingPoints || 0}
⚔️ CS Rank: ${b.csRank || "N/A"}
🎮 CS Points: ${b.csRankingPoints || 0}

🎟️ Elite Pass: ${b.hasElitePass ? "Yes ✅" : "No ❌"}
📅 Account Created: ${new Date(b.createAt * 1000).toLocaleDateString("en-GB")}

🛡️ Guild Info
━━━━━━━━━━━━━━
🏷️ Name: ${clan.clanName || "None"}
👥 Members: ${clan.memberNum || 0}/${clan.capacity || 0}
👑 Leader: ${cap.nickname || "N/A"}

🐾 Pet Info
━━━━━━━━━━━━━━
🐶 Name: ${pet.name || "None"}
📈 Level: ${pet.level || "N/A"}

🌐 Social Info
━━━━━━━━━━━━━━
🚻 Gender: ${social.gender?.replace("Gender_", "") || "N/A"}
🗣️ Language: ${social.language?.replace("Language_", "") || "N/A"}

🛡️ Credit Score
━━━━━━━━━━━━━━
💯 Score: ${credit.creditScore || "N/A"}

`;

    await api.editMessage(msg, wait.messageID);
  } catch (err) {
    api.sendMessage(
      `❌ Error: ${err.message}`,
      event.threadID,
      event.messageID
    );
  }
};
