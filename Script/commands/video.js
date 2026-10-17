const axios = require("axios");
const yts = require("yt-search");

// ===== Base API =====
async function baseApiUrl() {
  const res = await axios.get(
    "https://raw.githubusercontent.com/Mostakim0978/D1PT0/refs/heads/main/baseApiUrl.json"
  );
  return res.data.api;
}

// ===== Get Stream =====
async function getStreamFromURL(url, fileName) {
  const res = await axios.get(url, { responseType: "stream" });
  res.data.path = fileName;
  return res.data;
}

// ===== Get YouTube ID =====
function getVideoID(url) {
  const reg =
    /^(?:https?:\/\/)?(?:m\.|www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))((\w|-){11})/;
  const match = url.match(reg);
  return match ? match[1] : null;
}

// ===== CONFIG =====
module.exports.config = {
  name: "video",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "Mesbah Saxx | Mirai Convert",
  description: "Download YouTube video",
  commandCategory: "media",
  usages: "video <name/url>",
  cooldowns: 5
};

// ===== RUN =====
module.exports.run = async function ({ api, event, args }) {
  let loadingMsg;

  try {
    if (!args[0])
      return api.sendMessage(
        "❌ Video name or YouTube link dao.",
        event.threadID,
        event.messageID
      );

    // load api
    const API = await baseApiUrl();

    let videoID;
    const input = args[0];

    // ===== URL MODE =====
    if (input.includes("youtube.com") || input.includes("youtu.be")) {
      videoID = getVideoID(input);
      if (!videoID)
        return api.sendMessage(
          "❌ Invalid YouTube URL.",
          event.threadID,
          event.messageID
        );
    }

    // ===== SEARCH MODE =====
    else {
      const searchQuery = args.join(" ");
      loadingMsg = await api.sendMessage(
        `🔎 Searching "${searchQuery}"...`,
        event.threadID
      );

      const result = await yts(searchQuery);
      if (!result.videos.length)
        return api.sendMessage("❌ No video found.", event.threadID);

      const randomVideo =
        result.videos[Math.floor(Math.random() * result.videos.length)];

      videoID = randomVideo.videoId;
    }

    // ===== API DOWNLOAD =====
    const { data } = await axios.get(
      `${API}/ytDl3?link=${videoID}&format=mp4`
    );

    if (loadingMsg) api.unsendMessage(loadingMsg.messageID);

    const { title, quality, downloadLink } = data;

    // ===== SHORT LINK =====
    const shortLink = (
      await axios.get(
        `https://tinyurl.com/api-create.php?url=${encodeURIComponent(
          downloadLink
        )}`
      )
    ).data;

    // ===== SEND VIDEO =====
    return api.sendMessage(
      {
        body:
`🔖 Title: ${title}
✨ Quality: ${quality}

📥 Download Link: ${shortLink}`,
        attachment: await getStreamFromURL(
          downloadLink,
          title.replace(/[\/\\:*?"<>|]/g, "") + ".mp4"
        )
      },
      event.threadID,
      event.messageID
    );
  } catch (err) {
    api.sendMessage(
      "❌ Error: " + (err.message || "Download failed."),
      event.threadID,
      event.messageID
    );
  }
};