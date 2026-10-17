const fs = require("fs-extra");
const request = require("request");

module.exports.config = {
    name: "ckuser",
    version: "1.1.0",
    hasPermssion: 0,
    credits: "rX & 🔰𝐑𝐀𝐇𝐀𝐓 𝐈𝐒𝐋𝐀𝐌🔰",
    description: "Check user information with multiple mention detection",
    commandCategory: "Media",
    usages: "[@mention/reply/UID/link/name]",
    cooldowns: 5
};

// ===== Helper: Full Name Mention Detection =====
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

module.exports.run = async ({ api, event, args }) => {
    const { threadID, messageID } = event;
    let targetID;
    
    // ===== Determine targetID in three ways =====
    if (event.type === "message_reply") {
        // Way 1: Reply to a message
        targetID = event.messageReply.senderID;
    } else if (args[0]) {
        if (args[0].includes(".com/")) {
            // Way 2: Facebook profile link
            try {
                targetID = await api.getUID(args[0]);
            } catch (error) {
                return api.sendMessage("❌ Invalid Facebook link or could not extract UID.", threadID, messageID);
            }
        } else if (args.join(" ").includes("@")) {
            // Way 3: Mention or full name
            // 3a: Direct Facebook mention
            targetID = Object.keys(event.mentions || {})[0];
            if (!targetID) {
                // 3b: Full name detection
                targetID = await getUIDByFullName(api, threadID, args.join(" "));
            }
        } else {
            // Direct UID
            targetID = args[0];
        }
    } else {
        // No target specified - use sender's own ID
        targetID = event.senderID;
    }
    
    // Validate targetID
    if (!targetID) {
        return api.sendMessage(
            "❌ Could not detect the user.\n\n" +
            "📋 Usage👇\n" +
            "• ckuser @[name]\n" +
            "• ckuser (reply)\n" +
            "• ckuser [UID]\n" +
            "• ckuser [facebook.com/...]\n\n" +
            "📝 Example👇\n" +
            "*ckuser @Rahat islam\n" +
            "*ckuser (reply to message)\n" +
            "*ckuser 1000123456789\n" +
            "*ckuser https://facebook.com/username",
            threadID, messageID
        );
    }
    
    // Validate if targetID is a number
    if (isNaN(targetID)) {
        return api.sendMessage("❌ Invalid UID. UID must be a number.", threadID, messageID);
    }
    
    try {
        let data = await api.getUserInfo(targetID);
        let user = data[targetID];
        
        if (!user) {
            return api.sendMessage("❌ User not found. The UID might be invalid or the user has restricted their profile.", threadID, messageID);
        }

        let url = user.profileUrl;
        let isFriend = user.isFriend ? "Yes ✅" : "No ❌";
        let sn = user.vanity || "N/A";
        let name = user.name || "Unknown";
        let sex = user.gender;
        let gender = sex == 2 ? "Male" : sex == 1 ? "Female" : "Unknown";
        
        // Additional info if available
        let additionalInfo = "";
        try {
            // Try to get more info from thread members if in group
            if (event.isGroup) {
                const threadInfo = await api.getThreadInfo(threadID);
                const member = threadInfo.userInfo.find(u => u.id === targetID);
                if (member) {
                    if (member.gender) {
                        const memberGender = member.gender === "MALE" ? "Male" : member.gender === "FEMALE" ? "Female" : "Unknown";
                        if (gender === "Unknown") gender = memberGender;
                    }
                }
            }
        } catch (e) {
            // Ignore errors for additional info
        }

        let callback = () => api.sendMessage(
            {
                body: `👤 𝐔𝐬𝐞𝐫 𝐈𝐧𝐟𝐨𝐫𝐦𝐚𝐭𝐢𝐨𝐧 👤\n` +
                      `━━━━━━━━━━━━━━━━━━\n` +
                      `📛 Name: ${name}\n` +
                      `🔗 Profile: ${url}\n` +
                      `🆔 UID: ${targetID}\n` +
                      `📱 Username: ${sn}\n` +
                      `🚻 Gender: ${gender}\n` +
                      `🤝 Friend with bot: ${isFriend}\n` +
                      `━━━━━━━━━━━━━━━━━━\n` +
                      `✅ Information retrieved successfully!`,
                attachment: fs.createReadStream(__dirname + "/cache/ckuser.png")
            },
            event.threadID,
            () => {
                try {
                    fs.unlinkSync(__dirname + "/cache/ckuser.png");
                } catch (e) {
                    // Ignore error if file doesn't exist
                }
            },
            event.messageID
        );

        // Download profile picture
        return request(
            encodeURI(`https://graph.facebook.com/${targetID}/picture?height=720&width=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`)
        ).pipe(fs.createWriteStream(__dirname + "/cache/ckuser.png"))
         .on("close", () => callback())
         .on("error", (err) => {
             console.error(err);
             api.sendMessage(
                 `📄 𝐔𝐬𝐞𝐫 𝐈𝐧𝐟𝐨𝐫𝐦𝐚𝐭𝐢𝐨𝐧 📄\n` +
                 `━━━━━━━━━━━━━━━━━━\n` +
                 `📛 Name: ${name}\n` +
                 `🔗 Profile: ${url}\n` +
                 `🆔 UID: ${targetID}\n` +
                 `📱 Username: ${sn}\n` +
                 `🚻 Gender: ${gender}\n` +
                 `🤝 Friend with bot: ${isFriend}\n` +
                 `━━━━━━━━━━━━━━━━━━\n` +
                 `⚠️ Note: Could not load profile picture`,
                 threadID, messageID
             );
         });

    } catch (error) {
        console.error(error);
        return api.sendMessage(
            "❌ Error retrieving user information. Possible reasons:\n" +
            "1. Invalid UID\n" +
            "2. User has restricted profile\n" +
            "3. Network error\n" +
            "4. Bot doesn't have permission\n\n" +
            "Please try again or use a different method.",
            threadID, messageID
        );
    }
};
