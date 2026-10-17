const fs = require("fs");
const path = require("path");

module.exports.config = {
    name: "vip",
    version: "1.0.0",
    hasPermssion: 3,
    credits: "🔰𝐑𝐀𝐇𝐀𝐓 𝐈𝐒𝐋𝐀𝐌🔰",
    description: "Manage VIP mode & VIP users",
    commandCategory: "Admin",
    usages: "[on|off|add|remove|list] <userID or reply>",
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

module.exports.run = async function ({ api, event, args }) {
    const vipFilePath = path.join(__dirname, "../../Script/commands/cache/rol.json");
    const vipModePath = path.join(__dirname, "../../Script/commands/cache/vipMode.json");

    // ===== Helpers =====
    const loadVIP = () => {
        if (!fs.existsSync(vipFilePath)) return [];
        return JSON.parse(fs.readFileSync(vipFilePath, "utf-8"));
    }

    const saveVIP = (list) => fs.writeFileSync(vipFilePath, JSON.stringify(list, null, 2), "utf-8");

    const loadVIPMode = () => {
        if (!fs.existsSync(vipModePath)) return false;
        const data = JSON.parse(fs.readFileSync(vipModePath, "utf-8"));
        return data.vipMode || false;
    }

    const saveVIPMode = (mode) => fs.writeFileSync(vipModePath, JSON.stringify({ vipMode: mode }, null, 2), "utf-8");
    // ===== End helpers =====

    const subCommand = args[0]?.toLowerCase();

    // ===== Determine targetID in three ways for add/remove =====
    let targetID = null;

    if (subCommand === "add" || subCommand === "remove") {
        if (event.type === "message_reply") {
            // Way 1: Reply to a message
            targetID = event.messageReply.senderID;
        } else if (args[1]) {
            const targetArg = args.slice(1).join(" ");
            if (targetArg.indexOf(".com/") !== -1) {
                // Way 2: Facebook profile link
                targetID = await api.getUID(targetArg);
            } else if (targetArg.includes("@")) {
                // Way 3: Mention or full name
                // 3a: Direct Facebook mention
                targetID = Object.keys(event.mentions || {})[0];
                if (!targetID) {
                    // 3b: Full name detection
                    targetID = await getUIDByFullName(api, event.threadID, targetArg);
                }
            } else {
                // Direct UID
                targetID = targetArg;
            }
        }
    }

    if (!subCommand) return api.sendMessage("Usage: vip [on|off|add|remove|list] <userID or reply>", event.threadID);

    let vipList = loadVIP();
    let vipMode = loadVIPMode();

    switch(subCommand) {
        case "on":
            saveVIPMode(true);
            return api.sendMessage("✅𝐎𝐊 𝐎𝐧𝐥𝐲 𝐕𝐈𝐏 𝐮𝐬𝐞𝐫 𝐜𝐚𝐧 𝐮𝐬𝐞 𝐜𝐨𝐦𝐦𝐚𝐧𝐝", event.threadID);

        case "off":
            saveVIPMode(false);
            return api.sendMessage("✅𝐃𝐨𝐧𝐞 𝐚𝐥𝐥 𝐮𝐬𝐞𝐫 𝐜𝐚𝐧 𝐮𝐬𝐞 𝐜𝐨𝐦𝐦𝐚𝐧𝐝", event.threadID);

        case "add":
            if (!targetID) return api.sendMessage("❌𝐏𝐥𝐞𝐚𝐬𝐞 𝐩𝐫𝐨𝐯𝐢𝐝𝐞 𝐚 𝐮𝐬𝐞𝐫𝐈𝐃 𝐨𝐫 𝐫𝐞𝐩𝐥𝐲 𝐭𝐨 𝐚𝐝𝐝.", event.threadID);
            if (vipList.includes(targetID)) return api.sendMessage("❌𝐔𝐬𝐞𝐫 𝐢𝐬 𝐚𝐥𝐫𝐞𝐚𝐝𝐲 𝐕𝐈𝐏.", event.threadID);
            vipList.push(targetID);
            saveVIP(vipList);
            return api.sendMessage(`✅ Added ${targetID} to VIP list.`, event.threadID);

        case "remove":
            if (!targetID) return api.sendMessage("❌𝐏𝐫𝐨𝐯𝐢𝐝𝐞 𝐚 𝐮𝐬𝐞𝐫𝐈𝐃 𝐨𝐫 𝐫𝐞𝐩𝐥𝐲 𝐭𝐨 𝐫𝐞𝐦𝐨𝐯𝐞.", event.threadID);
            if (!vipList.includes(targetID)) return api.sendMessage("❌𝐔𝐬𝐞𝐫 𝐢𝐬 𝐧𝐨𝐭 𝐢𝐧 𝐕𝐈𝐏 𝐥𝐢𝐬𝐭.", event.threadID);
            vipList = vipList.filter(id => id !== targetID);
            saveVIP(vipList);
            return api.sendMessage(`✅ Removed ${targetID} from VIP list.`, event.threadID);

        case "list":
            if (vipList.length === 0) return api.sendMessage("𝐕𝐢𝐩 𝐥𝐢𝐬𝐭 𝐢𝐬 𝐞𝐦𝐩𝐭𝐲.", event.threadID);
            return api.sendMessage(`📋 VIP Users:\n${vipList.join("\n")}`, event.threadID);

        default:
            return api.sendMessage("Unknown subcommand. Usage: vip [on|off|add|remove|list] <userID or reply>", event.threadID);
    }
};