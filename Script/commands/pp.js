module.exports.config = {
  name: "pp",
  version: "2.0.0",
  hasPermssion: 0,
  credits: "🔰𝐑𝐀𝐇𝐀𝐓 𝐈𝐒𝐋𝐀𝐌🔰",
  description: "Get user profile picture and info",
  commandCategory: "Tool",
  usages: "[@mention/reply/UID/link/name]",
  cooldowns: 5
};

async function getUIDByFullName(api, threadID, body) {
  if (!body.includes("@")) return null;
  
  const match = body.match(/@(.+)/);
  if (!match) return null;
  
  const targetName = match[1].trim().toLowerCase().replace(/\s+/g, " ");
  const threadInfo = await api.getThreadInfo(threadID);
  const users = threadInfo.userInfo || [];
  
  const user = users.find(u => {
    if (!u.name) return false;
    const fullName = u.name.trim().toLowerCase().replace(/\s+/g, " ");
    return fullName === targetName;
  });
  
  return user ? user.id : null;
}

// ===== Helper: Download and Send Profile Picture =====
async function sendProfilePicture(api, event, uid, userName = "") {
  const fs = global.nodemodule["fs-extra"];
  const request = global.nodemodule["request"];
  const axios = global.nodemodule['axios'];
  
  try {
    // Get user information
    let userData = {};
    try {
      userData = await api.getUserInfoV2(uid);
    } catch (e) {
      console.error("Error getting user info:", e);
    }
    
    const name = userData.name || userName || "User";
    const username = userData.username || "";
    const link = userData.link || `https://facebook.com/${uid}`;
    const gender = userData.gender || "Unknown";
    
    const callback = () => api.sendMessage({
      body: `📛𝗡𝗮𝗺𝗲 ${name}\n` +
            `🆔𝗨𝗶𝗱 ${uid}\n` +
            `🚻𝗚𝗲𝗻𝗱𝗲𝗿 ${gender}\n`,
      attachment: fs.createReadStream(__dirname + "/cache/1.png")
    }, event.threadID, () => fs.unlinkSync(__dirname + "/cache/1.png"), event.messageID);
    
    return request(encodeURI(`https://graph.facebook.com/${uid}/picture?height=1500&width=1500&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`))
      .pipe(fs.createWriteStream(__dirname + '/cache/1.png'))
      .on('close', () => callback());
      
  } catch (error) {
    console.error("Error in sendProfilePicture:", error);
    return api.sendMessage("❌ প্রোফাইল ছবি লোড করতে সমস্যা হয়েছে!", event.threadID, event.messageID);
  }
}

module.exports.run = async function({ event, api, args, client, Currencies, Users, utils, __GLOBAL, reminder }) {
  const { threadID, messageID, senderID } = event;
  
  // ===== Determine targetID in three ways =====
  let targetID;
  let userName = "";
  
  if (event.type === "message_reply") {
    // Way 1: Reply to a message
    targetID = event.messageReply.senderID;
    try {
      const userInfo = await Users.getData(targetID);
      userName = userInfo.name || "";
    } catch (e) {
      // Ignore error
    }
  } else if (args[0]) {
    if (args[0].indexOf(".com/") !== -1) {
      // Way 2: Facebook profile link
      try {
        targetID = await api.getUID(args[0]);
        try {
          const userData = await api.getUserInfoV2(targetID);
          userName = userData.name || "";
        } catch (e) {
          // Ignore error
        }
      } catch (e) {
        console.error("Error getting UID from link:", e);
        return api.sendMessage("❌ Facebook লিঙ্ক থেকে আইডি পাওয়া যায়নি!", threadID, messageID);
      }
    } else if (args.join().includes("@")) {
      // Way 3: Mention or full name
      // 3a: Direct Facebook mention
      targetID = Object.keys(event.mentions || {})[0];
      if (targetID) {
        userName = event.mentions[targetID] || "";
        userName = userName.replace("@", "");
      } else {
        // 3b: Full name detection
        targetID = await getUIDByFullName(api, threadID, args.join(" "));
        if (targetID) {
          try {
            const userData = await api.getUserInfoV2(targetID);
            userName = userData.name || "";
          } catch (e) {
            // Ignore error
          }
        }
      }
    } else {
      // Direct UID
      targetID = args[0];
      try {
        const userData = await api.getUserInfoV2(targetID);
        userName = userData.name || "";
      } catch (e) {
        // Ignore error
      }
    }
  } else {
    // No target specified - get own profile
    targetID = senderID;
    try {
      const userInfo = await Users.getData(senderID);
      userName = userInfo.name || "";
    } catch (e) {
      // Ignore error
    }
  }
  
  if (!targetID) {
    return api.sendMessage("❌ইউজার ডিটেক্ট করা যায়নি", threadID, messageID);
  }
  
  // Validate UID format
  if (!/^\d+$/.test(targetID)) {
    return api.sendMessage("❌Facebook থেকে আইডি পাওয়া যায়নি!", threadID, messageID);
  }
  
  // Check if it's a valid Facebook UID (minimum length check)
  if (targetID.length < 5) {
    return api.sendMessage("❌Facebook থেকে আইডি পাওয়া যায়নি!", threadID, messageID);
  }
  
  return sendProfilePicture(api, event, targetID, userName);
};
