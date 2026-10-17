const fs = require("fs-extra");
const path = require("path");
const request = require("request");

module.exports.config = {
	name: "help",
	version: "3.1.0",
	hasPermssion: 0,
	credits: "🔰𝐑𝐀𝐇𝐀𝐓 𝐈𝐒𝐋𝐀𝐌🔰",
	description: "style help menu",
	commandCategory: "system",
	usages: "[command list]",
	cooldowns: 5,
	envConfig: {
		autoUnsend: true,
		delayUnsend: 90
	}
};

module.exports.languages = {
	en: {
		moduleInfo: `╭━━━━━━━━━━━━━━━━╮
┃ ✨ 𝐂𝐎𝐌𝐌𝐀𝐍𝐃 𝐈𝐍𝐅𝐎 ✨
┣━━━━━━━━━━━┫
┃ 🔖 Name: %1
┃ 📄 Usage: %2
┃ 📜 Description: %3
┃ 🔑 Permission: %4
┃ 👨‍💻 Credit:Rahat Islam
┃ 📂 Category: %6
┃ ⏳ Cooldown: %7s
┣━━━━━━━━━━━━━━━━┫
┃ ⚙ Prefix: %8
┃ 🤖 Bot: %9
╰━━━━━━━━━━━━━━━━╯`
	}
};
async function getGifAttachment() {
	const gifs = (global.client.helpGifs && global.client.helpGifs.length) ? global.client.helpGifs : [];
	if (gifs.length === 0) return { attachments: [], cleanup: () => {} };

	const gifUrl = gifs[Math.floor(Math.random() * gifs.length)];
	const gifPath = path.join(__dirname, `help_gif_${Date.now()}_${Math.floor(Math.random() * 100000)}.gif`);

	try {
		await new Promise((resolve, reject) => {
			request(encodeURI(gifUrl))
				.pipe(fs.createWriteStream(gifPath))
				.on("close", resolve)
				.on("error", reject);
		});
		return {
			attachments: [fs.createReadStream(gifPath)],
			cleanup: () => { if (fs.existsSync(gifPath)) fs.unlinkSync(gifPath); }
		};
	} catch (error) {
		console.error("[HELP] GIF ডাউনলোডে সমস্যা:", error.message);
		return { attachments: [], cleanup: () => {} };
	}
}
module.exports.run = async function ({ api, event, args, getText }) {
	const { commands } = global.client;
	const { threadID, messageID } = event;
    const threadSetting = global.data.threadData.get(threadID) || {};
	const prefix = threadSetting.PREFIX || global.config.PREFIX;
     if (args[0] && commands.has(args[0].toLowerCase())) {
		const cmd = commands.get(args[0].toLowerCase());
		const msg = getText(
			"moduleInfo",
			cmd.config.name,
			cmd.config.usages || "Not Provided",
			cmd.config.description || "Not Provided",
			cmd.config.hasPermssion,
			cmd.config.credits || "Unknown",
			cmd.config.commandCategory || "OTHER",
			cmd.config.cooldowns || 0,
			prefix,
			global.config.BOTNAME || "Rahat_Bot"
		);

		try {
			const { attachments, cleanup } = await getGifAttachment();

			return api.sendMessage({
				body: msg,
				attachment: attachments
			}, threadID, (err, info) => {
				cleanup();
				if (!err && module.exports.config.envConfig.autoUnsend) {
					setTimeout(
						() => api.unsendMessage(info.messageID),
						module.exports.config.envConfig.delayUnsend * 1000
					);
				}
			}, messageID);

		} catch (error) {
			console.error("[HELP] মেসেজ পাঠাতে সমস্যা:", error);
			return api.sendMessage(msg, threadID, messageID);
		}
	}
	const groups = {};
	const categoryDisplay = {};

	for (const [name, cmd] of commands) {
		const rawCat = (cmd.config.commandCategory || "OTHER").trim() || "OTHER";
		const key = rawCat.toLowerCase();
        if (!groups[key]) {
			groups[key] = [];
			categoryDisplay[key] = rawCat;
		}
		groups[key].push(name);
	}
	Object.keys(groups).forEach(key => groups[key].sort());
let body = `╭━━━━━━━━━━━━━━━━╮
┃  ${global.config.BOTNAME || ""}
┃ 📂 𝐂𝐎𝐌𝐌𝐀𝐍𝐃 𝐋𝐈𝐒𝐓
┣━━━━━━━━━━━━━━━━┫`;
let isFirstGroup = true;
	for (const cat of Object.keys(groups)) {
		if (groups[cat].length === 0) continue;
        if (!isFirstGroup) {
			body += `\n┣══════❒🐓${categoryDisplay[cat]}`;
		}
		isFirstGroup = false;
      groups[cat].forEach(cmd => {
			body += `\n┣●${cmd}`;
		});
	}
   body += `\n┣━━━━━━━━━━━━━━━━┫
┃ 📌 𝙋𝙍𝙀𝙁𝙄𝙓: ${prefix}
┃ 📊 𝗧𝗢𝗧𝗔𝗟: ${commands.size} cmds
┃ 👑 𝗢𝗪𝗡𝗘𝗥: ${global.config.Xrahat_Name || ""}
╰━━━━━━━━━━━━━━━━╯`;
	try {
		const { attachments, cleanup } = await getGifAttachment();
api.sendMessage({
			body: body,
			attachment: attachments
		}, threadID, (err, info) => {
			cleanup();
			if (!err && module.exports.config.envConfig.autoUnsend) {
				setTimeout(
					() => api.unsendMessage(info.messageID),
					module.exports.config.envConfig.delayUnsend * 1000
				);
			}
		}, messageID);

	} catch (error) {
		console.error("[HELP] হেল্প মেনু পাঠাতে সমস্যা:", error);
		
		api.sendMessage(body, threadID, messageID);
	}
};
