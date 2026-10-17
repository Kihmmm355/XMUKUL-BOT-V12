const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "approve",
  version: "1.8",
  hasPermssion: 2,
  credits: "🔰𝐑𝐀𝐇𝐀𝐓 𝐈𝐒𝐋𝐀𝐌🔰",
  description: "Approve group, show list & reply number to remove",
  commandCategory: "Admin",
  usages: "!approve <tid> <2day/2month/2year> | !approve box",
  cooldowns: 5,
};

const DATA_PATH = path.join(__dirname, "data", "thuebot.json");

// ===== DATE FORMAT =====
const formatDate = (d) =>
  `${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1
  ).padStart(2, "0")}/${d.getFullYear()}`;

const parseDate = (str) => {
  const [dd, mm, yy] = str.split("/").map(Number);
  return new Date(yy, mm - 1, dd);
};

// ===== MAIN =====
module.exports.run = async ({ api, event, args }) => {

  // ===== REPLY REMOVE MODE =====
  if (
    event.messageReply &&
    event.messageReply.body &&
    event.messageReply.body.includes("𝐀𝐏𝐏𝐑𝐎𝐕𝐄𝐃 𝐆𝐑𝐎𝐔𝐏𝐒")
  ) {
    const index = parseInt(args[0]) - 1;

    if (isNaN(index))
      return api.sendMessage("❌ Only number allowed!", event.threadID);

    if (!fs.existsSync(DATA_PATH))
      return api.sendMessage("❌ No approved group found!", event.threadID);

    let data = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));

    if (index < 0 || index >= data.length)
      return api.sendMessage("❌ Invalid number!", event.threadID);

    const removed = data.splice(index, 1)[0];
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));

    return api.sendMessage(
      `✅ Approved Group Removed\n\nTID : ${removed.t_id}`,
      event.threadID
    );
  }

  // ===== BOX MODE =====
  if (args[0] === "box") {
    if (!fs.existsSync(DATA_PATH))
      return api.sendMessage("❌ No approved group found!", event.threadID);

    const data = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
    if (!data.length)
      return api.sendMessage("❌ No approved group found!", event.threadID);

    let msg = "";
    msg += "╭─‣ 𝐀𝐏𝐏𝐑𝐎𝐕𝐄𝐃 𝐆𝐑𝐎𝐔𝐏𝐒\n";
    msg += `├‣ 𝐓𝐎𝐓𝐀𝐋 : ${data.length}\n`;
    msg += "├‣ 🔰𝐑𝐀𝐇𝐀𝐓 𝐈𝐒𝐋𝐀𝐌🔰\n";
    msg += "╰────────────◊\n";
    msg += "  ─────×\n";

    data.forEach((g, i) => {
      const start = parseDate(g.time_start);
      const end = parseDate(g.time_end);
      const now = new Date();
      const remain = Math.max(
        0,
        Math.ceil((end - now) / (1000 * 60 * 60 * 24))
      );

      msg += `╭─‣ ${i + 1}. 𝐓𝐈𝐃 : ${g.t_id}\n`;
      msg += `├‣ type : ${g.user || "Everyone"}\n`;
      msg += `├‣ start date : ${g.time_start}\n`;
      msg += `├‣ end date : ${g.time_end}\n`;
      msg += `├‣ remaining day : ${remain}\n`;
      msg += "╰────────────◊\n";
      msg += "  ─────×\n";
    });

    msg += "\n💡 Reply this message with number (1,2,3...) to remove";

    return api.sendMessage(msg.trim(), event.threadID);
  }

  // ===== ADD MODE =====
  if (args.length < 2)
    return api.sendMessage(
      "Usage:\n!approve <tid> <2day/2month/2year>\n!approve box",
      event.threadID
    );

  const tid = args[0];
  const period = args[1].toLowerCase();
  const match = period.match(/^(\d+)(day|month|year)$/);

  if (!match)
    return api.sendMessage(
      "❌ Invalid format! Example: 2day / 3month / 1year",
      event.threadID
    );

  const num = parseInt(match[1]);
  const unit = match[2];

  const start = new Date();
  const end = new Date();

  if (unit === "day") end.setDate(end.getDate() + num);
  if (unit === "month") end.setMonth(end.getMonth() + num);
  if (unit === "year") end.setFullYear(end.getFullYear() + num);

  let data = [];
  if (fs.existsSync(DATA_PATH)) {
    data = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  }

  if (data.find((e) => e.t_id === tid))
    return api.sendMessage("❌ This group already approved!", event.threadID);

  data.push({
    t_id: tid,
    user: "Everyone",
    time_start: formatDate(start),
    time_end: formatDate(end),
  });

  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));

  api.sendMessage(
    `✅ Group Approved!\n\nTID : ${tid}\nFrom : ${formatDate(
      start
    )}\nTo : ${formatDate(end)}`,
    event.threadID
  );
};
