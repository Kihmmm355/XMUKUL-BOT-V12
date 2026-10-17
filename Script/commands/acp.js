module.exports.config = {
  name: "acp",
  version: "1.1.0",
  hasPermssion: 2,
  credits: "🔰𝐑𝐀𝐇𝐀𝐓 𝐈𝐒𝐋𝐀𝐌🔰",
  description: "Accept friend requests with beautiful frame UI 💫",
  commandCategory: "OTHER",
  usages: "[@mention/reply/UID/link/name] or list",
  cooldowns: 0
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

module.exports.handleReply = async ({ handleReply, event, api }) => {
  const { author, listRequest } = handleReply;
  if (author != event.senderID) return;

  const args = event.body.trim().split(/ +/);
  if (!args[0]) return api.sendMessage("⚠ | Please choose: fram <number | all>", event.threadID);

  const form = {
    av: api.getCurrentUserID(),
    fb_api_caller_class: "RelayModern",
    variables: {
      input: {
        source: "friends_tab",
        actor_id: api.getCurrentUserID(),
        client_mutation_id: Math.round(Math.random() * 19).toString()
      },
      scale: 3,
      refresh_num: 0
    }
  };

  const success = [];
  const failed = [];

  // default to "add" type (fram)
  form.fb_api_req_friendly_name = "FriendingCometFriendRequestConfirmMutation";
  form.doc_id = "3147613905362928";

  let targetIDs = args.slice(1);
  if (args[1] == "all" || args[0] == "all") {
    targetIDs = [];
    for (let i = 1; i <= listRequest.length; i++) targetIDs.push(i);
  }

  const promiseFriends = [];
  const newTargetIDs = [];

  for (const stt of targetIDs) {
    const u = listRequest[parseInt(stt) - 1];
    if (!u) {
      failed.push(`❌ | Not found index ${stt}`);
      continue;
    }
    form.variables.input.friend_requester_id = u.node.id;
    form.variables = JSON.stringify(form.variables);
    newTargetIDs.push(u);
    promiseFriends.push(api.httpPost("https://www.facebook.com/api/graphql/", form));
    form.variables = JSON.parse(form.variables);
  }

  for (let i = 0; i < newTargetIDs.length; i++) {
    try {
      const friendRequest = await promiseFriends[i];
      if (JSON.parse(friendRequest).errors) failed.push(newTargetIDs[i].node.name);
      else success.push(newTargetIDs[i].node.name);
    } catch {
      failed.push(newTargetIDs[i].node.name);
    }
  }

  let msg = `✅ | Successfully accepted ${success.length} friend requests:\n`;
  msg += success.map((n, i) => `${i + 1}. ${n}`).join("\n");
  if (failed.length > 0)
    msg += `\n\n❌ | Failed to accept ${failed.length}:\n${failed.join("\n")}`;

  api.sendMessage(msg, event.threadID, event.messageID);
};

module.exports.run = async ({ event, api, args }) => {
  const { threadID, messageID, senderID } = event;
  
  // যদি কোনো আর্গুমেন্ট থাকে (যেমন UID, মেনশন, লিঙ্ক)
  if (args[0]) {
    // ===== Determine targetID in three ways =====
    let targetID;
    
    if (event.type === "message_reply") {
      // Way 1: Reply to a message
      targetID = event.messageReply.senderID;
    } else if (args[0]) {
      if (args[0].indexOf(".com/") !== -1) {
        // Way 2: Facebook profile link
        targetID = await api.getUID(args[0]);
      } else if (args.join().includes("@")) {
        // Way 3: Mention or full name
        // 3a: Direct Facebook mention
        targetID = Object.keys(event.mentions || {})[0];
        if (!targetID) {
          // 3b: Full name detection
          targetID = await getUIDByFullName(api, event.threadID, args.join(" "));
        }
      } else {
        // Direct UID
        targetID = args[0];
      }
    }
    
    if (targetID) {
      // সরাসরি UID দিয়ে ফ্রেন্ড রিকোয়েস্ট পাঠানোর লজিক
      // Note: এটি কাজ করবে কিনা তা API এর উপর নির্ভর করে
      const form = {
        av: api.getCurrentUserID(),
        fb_api_caller_class: "RelayModern",
        variables: {
          input: {
            source: "friends_tab",
            actor_id: api.getCurrentUserID(),
            friend_requester_id: targetID,
            client_mutation_id: Math.round(Math.random() * 19).toString()
          },
          scale: 3,
          refresh_num: 0
        },
        fb_api_req_friendly_name: "FriendingCometFriendRequestConfirmMutation",
        doc_id: "3147613905362928"
      };
      
      try {
        const result = await api.httpPost("https://www.facebook.com/api/graphql/", form);
        if (JSON.parse(result).errors) {
          return api.sendMessage(`❌ | Failed to accept friend request from UID: ${targetID}`, threadID, messageID);
        } else {
          return api.sendMessage(`✅ | Successfully accepted friend request from UID: ${targetID}`, threadID, messageID);
        }
      } catch (error) {
        return api.sendMessage(`❌ | Error: ${error.message}`, threadID, messageID);
      }
    }
  }
  
  // যদি কোনো আর্গুমেন্ট না থাকে, তাহলে ফ্রেন্ড রিকোয়েস্ট লিস্ট দেখাবে
  const form = {
    av: api.getCurrentUserID(),
    fb_api_req_friendly_name: "FriendingCometFriendRequestsRootQueryRelayPreloader",
    fb_api_caller_class: "RelayModern",
    doc_id: "4499164963466303",
    variables: JSON.stringify({ input: { scale: 3 } })
  };

  const res = JSON.parse(await api.httpPost("https://www.facebook.com/api/graphql/", form));
  const listRequest = res.data.viewer.friending_possibilities.edges;
  if (!listRequest || listRequest.length === 0)
    return api.sendMessage("✅ | No friend requests found.", event.threadID);

  let msg = `╭─‣🔰𝐒𝐮𝐠𝐠𝐞𝐬𝐭𝐞𝐝 𝐅𝐫𝐢𝐞𝐧𝐝𝐬🔰\n├‣ 𝐀𝐝𝐦𝐢𝐧:𝐑𝐀𝐇𝐀𝐓 𝐈𝐒𝐋𝐀𝐌\n├‣ 𝐓𝐨𝐭𝐚𝐥 𝐔𝐬𝐞𝐫𝐬: ${listRequest.length}\n╰────────────◊\n`;

  let i = 0;
  for (const user of listRequest) {
    i++;
    msg += `\n╭─‣ ${i}: ${user.node.name}\n├‣ UID: ${user.node.id}\n├‣ Profile: ${user.node.url.replace("www.facebook", "fb")}\n╰────────────◊\n`;
  }

  msg += `\n📄 | 𝐑𝐞𝐩𝐥𝐲: fram <number | all>\nℹ | Example: fram 1 3 5  or  fram all`;

  api.sendMessage(msg, event.threadID, (err, info) => {
    if (err) return;
    global.client.handleReply.push({
      name: this.config.name,
      messageID: info.messageID,
      listRequest,
      author: event.senderID
    });
  });
};
