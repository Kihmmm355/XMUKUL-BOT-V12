module.exports.config = {
 name: "emoji_voice",
 version: "10.0",
 hasPermssion: 0,
 credits: "🔰𝐑𝐀𝐇𝐀𝐓 𝐈𝐒𝐋𝐀𝐌🔰",
 description: "Emoji",
 commandCategory: "noprefix",
 usages: "😘🥰😍",
 cooldowns: 5
};

const axios = require("axios");
const fs = require("fs");
const path = require("path");

const emojiAudioMap = {
 "I love you": "https://files.catbox.moe/g6dysb.mp3",
 "💋": "https://files.catbox.moe/g6dysb.mp3",
 "Love you": "https://files.catbox.moe/g6dysb.mp3",
 "Love you bot": "https://files.catbox.moe/g6dysb.mp3"
};

module.exports.handleEvent = async ({ api, event }) => {
 const { threadID, messageID, body } = event;
 if (!body || body.length > 2) return;

 const emoji = body.trim();
 const audioUrl = emojiAudioMap[emoji];
 if (!audioUrl) return;

 const cacheDir = path.join(__dirname, 'cache');
 if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

 const filePath = path.join(cacheDir, `${encodeURIComponent(emoji)}.mp3`);

 try {
 const response = await axios({
 method: 'GET',
 url: audioUrl,
 responseType: 'stream'
 });

 const writer = fs.createWriteStream(filePath);
 response.data.pipe(writer);

 writer.on('finish', () => {
 api.sendMessage({
 attachment: fs.createReadStream(filePath)
 }, threadID, () => {
 fs.unlink(filePath, (err) => {
 if (err) console.error("Error deleting file:", err);
 });
 }, messageID);
 });

 writer.on('error', (err) => {
 console.error("Error writing file:", err);
 api.sendMessage("ইমুজি দিয়ে লাভ নাই\nযাও মুড়ি খাও জান😘", threadID, messageID);
 });

 } catch (error) {
 console.error("Error downloading audio:", error);
 api.sendMessage("ইমুজি দিয়ে লাভ নাই\nযাও মুড়ি খাও জান😘", threadID, messageID);
 }
};

module.exports.run = () => {};
