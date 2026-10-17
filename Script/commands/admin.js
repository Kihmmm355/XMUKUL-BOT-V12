var request = require("request");
const { readdirSync, readFileSync, writeFileSync, existsSync, copySync, createWriteStream, createReadStream } = require("fs-extra");

module.exports.config = {
	name: "admin",
	version: "1.1.0",
	hasPermssion: 2,
	credits: "🔰𝐑𝐀𝐇𝐀𝐓 𝐈𝐒𝐋𝐀𝐌🔰",
	description: "Admin Config with multiple mention detection",
	commandCategory: "Admin",
	usages: "[add/remove/list] [@mention/reply/UID/link/name]",
    cooldowns: 2,
    dependencies: {
        "fs-extra": ""
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

// Helper: Get UID from Facebook link
async function getUIDFromLink(link, api) {
    if (link.includes("facebook.com") || link.includes("fb.com")) {
        try {
            return await api.getUID(link);
        } catch {
            return null;
        }
    }
    return null;
}

module.exports.languages = {
    "vi": {
        "listAdmin": `===「 𝗗𝗔𝗡𝗛 𝗦𝗔́𝗖𝗛 𝗔𝗗𝗠𝗜𝗡 」===\n━━━━━━━━━━━━━━━\n%1\n\n==「 𝗡𝗚𝗨̛𝗢̛̀𝗜 𝗛𝗢̂̃ 𝗧𝗥𝗢̛̣ 𝗕𝗢𝗧 」==\n━━━━━━━━━━━━━━━\n%2`,
        "notHavePermssion": '𝗠𝗢𝗗𝗘 - Bạn không đủ quyền hạn để có thể sử dụng chức năng "%1"',
        "addedNewAdmin": '𝗠𝗢𝗗𝗘 - Đã thêm thành công %1 người dùng trở thành Admin Bot\n\n%2',
        "addedNewNDH": '𝗠𝗢𝗗𝗘 - Đã thêm thành công %1 người dùng trở thành Người hỗ trợ\n\n%2',
        "removedAdmin": '𝗠𝗢𝗗𝗘 - Đã gỡ thành công vai trò Admin %1 người dùng trở lại làm thành viên\n\n%2',
        "removedNDH": '𝗠𝗢𝗗𝗘 - Đã gỡ thành công vai trò Người hỗ trợ %1 người dùng trở lại làm thành viên\n\n%2'
    },
    "en": {
        "listAdmin": '𝐋𝐈𝐒𝐓 𝐎𝐅 𝐀𝐃𝐌𝐈𝐍 ᰔ\n___________________\n𝐀𝐃𝐌𝐈𝐍: ︎🔰𝐑𝐀𝐇𝐀𝐓 𝐈𝐒𝐋𝐀𝐌🔰\n_____________________________\n𝐎𝐏𝐎𝐑𝐄𝐓𝐎𝐑𝐒\n\n%1',
        "notHavePermssion": '[Admin] You have no permission to use "%1"',
        "addedNewAdmin": '「𝐀𝐝𝐦𝐢𝐧」 𝐀𝐝𝐝𝐞𝐝 %1 𝐀𝐝𝐦𝐢𝐧 :\n\n%2 ᰔ',
        "removedAdmin": '「𝐀𝐝𝐦𝐢𝐧」 𝐑𝐞𝐦𝐨𝐯𝐞 %1 𝐀𝐝𝐦𝐢𝐧:\n\n%2 ᰔ'
    }
};

module.exports.onLoad = function() {
    const { writeFileSync, existsSync } = require('fs-extra');
    const { resolve } = require("path");
    const path = resolve(__dirname, 'cache', 'data.json');
    if (!existsSync(path)) {
        const obj = {
            adminbox: {}
        };
        writeFileSync(path, JSON.stringify(obj, null, 4));
    } else {
        const data = require(path);
        if (!data.hasOwnProperty('adminbox')) data.adminbox = {};
        writeFileSync(path, JSON.stringify(data, null, 4));
    }
};

// Function to detect target ID in three ways
async function detectTargetID(api, event, args) {
    const { messageReply, mentions, threadID } = event;
    let targetID = null;
    
    // Way 1: Reply to a message
    if (messageReply) {
        targetID = messageReply.senderID;
    }
    // Way 2: Check arguments
    else if (args.length > 0) {
        const targetArg = args[0];
        
        // Check for Facebook link
        if (targetArg.includes(".com/")) {
            targetID = await getUIDFromLink(targetArg, api);
        }
        // Check for mention or full name
        else if (args.join(" ").includes("@")) {
            // Direct Facebook mention
            targetID = Object.keys(mentions || {})[0];
            if (!targetID) {
                // Full name detection
                targetID = await getUIDByFullName(api, threadID, args.join(" "));
            }
        }
        // Direct UID
        else if (!isNaN(targetArg)) {
            targetID = targetArg;
        }
    }
    
    return targetID;
}

module.exports.run = async function ({ api, event, args, Users, permssion, getText }) {  
    const content = args.slice(1, args.length);
    
    if (args.length == 0) return api.sendMessage({
        body: `==== [ 𝗔𝗗𝗠𝗜𝗡 𝗦𝗘𝗧𝗧𝗜𝗡𝗚 ] ====\n━━━━━━━━━━━━━━━\n` +
              `𝗠𝗢𝗗𝗘 - admin list => View list of Admin and Support\n` +
              `𝗠𝗢𝗗𝗘 - admin add [@mention/reply/UID/link/name] => Add user as Admin\n` +
              `𝗠𝗢𝗗𝗘 - admin remove [@mention/reply/UID/link/name] => Remove Admin role\n` +
              `𝗠𝗢𝗗𝗘 - admin addndh [@mention/reply/UID/link/name] => Add user as Support\n` +
              `𝗠𝗢𝗗𝗘 - admin removendh [@mention/reply/UID/link/name] => Remove Support role\n` +
              `𝗠𝗢𝗗𝗘 - admin qtvonly => Toggle mode only admins use bot\n` +
              `𝗠𝗢𝗗𝗘 - admin ndhonly => Toggle mode only support bot using bot\n` +
              `𝗠𝗢𝗗𝗘 - admin only => Toggle mode only admins can use bot\n` +
              `𝗠𝗢𝗗𝗘 - admin ibonly => Toggle mode only admins can use bots in ib separately\n` +
              `━━━━━━━━━━━━━━━\n` +
              `𝗨𝘀𝗮𝗴𝗲: admin add @John Doe / admin add (reply) / admin add [UID] / admin add [link]`
    }, event.threadID, event.messageID); 
    
    const { threadID, messageID, mentions } = event;
    const { configPath } = global.client;
    const { ADMINBOT } = global.config;
    const { NDH } = global.config;
    const { userName } = global.data;
    const { writeFileSync } = global.nodemodule["fs-extra"];
    
    delete require.cache[require.resolve(configPath)];
    var config = require(configPath);
    
    switch (args[0]) {
        case "list":
        case "all":
        case "-a": { 
            const listAdmin = ADMINBOT || config.ADMINBOT || [];
            var msg = [];
            for (const idAdmin of listAdmin) {
                if (parseInt(idAdmin)) {
                    const name = (await Users.getData(idAdmin)).name;
                    msg.push(`ᰔ ${name} ᰔ\n •╰┈➤(${idAdmin}) \n`);
                }
            }
            
            const listNDH = NDH || config.NDH || [];
            var msg1 = [];
            for (const idNDH of listNDH) {
                if (parseInt(idNDH)) {
                    const name1 = (await Users.getData(idNDH)).name;
                    msg1.push(`🔰: ${name1}\n»𝗟𝗶𝗻𝗸 𝗙𝗕: https://www.facebook.com/${idNDH} 🤖`);
                }
            }

            return api.sendMessage(getText("listAdmin", msg.join("\n\n"), msg1.join("\n\n")), threadID, messageID);
        }

        case "add": { 
            if (permssion != 3) return api.sendMessage(getText("notHavePermssion", "add"), threadID, messageID);
            
            let targetID = await detectTargetID(api, event, content);
            
            if (!targetID) {
                return api.sendMessage(
                    "❌ Could not detect the user.\n" +
                    "Usage: admin add [@mention/reply/UID/link/name]\n" +
                    "Example:\n" +
                    "- admin add @John Doe\n" +
                    "- admin add (reply to message)\n" +
                    "- admin add 1000123456789\n" +
                    "- admin add https://facebook.com/username",
                    threadID, messageID
                );
            }
            
            // Check if already admin
            const listAdmin = ADMINBOT || config.ADMINBOT || [];
            if (listAdmin.includes(targetID.toString())) {
                const name = (await Users.getData(targetID)).name || "User";
                return api.sendMessage(`✅ ${name} is already an Admin.`, threadID, messageID);
            }
            
            // Add as admin
            ADMINBOT.push(targetID.toString());
            config.ADMINBOT.push(targetID.toString());
            const name = (await Users.getData(targetID)).name || "User";
            
            writeFileSync(configPath, JSON.stringify(config, null, 4), 'utf8');
            return api.sendMessage(getText("addedNewAdmin", 1, `𝗔𝗱𝗺𝗶𝗻 - ${name} (${targetID})`), threadID, messageID);
        }
        
        case "addndh": { 
            if (permssion != 3) return api.sendMessage(getText("notHavePermssion", "addndh"), threadID, messageID);
            
            let targetID = await detectTargetID(api, event, content);
            
            if (!targetID) {
                return api.sendMessage(
                    "❌ Could not detect the user.\n" +
                    "Usage: admin addndh [@mention/reply/UID/link/name]",
                    threadID, messageID
                );
            }
            
            // Check if already in NDH
            const listNDH = NDH || config.NDH || [];
            if (listNDH.includes(targetID.toString())) {
                const name = (await Users.getData(targetID)).name || "User";
                return api.sendMessage(`✅ ${name} is already a Support.`, threadID, messageID);
            }
            
            // Add as support
            NDH.push(targetID.toString());
            config.NDH.push(targetID.toString());
            const name = (await Users.getData(targetID)).name || "User";
            
            writeFileSync(configPath, JSON.stringify(config, null, 4), 'utf8');
            return api.sendMessage(getText("addedNewNDH", 1, `𝗦𝘂𝗽𝗽𝗼𝗿𝘁𝗲𝗿𝘀 - ${name} (${targetID})`), threadID, messageID);
        }
        
        case "remove":
        case "rm":
        case "delete": {
            if (permssion != 3) return api.sendMessage(getText("notHavePermssion", "delete"), threadID, messageID);
            
            let targetID = await detectTargetID(api, event, content);
            
            if (!targetID) {
                return api.sendMessage(
                    "❌ Could not detect the user.\n" +
                    "Usage: admin remove [@mention/reply/UID/link/name]",
                    threadID, messageID
                );
            }
            
            // Check if is admin
            const listAdmin = ADMINBOT || config.ADMINBOT || [];
            const index = listAdmin.findIndex(item => item.toString() === targetID.toString());
            
            if (index === -1) {
                const name = (await Users.getData(targetID)).name || "User";
                return api.sendMessage(`❌ ${name} is not an Admin.`, threadID, messageID);
            }
            
            // Remove admin
            ADMINBOT.splice(index, 1);
            config.ADMINBOT.splice(index, 1);
            const name = (await Users.getData(targetID)).name || "User";
            
            writeFileSync(configPath, JSON.stringify(config, null, 4), 'utf8');
            return api.sendMessage(getText("removedAdmin", 1, `${name} (${targetID})`), threadID, messageID);
        }
        
        case "removendh": {
            if (permssion != 3) return api.sendMessage(getText("notHavePermssion", "removendh"), threadID, messageID);
            
            let targetID = await detectTargetID(api, event, content);
            
            if (!targetID) {
                return api.sendMessage(
                    "❌ Could not detect the user.\n" +
                    "Usage: admin removendh [@mention/reply/UID/link/name]",
                    threadID, messageID
                );
            }
            
            // Check if is in NDH
            const listNDH = NDH || config.NDH || [];
            const index = listNDH.findIndex(item => item.toString() === targetID.toString());
            
            if (index === -1) {
                const name = (await Users.getData(targetID)).name || "User";
                return api.sendMessage(`❌ ${name} is not a Support.`, threadID, messageID);
            }
            
            // Remove from support
            NDH.splice(index, 1);
            config.NDH.splice(index, 1);
            const name = (await Users.getData(targetID)).name || "User";
            
            writeFileSync(configPath, JSON.stringify(config, null, 4), 'utf8');
            return api.sendMessage(getText("removedNDH", 1, `${name} (${targetID})`), threadID, messageID);
        }
        
        case 'qtvonly': {
            const { resolve } = require("path");
            const pathData = resolve(__dirname, 'cache', 'data.json');
            const database = require(pathData);
            const { adminbox } = database;   
            
            if (permssion < 1) return api.sendMessage("𝗠𝗢𝗗𝗘 - 𝗕𝗼𝗿𝗱𝗲𝗿 𝗰𝗮𝗻𝗴𝗹𝗲 𝗿𝗶𝗴𝗵𝘁𝘀 🎀 ", threadID, messageID);
            
            if (adminbox[threadID] == true) {
                adminbox[threadID] = false;
                api.sendMessage("𝗠𝗢𝗗𝗘 » 𝗦𝘂𝗰𝗰𝗲𝘀𝘀𝗳𝘂𝗹𝗹𝘆 𝗱𝗶𝘀𝗮𝗯𝗹𝗲 𝗤𝗧𝗩 𝗺𝗼𝗱𝗲 𝗼𝗻𝗹𝘆 𝗲𝘃𝗲𝗿𝘆𝗼𝗻𝗲 𝗰𝗮𝗻 𝘂𝘀𝗲 𝘁𝗵𝗲 𝗯𝗼𝘁 👀", threadID, messageID);
            } else {
                adminbox[threadID] = true;
                api.sendMessage("𝗠𝗢𝗗𝗘 » 𝗦𝘂𝗰𝗰𝗲𝘀𝘀𝗳𝘂𝗹𝗹𝘆 𝗲𝗻𝗮𝗯𝗹𝗲 𝗤𝗧𝗩 𝗼𝗻𝗹𝘆 𝗺𝗼𝗱𝗲, 𝗼𝗻𝗹𝘆 𝗮𝗱𝗺𝗶𝗻𝗶𝘀𝘁𝗿𝗮𝘁𝗼𝗿𝘀 𝗰𝗮𝗻 𝘂𝘀𝗲 𝗯𝗼𝘁𝘀 👀", threadID, messageID);
            }
            
            writeFileSync(pathData, JSON.stringify(database, null, 4));
            break;
        }
        
        case 'ndhonly':
        case '-ndh': {
            if (permssion < 2) return api.sendMessage("𝗠𝗢𝗗𝗘 - 𝗕𝗼𝗿𝗱𝗲𝗿 𝗰𝗮𝗻𝗴𝗹𝗲 𝗿𝗶𝗴𝗵𝘁𝘀 🎀 ", threadID, messageID);       
            
            if (config.ndhOnly == false) {
                config.ndhOnly = true;
                api.sendMessage(`𝗠𝗢𝗗𝗘 » 𝗦𝘂𝗰𝗰𝗲𝘀𝘀𝗳𝘂𝗹𝗹𝘆 𝗲𝗻𝗮𝗯𝗹𝗲 𝗡𝗗𝗛 𝗢𝗻𝗹𝘆 𝗺𝗼𝗱𝗲, 𝗼𝗻𝗹𝘆 𝗯𝗼𝘁 𝘀𝘂𝗽𝗽𝗼𝗿𝘁 𝗰𝗮𝗻 𝘂𝘀𝗲 𝗯𝗼𝘁 👾`, threadID, messageID);
            } else {
                config.ndhOnly = false;
                api.sendMessage(`𝗠𝗢𝗗𝗘 » 𝗦𝘂𝗰𝗰𝗲𝘀𝘀𝗳𝘂𝗹𝗹𝘆 𝗱𝗶𝘀𝗮𝗯𝗹𝗲 𝗡𝗗𝗛 𝗢𝗻𝗹𝘆 𝗺𝗼𝗱𝗲, 𝗲𝘃𝗲𝗿𝘆𝗼𝗻𝗲 𝗰𝗮𝗻 𝘂𝘀𝗲 𝘁𝗵𝗲 𝗯𝗼𝘁 👾`, threadID, messageID);
            }
            
            writeFileSync(configPath, JSON.stringify(config, null, 4), 'utf8');
            break;
        }
        
        case 'ibonly': {
            if (permssion != 3) return api.sendMessage("𝗠𝗢𝗗𝗘 - 𝗕𝗼𝗿𝗱𝗲𝗿 𝗰𝗮𝗻𝗴𝗹𝗲 𝗿𝗶𝗴𝗵𝘁𝘀 🎀", threadID, messageID);
            
            if (config.adminPaOnly == false) {
                config.adminPaOnly = true;
                api.sendMessage("𝗠𝗢𝗗𝗘 » 𝗜𝗯 𝗢𝗻𝗹𝘆 𝗺𝗼𝗱𝗲 𝗶𝘀 𝘀𝘂𝗰𝗰𝗲𝘀𝘀𝗳𝘂𝗹𝗹𝘆 𝗲𝗻𝗮𝗯𝗹𝗲𝗱, 𝗼𝗻𝗹𝘆 𝗮𝗱𝗺𝗶𝗻𝘀 𝗰𝗮𝗻 𝘂𝘀𝗲 𝗯𝗼𝘁𝘀 𝗶𝗻 𝘁𝗵𝗲𝗶𝗿 𝗼𝘄𝗻 𝗶𝗻𝗯𝗼𝘅 💬", threadID, messageID);
            } else {
                config.adminPaOnly = false;
                api.sendMessage("𝗠𝗢𝗗𝗘 » 𝗦𝘂𝗰𝗰𝗲𝘀𝘀𝗳𝘂𝗹𝗹𝘆 𝗱𝗶𝘀𝗮𝗯𝗹𝗲 𝗜𝗯 𝗢𝗻𝗹𝘆 𝗺𝗼𝗱𝗲, 𝗲𝘃𝗲𝗿𝘆𝗼𝗻𝗲 𝗰𝗮𝗻 𝘂𝘀𝗲 𝘁𝗵𝗲 𝗯𝗼𝘁 𝗶𝗻 𝘁𝗵𝗲𝗶𝗿 𝗼𝘄𝗻 𝗶𝗻𝗯𝗼𝘅 💬", threadID, messageID);
            }
            
            writeFileSync(configPath, JSON.stringify(config, null, 4), 'utf8');
            break;
        }
        
        case 'only':
        case '-o': {
            if (permssion != 3) return api.sendMessage("𝗠𝗢𝗗𝗘 - 𝗕𝗼𝗿𝗱𝗲𝗿 𝗰𝗮𝗻𝗴𝗹𝗲 𝗿𝗶𝗴𝗵𝘁𝘀 🎀 ", threadID, messageID);
            
            if (config.adminOnly == false) {
                config.adminOnly = true;
                api.sendMessage('🔰𝐨𝐧𝐥𝐲 𝐚𝐝𝐦𝐢𝐧 𝐜𝐚𝐧 𝐮𝐬𝐞 𝐭𝐡𝐞 𝐛𝐨𝐭', threadID, messageID);
            } else {
                config.adminOnly = false;
                api.sendMessage(`🔰𝐞𝐯𝐞𝐫𝐲𝐨𝐧𝐞 𝐜𝐚𝐧 𝐮𝐬𝐞 𝐭𝐡𝐞 𝐛𝐨𝐭`, threadID, messageID);
            }
            
            writeFileSync(configPath, JSON.stringify(config, null, 4), 'utf8');
            break;
        }
        
        default: {
            return global.utils.throwError(this.config.name, threadID, messageID);
        }
    };
};
