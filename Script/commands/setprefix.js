module.exports.config = {
	name: "setprefix",
	version: "1.0.1",
	hasPermssion: 0,
	credits: "🔰𝐑𝐀𝐇𝐀𝐓 𝐈𝐒𝐋𝐀𝐌🔰",
	description: "Reset group prefix",
	commandCategory: "Group",
	usages: "[prefix/reset]",
	cooldowns: 5
};

module.exports.languages ={
	"vi": {
		"successChange": "Đã chuyển đổi prefix của nhóm thành: %1",
		"missingInput": "Phần prefix cần đặt không được để trống",
		"resetPrefix": "Đã reset prefix về mặc định: %1",
		"confirmChange": "Bạn có chắc bạn muốn đổi prefix của nhóm thành: %1"
	},
	"en": {
		"successChange": "> 🎀\n𝐂𝐡𝐚𝐧𝐠𝐞𝐝 𝐩𝐫𝐞𝐟𝐢𝐱 𝐢𝐧𝐭𝐨: %1",
		"missingInput": "> 🎀\n𝐏𝐫𝐞𝐟𝐢𝐱 𝐡𝐚𝐯𝐞 𝐧𝐨𝐭 𝐭𝐨 𝐛𝐞 𝐛𝐥𝐚𝐧𝐤",
		"resetPrefix": "> 🎀\n 𝐏𝐫𝐞𝐟𝐢𝐱 𝐭𝐨: %1",
		"confirmChange": "> 🎀\n𝐀𝐫𝐞 𝐲𝐨𝐮 𝐬𝐮𝐫𝐞 𝐭𝐡𝐚𝐭 𝐲𝐨𝐮 𝐰𝐚𝐧𝐭 𝐭𝐨 𝐜𝐡𝐚𝐧𝐠𝐞 𝐩𝐫𝐞𝐟𝐢𝐱 𝐢𝐧𝐭𝐨: %1"
	}
}

module.exports.handleReaction = async function({ api, event, Threads, handleReaction, getText }) {
	try {
		if (event.userID != handleReaction.author) return;
		const { threadID, messageID } = event;
		var data = (await Threads.getData(String(threadID))).data || {};
		data["PREFIX"] = handleReaction.PREFIX;
		await Threads.setData(threadID, { data });
		await global.data.threadData.set(String(threadID), data);
		api.unsendMessage(handleReaction.messageID);
		return api.sendMessage(getText("successChange", handleReaction.PREFIX), threadID, messageID);
	} catch (e) { return console.log(e) }
}

module.exports.run = async ({ api, event, args, Threads , getText }) => {
	if (typeof args[0] == "undefined") return api.sendMessage(getText("missingInput"), event.threadID, event.messageID);
	let prefix = args[0].trim();
	if (!prefix) return api.sendMessage(getText("missingInput"), event.threadID, event.messageID);
	if (prefix == "reset") {
		var data = (await Threads.getData(event.threadID)).data || {};
		data["PREFIX"] = global.config.PREFIX;
		await Threads.setData(event.threadID, { data });
		await global.data.threadData.set(String(event.threadID), data);
		return api.sendMessage(getText("resetPrefix", global.config.PREFIX), event.threadID, event.messageID);
	} else return api.sendMessage(getText("confirmChange", prefix), event.threadID, (error, info) => {
		global.client.handleReaction.push({
			name: "setprefix",
			messageID: info.messageID,
			author: event.senderID,
			PREFIX: prefix
		})
	})
}
