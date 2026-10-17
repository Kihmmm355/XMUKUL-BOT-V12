const fs = require('fs');
const path = require('path');

module.exports.config = {
	name: "kick",
	version: "2.0.0",
	hasPermssion: 2,
	credits: "🔰𝗥𝗮𝗵𝗮𝘁_𝗜𝘀𝗹𝗮𝗺🔰",
	description: "Remove a tagged person from the group or view kick list",
	commandCategory: "System",
	usages: "[@mention/reply/UID/link/name/list]",
	cooldowns: 0,
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

module.exports.languages = {
	"en": {
		"error": "Error! An error occurred. Please try again later!",
		"needPermssion": "Need group admin\nPlease add and try again!",
		"missingTag": "You need to tag someone to kick",
		"kickListEmpty": "📭 Kick list is currently empty!",
		"kickList": "📋 KICKED USERS LIST\n━━━━━━━━━━━━━━\n{list}\n━━━━━━━━━━━━━━\n👤 Total: {count} users",
		"darkName": "🕶️ Darkname: {name}",
		"addedToKickList": "✅ Kicked and added to list",
		"userNotInGroup": "⚠️ This user is not in the group",
		"cantKickSelf": "⚠️ You cannot kick yourself!",
		"cantKickAdmin": "⚠️সরি আমি গ্রুপ এডমিনদের বের করতে পারবো না"
	}
};

// 📁 অটোমেটিক JSON ফাইল তৈরি হবে
const KICK_LIST_FILE = path.join(__dirname, 'kick_data.json');

// 🎭 Darkname জেনারেটর
const darkNames = [
	"Shadow_Reaper", "Phantom_Slayer", "Ghost_Walker", "Void_Keeper",
	"Abyss_Hunter", "Night_Stalker", "Dark_Bringer", "Spectre_Lord",
	"Eclipse_Caster", "Wraith_Weaver", "Midnight_Phantom", "Dusk_Hunter",
	"Twilight_Reaper", "Gloom_Walker", "Oblivion_Slayer"
];

function generateDarkName() {
	return darkNames[Math.floor(Math.random() * darkNames.length)];
}

// 📄 JSON ফাইল ম্যানেজমেন্ট ফাংশন
function ensureKickFile() {
	if (!fs.existsSync(KICK_LIST_FILE)) {
		fs.writeFileSync(KICK_LIST_FILE, JSON.stringify([], null, 2));
	}
}

function readKickData() {
	try {
		ensureKickFile();
		const data = fs.readFileSync(KICK_LIST_FILE, 'utf8');
		return JSON.parse(data);
	} catch (error) {
		console.error("❌ Error reading kick data:", error);
		return [];
	}
}

function saveKickData(data) {
	try {
		fs.writeFileSync(KICK_LIST_FILE, JSON.stringify(data, null, 2), 'utf8');
		return true;
	} catch (error) {
		console.error("❌ Error saving kick data:", error);
		return false;
	}
}

function addToKickList(userInfo) {
	const kickData = readKickData();
	
	// ডুপ্লিকেট চেক
	const exists = kickData.some(user => user.id === userInfo.id);
	if (!exists) {
		userInfo.darkName = generateDarkName();
		userInfo.timestamp = new Date().toLocaleString();
		kickData.push(userInfo);
		saveKickData(kickData);
		return userInfo.darkName;
	}
	return kickData.find(user => user.id === userInfo.id).darkName;
}

// 📋 লিস্ট দেখানোর ফাংশন
async function showKickList(api, event) {
	const kickData = readKickData();
	
	if (kickData.length === 0) {
		return api.sendMessage("📭কোন কিক লিস্ট নাই🤷", event.threadID, event.messageID);
	}
	
	let listMessage = "📋 𝐊𝐈𝐂𝐊𝐄𝐃 𝐔𝐒𝐄𝐑𝐒 𝐋𝐈𝐒𝐓\n━━━━━━━━━━━━━━━━━━\n";
	
	kickData.forEach((user, index) => {
		listMessage += `${index + 1}. ${user.name}\n`;
		listMessage += `🆔𝗨𝗜𝗗: ${user.id}\n`;
		listMessage += `────────────────`;
	});
	
	listMessage += `\n👤𝗧𝗼𝘁𝗮𝗹: ${kickData.length} users`;
	
	api.sendMessage(listMessage, event.threadID, event.messageID);
}

// ===== Helper: Get Target User =====
async function getTargetUsers(api, event, args) {
	let targetIDs = [];
	let userNames = {};
	
	// 📋 লিস্ট দেখানোর রিকুয়েস্ট
	if (args[0]?.toLowerCase() === 'list') {
		return { targetIDs: [], userNames: {}, action: 'list' };
	}
	
	// ===== Determine targetID in three ways =====
	if (event.type === "message_reply") {
		// Way 1: Reply to a message
		const uid = event.messageReply.senderID;
		targetIDs = [uid];
		try {
			const userInfo = await api.getUserInfo(uid);
			userNames[uid] = userInfo[uid]?.name || "Unknown User";
		} catch (error) {
			userNames[uid] = "Unknown User";
		}
	} else if (args[0]) {
		if (args[0].indexOf(".com/") !== -1) {
			// Way 2: Facebook profile link
			const uid = await api.getUID(args[0]);
			if (uid) {
				targetIDs = [uid];
				try {
					const userInfo = await api.getUserInfo(uid);
					userNames[uid] = userInfo[uid]?.name || "Unknown User";
				} catch (error) {
					userNames[uid] = "Unknown User";
				}
			}
		} else if (args.join().includes("@")) {
			// Way 3: Mention or full name
			// 3a: Direct Facebook mention
			const mentionKeys = Object.keys(event.mentions || {});
			if (mentionKeys.length > 0) {
				targetIDs = mentionKeys;
				userNames = event.mentions;
			} else {
				// 3b: Full name detection
				const uid = await getUIDByFullName(api, event.threadID, args.join(" "));
				if (uid) {
					targetIDs = [uid];
					try {
						const userInfo = await api.getUserInfo(uid);
						userNames[uid] = userInfo[uid]?.name || "Unknown User";
					} catch (error) {
						userNames[uid] = "Unknown User";
					}
				}
			}
		} else {
			// Direct UID
			const uid = args[0];
			targetIDs = [uid];
			try {
				const userInfo = await api.getUserInfo(uid);
				userNames[uid] = userInfo[uid]?.name || "Unknown User";
			} catch (error) {
				userNames[uid] = "Unknown User";
			}
		}
	} else if (Object.keys(event.mentions).length > 0) {
		// Legacy mention support
		targetIDs = Object.keys(event.mentions);
		userNames = event.mentions;
	}
	
	return { targetIDs, userNames, action: 'kick' };
}

// 🎯 মূল রান ফাংশন
module.exports.run = async function({ api, event, args, getText }) {
	try {
		// ===== Get target users using three-way detection =====
		const { targetIDs, userNames, action } = await getTargetUsers(api, event, args);
		
		// 📋 লিস্ট দেখানোর রিকুয়েস্ট
		if (action === 'list') {
			return await showKickList(api, event);
		}
		
		if (targetIDs.length === 0) {
			const helpMessage = "❌বসকে ডাক দে🫩\nকীভাবে কমান্ড ব্যবহার করতে হয় শিখায় দিবো🥴";
			
			return api.sendMessage(helpMessage, event.threadID, event.messageID);
		}
		
		// 🔍 গ্রুপ ইনফো চেক
		let threadInfo = await api.getThreadInfo(event.threadID);
		
		if (!threadInfo || !threadInfo.adminIDs) {
			return api.sendMessage("⚠️সরি আমি গ্রুপ এডমিনদের বের করতে পারবো না", event.threadID);
		}
		
		// 🤖 বট অ্যাডমিন চেক
		const botIsAdmin = threadInfo.adminIDs.some(admin => admin.id == api.getCurrentUserID());
		if (!botIsAdmin) {
			return api.sendMessage(getText("needPermssion"), event.threadID, event.messageID);
		}
		
		// 👨‍💼 ইউজার অ্যাডমিন চেক
		const userIsAdmin = threadInfo.adminIDs.some(admin => admin.id == event.senderID);
		if (!userIsAdmin) {
			return api.sendMessage("⚠️ You must be an admin to use this command!", event.threadID, event.messageID);
		}
		
		for (const uid of targetIDs) {
			// 🛡️ সিকিউরিটি চেক
			if (uid === event.senderID) {
				api.sendMessage(getText("cantKickSelf"), event.threadID);
				continue;
			}
			
			if (threadInfo.adminIDs.some(admin => admin.id == uid)) {
				api.sendMessage(getText("cantKickAdmin"), event.threadID);
				continue;
			}
			
			const participants = threadInfo.participantIDs || threadInfo.userInfo?.map(u => u.id) || [];
			if (!participants.includes(uid)) {
				api.sendMessage(getText("userNotInGroup"), event.threadID);
				continue;
			}
			
			// 💾 ডাটা প্রিপেয়ার
			const userName = userNames[uid] || "Unknown User";
			const kickInfo = {
				id: uid,
				name: userName,
				kickedBy: event.senderID,
				groupId: event.threadID,
				groupName: threadInfo.threadName || "Unknown Group"
			};
			
			// ⏳ কিক প্রসেস
			setTimeout(async () => {
				try {
					// 🚫 কিক অপারেশন
					await api.removeUserFromGroup(uid, event.threadID);
					
					// 📝 লিস্টে অ্যাড
					const darkName = addToKickList(kickInfo);
					
					// 📢 কনফার্মেশন মেসেজ
					const successMsg = `✅ 𝐒𝐮𝐜𝐜𝐞𝐬𝐬𝐟𝐮𝐥𝐥𝐲 𝐊𝐢𝐜𝐤𝐞𝐝!\n\n` +
						`👤𝗨𝘀𝗲𝗿: ${userName}\n` +
						`🆔𝗨𝗜𝗗: ${uid}`;
					
					api.sendMessage(successMsg, event.threadID);
					
				} catch (kickError) {
					console.error("Kick error:", kickError);
					api.sendMessage(`❌ Failed to kick: ${userName}`, event.threadID);
				}
			}, 1500);
		}
		
	} catch (error) {
		console.error("🚨 Command error:", error);
		api.sendMessage(`❌ Error: ${error.message || getText("error")}`, event.threadID);
	}
};

// 📦 মডিউল শুরু হলে ফাইল তৈরি করা
ensureKickFile();
