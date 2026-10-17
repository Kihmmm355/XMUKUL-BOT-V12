module.exports.config = {
  name: "editx",
  version: "1.0.6",
  hasPermssion: 2,
  credits: "🔰𝐑𝐀𝐇𝐀𝐓 𝐈𝐒𝐋𝐀𝐌🔰",
  description: "Directly edit bot's replied message",
  commandCategory: "fun",
  usages: "reply to a bot message then type !edit <text>",
  cooldowns: 5,
};

module.exports.run = async function({ api, event, args }) {
 
  if (!event.messageReply || !event.messageReply.senderID) {
    return api.sendMessage("❌ | Please reply to a bot message to edit.", event.threadID);
  }

  if (event.messageReply.senderID !== api.getCurrentUserID()) {
    return api.sendMessage("❌ | You can only edit messages sent by the bot.", event.threadID);
  }

  if (!args.length) {
    return api.sendMessage("❌ | Please provide the text to edit.", event.threadID);
  }

  const newText = args.join(" ");
  const messageID = event.messageReply.messageID;

  try {
   
    await api.editMessage(newText, messageID);
    console.log(`✅ Successfully edited message: ${messageID}`);
  } catch (err) {
    console.error(`❌ Failed to edit message: ${messageID}`, err);
  }
};
