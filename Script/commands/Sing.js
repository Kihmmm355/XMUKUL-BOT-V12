const axios = require("axios");
const fs = require("fs");
const path = require("path");
const yts = require("yt-search");

const nix = "https://raw.githubusercontent.com/aryannix/stuffs/master/raw/apis.json";

async function getStream(url) {
  const res = await axios({ url, responseType: "stream" });
  return res.data;
}

async function downloadSong(baseApi, url, api, event, title = null) {
  try {
    const apiUrl = `${baseApi}/play?url=${encodeURIComponent(url)}`;
    const res = await axios.get(apiUrl);
    const data = res.data;

    if (!data.status || !data.downloadUrl)
      throw new Error("API failed");

    const songTitle = title || data.title;
    const fileName = `${songTitle}.mp3`.replace(/[\\/:"*?<>|]/g, "");
    const filePath = path.join(__dirname, "cache", fileName);

    const songData = await axios.get(data.downloadUrl, {
      responseType: "arraybuffer"
    });
    fs.writeFileSync(filePath, songData.data);

    api.sendMessage(
      {
        body: `🎵 ${songTitle}`,
        attachment: fs.createReadStream(filePath)
      },
      event.threadID,
      () => fs.unlinkSync(filePath)
    );
  } catch (e) {
    api.sendMessage("❌ গান ডাউনলোড করতে সমস্যা হয়েছে", event.threadID);
  }
}

module.exports.config = {
  name: "sing",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "ArYAN",
  description: "YouTube থেকে গান সার্চ ও ডাউনলোড",
  commandCategory: "music",
  usages: "[song name]",
  cooldowns: 5
};

module.exports.run = async function ({ api, event, args }) {
  let baseApi;

  try {
    const res = await axios.get(nix);
    baseApi = res.data.api;
    if (!baseApi) throw new Error("API missing");
  } catch {
    return api.sendMessage(
      "❌ API config লোড করা যায়নি",
      event.threadID
    );
  }

  if (!args.length)
    return api.sendMessage(
      "❌ গানের নাম লিখো",
      event.threadID
    );

  const query = args.join(" ");

  if (query.startsWith("http")) {
    return downloadSong(baseApi, query, api, event);
  }

  const search = await yts(query);
  const videos = search.videos.slice(0, 6);

  if (!videos.length)
    return api.sendMessage("❌ কোনো রেজাল্ট পাওয়া যায়নি", event.threadID);

  let msg = "🎶 Song List 🎶\n\n";
  videos.forEach((v, i) => {
    msg += `${i + 1}. ${v.title}\n⏱ ${v.timestamp}\n\n`;
  });
  msg += "👉 রিপ্লাই করো (1-6)";

  const thumbs = await Promise.all(
    videos.map(v => getStream(v.thumbnail))
  );

  api.sendMessage(
    { body: msg, attachment: thumbs },
    event.threadID,
    (err, info) => {
      global.client.handleReply.push({
        name: module.exports.config.name,
        messageID: info.messageID,
        author: event.senderID,
        videos,
        baseApi
      });
    }
  );
};

module.exports.handleReply = async function ({ api, event, handleReply }) {
  if (event.senderID != handleReply.author) return;

  const choice = parseInt(event.body);
  if (isNaN(choice) || choice < 1 || choice > handleReply.videos.length)
    return api.sendMessage("❌ ভুল নাম্বার", event.threadID);

  const video = handleReply.videos[choice - 1];
  api.unsendMessage(handleReply.messageID);

  downloadSong(handleReply.baseApi, video.url, api, event, video.title);
};