const wl = require("../../includes/Rahat_wl.js");

const AUTO_UNSEND_SEC = 40;

module.exports.config = {
  name: "wl",
  version: "1.0.0",
  hasPermssion: 2,
  credits: "🔰𝐑𝐀𝐇𝐀𝐓 𝐈𝐒𝐋𝐀𝐌🔰",
  description: "Whitelist mode - শুধু অ্যাডমিন/নির্বাচিত ইউজার/গ্রুপ বট ব্যবহার করতে পারবে",
  commandCategory: "Admin",
  usages: "wl on | wl off | wl on [reply/@mention/uid/tid/here] | wl off [reply/@mention/uid/tid] | wl list",
  cooldowns: 2
};

const USAGE =
`🔒 𝗪𝗵𝗶𝘁𝗲𝗹𝗶𝘀𝘁 𝗖𝗼𝗺𝗺𝗮𝗻𝗱
━━━━━━━━━━━━━━━━━━━
• wl on  → চালু (শুধু অ্যাডমিন)
• wl off → বন্ধ (সবাই ব্যবহার করতে পারবে)
• wl on (reply/@mention/uid)
• wl on  (গ্রুপের tid)
• wl on  here → এই গ্রুপটা যোগ করবে
• wl off  (reply/@mention/uid/tid)
• wl list → সবার লিস্ট`;

function reply(api, event, text) {
  return new Promise((resolve) => {
    api.sendMessage(text, event.threadID, (err, info) => {
      if (!err && info && info.messageID && AUTO_UNSEND_SEC > 0) {
        setTimeout(() => {
          try { api.unsendMessage(info.messageID); } catch (_e) {}
        }, AUTO_UNSEND_SEC * 1000);
      }
      resolve(info);
    }, event.messageID);
  });
}

async function userName(Users, id) {
  try {
    const n = await Users.getNameUser(id);
    if (n) return n;
  } catch (_e) {}
  return "Unknown";
}

async function groupName(Threads, id) {
  try {
    const cached = global.data.threadInfo.get(String(id));
    if (cached && (cached.threadName || cached.name)) return cached.threadName || cached.name;
  } catch (_e) {}
  try {
    const info = await Threads.getInfo(id);
    if (info && (info.threadName || info.name)) return info.threadName || info.name;
  } catch (_e) {}
  return "Unknown Group";
}

// মেনশন / রিপ্লাই / সংখ্যা থেকে ইউজার আর গ্রুপ আলাদা করে বের করে
function parseTargets(event, tokens, removing) {
  const users = new Set();
  const threads = new Set();

  Object.keys(event.mentions || {}).forEach((id) => users.add(String(id)));
  if (event.type === "message_reply" && event.messageReply && event.messageReply.senderID)
    users.add(String(event.messageReply.senderID));

  const allThreads = (global.data && global.data.allThreadID) || [];
  const allUsers = (global.data && global.data.allUserID) || [];

  let forced = null;
  for (const tok of tokens) {
    const t = String(tok).toLowerCase();
    if (["user", "uid", "u"].includes(t)) { forced = "user"; continue; }
    if (["group", "tid", "gc", "g", "thread"].includes(t)) { forced = "thread"; continue; }
    if (["here", "this", "current"].includes(t)) {
      if (event.isGroup) threads.add(String(event.threadID));
      continue;
    }
    if (/^\d{5,}$/.test(tok)) {
      const id = String(tok);
      if (forced === "user") users.add(id);
      else if (forced === "thread") threads.add(id);
      else if (removing && wl.getState().users.includes(id)) users.add(id);   // সরানোর সময় লিস্ট দেখেই বুঝে নেয়
      else if (removing && wl.getState().threads.includes(id)) threads.add(id);
      else if (allThreads.map(String).includes(id)) threads.add(id);
      else if (allUsers.map(String).includes(id)) users.add(id);
      else threads.add(id); // ডিফল্ট: সংখ্যা মানে গ্রুপ tid
    }
  }
  return { users: [...users], threads: [...threads] };
}

async function handleAdd({ api, event, tokens, Users, Threads }) {
  const { users, threads } = parseTargets(event, tokens);
  if (!users.length && !threads.length)
    return reply(api, event, "❌ কাকে যোগ করবো বুঝতে পারলাম না।\nreply দিন, @mention করুন, অথবা uid/tid দিন।\n\n" + "উদাহরণ: wl on 1234567890123456");

  const lines = [];
  for (const id of users) {
    const name = await userName(Users, id);
    if (wl.isAdmin(id)) { lines.push(`ℹ️ ${name} (${id}) আগে থেকেই অ্যাডমিন।`); continue; }
    lines.push(wl.addUser(id) ? `✅ ইউজার যোগ হয়েছে: ${name} (${id})` : `ℹ️ ${name} (${id}) আগে থেকেই লিস্টে আছে।`);
  }
  for (const id of threads) {
    const name = await groupName(Threads, id);
    lines.push(wl.addThread(id) ? `✅ গ্রুপ যোগ হয়েছে: ${name} (${id})` : `ℹ️ ${name} (${id}) আগে থেকেই লিস্টে আছে।`);
  }
  if (!wl.isOn()) lines.push("\n⚠️ Whitelist এখন বন্ধ আছে। চালু করতে লিখুন: wl on");
  return reply(api, event, lines.join("\n"));
}

async function handleRemove({ api, event, tokens, Users, Threads }) {
  const { users, threads } = parseTargets(event, tokens, true);
  if (!users.length && !threads.length)
    return reply(api, event, "❌ কাকে সরাবো বুঝতে পারলাম না।\nreply দিন, @mention করুন, অথবা uid/tid দিন।");

  const lines = [];
  for (const id of users) {
    const name = await userName(Users, id);
    lines.push(wl.removeUser(id) ? `🗑️ ইউজার সরানো হয়েছে: ${name} (${id})` : `ℹ️ ${name} (${id}) লিস্টে ছিল না।`);
  }
  for (const id of threads) {
    const name = await groupName(Threads, id);
    lines.push(wl.removeThread(id) ? `🗑️ গ্রুপ সরানো হয়েছে: ${name} (${id})` : `ℹ️ ${name} (${id}) লিস্টে ছিল না।`);
  }
  return reply(api, event, lines.join("\n"));
}

async function handleList({ api, event, Users, Threads }) {
  const s = wl.getState();
  const cfg = global.config || {};
  const adminIDs = [...new Set([...(cfg.ADMINBOT || []), ...(cfg.NDH || [])].map(String))];

  let out = `🔒 𝗪𝗵𝗶𝘁𝗲𝗹𝗶𝘀𝘁: ${s.on ? "🟢 ON" : "🔴 OFF"}\n━━━━━━━━━━━━━━━\n`;

  out += `\n👑অ্যাডমিন(সবসময় অনুমতি আছে): ${adminIDs.length}\n`;
  let i = 1;
  for (const id of adminIDs) out += `${i++}. ${await userName(Users, id)} (${id})\n`;

  out += `\n👤 যোগ করা ইউজার: ${s.users.length}\n`;
  if (!s.users.length) out += "— কেউ নেই —\n";
  i = 1;
  for (const id of s.users) out += `${i++}. ${await userName(Users, id)} (${id})\n`;

  out += `\n🏠 যোগ করা গ্রুপ: ${s.threads.length}\n`;
  if (!s.threads.length) out += "— কোনো গ্রুপ নেই —\n";
  i = 1;
  for (const id of s.threads) out += `${i++}. ${await groupName(Threads, id)} (${id})\n`;

  return reply(api, event, out.trim());
}

module.exports.run = async function ({ api, event, args, Users, Threads }) {
  // শুধু বটের এডমিন (ADMINBOT + NDH)। রিমোট distributorAdmins এখানে ঢুকতে পারবে না।
  if (!wl.isAdmin(event.senderID)) return;

  const tokens = args.map((a) => String(a));
  const first = (tokens[0] || "").toLowerCase();
  let rest = tokens.slice(1);
  // পুরনো স্টাইল "wl on add ..." / "wl off add ..." ও কাজ করবে
  if (rest.length && ["add", "+", "remove", "rm", "del", "delete", "-"].includes(rest[0].toLowerCase())) rest = rest.slice(1);

  // কাউকে টার্গেট করা হয়েছে কিনা: reply / @mention / সংখ্যা / here
  const hasTarget =
    rest.length > 0 ||
    Object.keys(event.mentions || {}).length > 0 ||
    (event.type === "message_reply" && !!event.messageReply);

  try {
    if (first === "on") {
      if (!hasTarget) {
        wl.setOn(true);
        return reply(api, event,
          "🟢 Whitelist ON\nশুধু এডমিন ব্যবহার করতে পারবে🥸");
      }
      return handleAdd({ api, event, tokens: rest, Users, Threads });
    }

    if (first === "off") {
      if (!hasTarget) {
        wl.setOn(false);
        return reply(api, event, "🔴 Whitelist OFF\nসবাই ব্যবহার করতে পারবে");
      }
      return handleRemove({ api, event, tokens: rest, Users, Threads });
    }

    if (["list", "ls", "status"].includes(first)) return handleList({ api, event, Users, Threads });

    return reply(api, event, `${USAGE}\n\n📌 বর্তমান অবস্থা: ${wl.isOn() ? "🟢 ON" : "🔴 OFF"}`);
  } catch (e) {
    return reply(api, event, "⚠️ Wl এ সমস্যা হয়েছে: " + (e && e.message ? e.message : e));
  }
};
