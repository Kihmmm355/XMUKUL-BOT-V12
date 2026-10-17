module.exports.config = {
 'name': "random",
 'version': "11.9.7",
 'hasPermission': 0,
 'credits': "🔰𝐑𝐀𝐇𝐀𝐓 𝐈𝐒𝐋𝐀𝐌🔰",
 'description': "random love story video",
 'commandCategory': "video",
 'usages': "random",
 'cooldowns': 5
};

module.exports.run = async function ({ api, event }) {
 const axios = require("axios");
 const request = require("request");
 const fs = require('fs');
 
 const apiResponse = await axios.get("https://raw.githubusercontent.com/shaonproject/Shaon/main/api.json");
 const apiUrl = apiResponse.data.api;
 
 var videoUrls = [apiUrl + "/video/random"];
 var randomUrl = videoUrls[Math.floor(Math.random() * videoUrls.length)];
 
 axios.get(randomUrl).then(response => {
 let videoCount = response.data.count;
 let videoName = response.data.name;
 
 let sendVideo = function () {
 api.sendMessage({
 'body': "𝐑𝐀𝐍𝐃𝐎𝐌 𝐌𝐈𝐗 \nAdded by: [" + videoName + "]\n𝚃𝙾𝚃𝙰𝙻 𝚅𝙸𝙳𝙴𝙾:" + videoCount + "...🎬\n\n🔰𝐑𝐀𝐇𝐀𝐓 𝐁𝐎𝐓🔰",
 'attachment': fs.createReadStream(__dirname + "/cache/Shaoon.mp4")
 }, event.threadID, () => fs.unlinkSync(__dirname + "/cache/Shaoon.mp4"), event.messageID);
 };
 
 request(response.data.url).pipe(fs.createWriteStream(__dirname + "/cache/Shaoon.mp4")).on("close", sendVideo);
 });
};
