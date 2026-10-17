module.exports.config = {
    name: "couple",
    version: "2.1.0",
    hasPermssion: 0,
    credits: "🔰𝐑𝐀𝐇𝐀𝐓 𝐈𝐒𝐋𝐀𝐌🔰",
    description: "Ship two people together",
    commandCategory: "🩵love🩵",
    usages: "[@mention/reply/UID/link/name]",
    cooldowns: 5,
    dependencies: {
        "axios": "",
        "fs-extra": "",
        "path": "",
        "jimp": ""
    }
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

module.exports.onLoad = async() => {
    const { resolve } = global.nodemodule["path"];
    const { existsSync, mkdirSync } = global.nodemodule["fs-extra"];
    const { downloadFile } = global.utils;
    const dirMaterial = __dirname + `/cache/canvas/`;
    const path = resolve(__dirname, 'cache/canvas', 'seophi.png');
    if (!existsSync(dirMaterial + "canvas")) mkdirSync(dirMaterial, { recursive: true });
    if (!existsSync(path)) await downloadFile("https://i.imgur.com/hmKmmam.jpg", path);
}

async function makeImage({ one, two }) {
    const fs = global.nodemodule["fs-extra"];
    const path = global.nodemodule["path"];
    const axios = global.nodemodule["axios"]; 
    const jimp = global.nodemodule["jimp"];
    const __root = path.resolve(__dirname, "cache", "canvas");

    let batgiam_img = await jimp.read(__root + "/seophi.png");
    let pathImg = __root + `/batman${one}_${two}.png`;
    let avatarOne = __root + `/avt_${one}.png`;
    let avatarTwo = __root + `/avt_${two}.png`;
    
    let getAvatarOne = (await axios.get(`https://graph.facebook.com/${one}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`, { responseType: 'arraybuffer' })).data;
    fs.writeFileSync(avatarOne, Buffer.from(getAvatarOne, 'utf-8'));
    
    let getAvatarTwo = (await axios.get(`https://graph.facebook.com/${two}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`, { responseType: 'arraybuffer' })).data;
    fs.writeFileSync(avatarTwo, Buffer.from(getAvatarTwo, 'utf-8'));
    
    let circleOne = await jimp.read(await circle(avatarOne));
    let circleTwo = await jimp.read(await circle(avatarTwo));
    batgiam_img.resize(1024, 712).composite(circleOne.resize(200, 200), 527, 141).composite(circleTwo.resize(200, 200), 389, 407);
    
    let raw = await batgiam_img.getBufferAsync("image/png");
    
    fs.writeFileSync(pathImg, raw);
    fs.unlinkSync(avatarOne);
    fs.unlinkSync(avatarTwo);
    
    return pathImg;
}

async function circle(image) {
    const jimp = require("jimp");
    image = await jimp.read(image);
    image.circle();
    return await image.getBufferAsync("image/png");
}

module.exports.run = async function ({ event, api, args }) {
    const fs = global.nodemodule["fs-extra"];
    const { threadID, messageID, senderID } = event;
    
    let targetID;
    let targetName = "";
    
    // ===== Determine targetID in three ways =====
    if (event.type === "message_reply") {
        // Way 1: Reply to a message
        targetID = event.messageReply.senderID;
    } else if (args[0]) {
        if (args[0].includes(".com/")) {
            // Way 2: Facebook profile link
            targetID = await api.getUID(args[0]);
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
        // No target specified
        return api.sendMessage(
            "❌রাহাদ বসকে ডাক দে🫩\nকীভাবে কমান্ড ব্যবহার করতে হয় শিখায় দিবো🥴",
            threadID, messageID
        );
    }
    
    if (!targetID) {
        return api.sendMessage("❌ Could not detect the user. Please try again with a different method.", threadID, messageID);
    }
    
    // Check if trying to ship with oneself
    if (targetID === senderID) {
        return api.sendMessage("🫠নিজের মেসেজ এর রিপ্লাই দিলে হবে না✅", threadID, messageID);
    }
    
    // Get target name for mention in message
    try {
        const userInfo = await api.getUserInfo(targetID);
        targetName = userInfo[targetID]?.name || "";
    } catch (error) {
        console.error("Error getting user info:", error);
    }
    
    const one = senderID;
    const two = targetID;
    
    // Ship messages
    const shipMessages = [
        `🚀 Love is in the air! ${targetName ? `You and ${targetName}` : 'You two'} look great together! 💕`,
        `💘 Perfect match! ${targetName ? `You and ${targetName}` : 'This couple'} is meant to be! ❤️`,
        `✨ Sparks are flying! ${targetName ? `You and ${targetName}` : 'This pair'} has amazing chemistry! 🌟`,
        `🌹 Romance blooming! ${targetName ? `You and ${targetName}` : 'You two'} make a lovely couple! 💐`,
        `💑 Match made in heaven! ${targetName ? `You and ${targetName}` : 'This couple'} is perfect! 👫`,
        `💞 Destiny brought you together! ${targetName ? `You and ${targetName}` : 'You two'} are soulmates! ✨`,
        `🥰 Adorable couple alert! ${targetName ? `You and ${targetName}` : 'This pair'} is too cute! 💖`,
        `💒 Wedding bells ringing! ${targetName ? `You and ${targetName}` : 'You two'} should tie the knot! 💍`,
        `🌠 Star-crossed lovers! ${targetName ? `You and ${targetName}` : 'This couple'} shines bright! ⭐`,
        `💗 Love connection successful! ${targetName ? `You and ${targetName}` : 'You two'} are compatible! 🔗`
    ];
    
    const randomMessage = shipMessages[Math.floor(Math.random() * shipMessages.length)];
    
    try {
        const path = await makeImage({ one, two });
        
        // Create mentions array for proper tagging
        const mentions = [];
        if (targetName) {
            mentions.push({
                tag: targetName,
                id: targetID
            });
        }
        
        return api.sendMessage({
            body: randomMessage,
            mentions: mentions.length > 0 ? mentions : undefined,
            attachment: fs.createReadStream(path)
        }, threadID, () => {
            try {
                fs.unlinkSync(path);
            } catch (error) {
                console.error("Error deleting file:", error);
            }
        }, messageID);
        
    } catch (err) {
        console.error(err);
        return api.sendMessage("❌ Error creating couple image. Please try again later.", threadID, messageID);
    }
}
