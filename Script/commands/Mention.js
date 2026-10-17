module.exports.config = {
  name: "mention",
  version: "3.0.0",
  hasPermssion: 2,
  credits: "🔰𝐑𝐀𝐇𝐀𝐓 𝐈𝐒𝐋𝐀𝐌🔰",
  description: "একবার করে বারবার কাউকে মেনশন করার কমান্ড",
  commandCategory: "group",
  usages: "mention [count] [@mention/@everyone/reply/UID/link/name]",
  cooldowns: 5
};

// ===== Helper: Full Name Mention Detection =====
async function getUIDByFullName(api, threadID, body) {
  if (!body || !body.includes("@")) return null;

  const match = body.match(/@(.+)/);
  if (!match) return null;

  const targetName = match[1].trim().toLowerCase().replace(/\s+/g, " ");

  // Check if it's @everyone
  if (targetName === "everyone") return "everyone";

  const threadInfo = await api.getThreadInfo(threadID);
  const users = threadInfo.userInfo || [];

  const user = users.find(u => {
      if (!u.name) return false;
      const fullName = u.name.trim().toLowerCase().replace(/\s+/g, " ");
      return fullName === targetName;
  });

  return user ? user.id : null;
}

// Helper function to parse target from arguments
async function parseTargetFromArgs(api, event, input) {
  const { threadID, mentions } = event;

  // Check for @everyone
  if (input.toLowerCase().includes("@everyone") || input.toLowerCase() === "everyone") {
      return { type: "everyone" };
  }

  // Way 1: Facebook profile link
  if (input.includes(".com/")) {
      try {
          const uid = await api.getUID(input);
          const userInfo = await api.getUserInfo(uid);
          return {
              type: "user",
              id: uid,
              name: userInfo[uid]?.name || "User"
          };
      } catch (e) {
          console.error("Error getting UID from link:", e);
          return null;
      }
  }

  // Way 2: Direct mention
  if (input.includes("@") && mentions) {
      const targetID = Object.keys(mentions)[0];
      if (targetID) {
          return {
              type: "user",
              id: targetID,
              name: mentions[targetID]?.replace("@", "") || "User"
          };
      } else {
          // Try full name detection
          const uid = await getUIDByFullName(api, threadID, input);
          if (uid === "everyone") {
              return { type: "everyone" };
          } else if (uid) {
              const userInfo = await api.getUserInfo(uid);
              return {
                  type: "user",
                  id: uid,
                  name: userInfo[uid]?.name || "User"
              };
          }
      }
  }

  // Way 3: Direct UID
  if (/^\d+$/.test(input.trim()) && input.trim().length > 5) {
      const uid = input.trim();
      try {
          const userInfo = await api.getUserInfo(uid);
          return {
              type: "user",
              id: uid,
              name: userInfo[uid]?.name || "User"
          };
      } catch (e) {
          return null;
      }
  }

  // Way 4: Full name without @
  if (input.trim().length > 0) {
      const uid = await getUIDByFullName(api, threadID, `@${input}`);
      if (uid === "everyone") {
          return { type: "everyone" };
      } else if (uid) {
          const userInfo = await api.getUserInfo(uid);
          return {
              type: "user",
              id: uid,
              name: userInfo[uid]?.name || "User"
          };
      }
  }

  return null;
}

module.exports.run = async ({ api, event, args }) => {
  const { threadID, messageID, senderID } = event;

  // ===== Parse count from first argument =====
  let count = 1;
  let target = null;
  let remainingArgs = [...args];

  // Check if first argument is a number
  if (remainingArgs.length > 0 && !isNaN(remainingArgs[0]) && remainingArgs[0].trim() !== "") {
      count = parseInt(remainingArgs[0]);
      remainingArgs = remainingArgs.slice(1); // Remove count from args

      // Validate count
      const maxCount = 100;
      if (count < 1) count = 1;
      if (count > maxCount) {
          count = maxCount;
          api.sendMessage(`⚠️ সর্বোচ্চ ${maxCount} বার মেনশন করা যাবে!`, threadID, messageID);
      }
  }

  // ===== Determine target =====
  // Way 1: Reply to a message
  if (event.type === "message_reply") {
      const replyID = event.messageReply.senderID;
      try {
          const userInfo = await api.getUserInfo(replyID);
          target = {
              type: "user",
              id: replyID,
              name: userInfo[replyID]?.name || "User"
          };
      } catch (e) {
          target = {
              type: "user",
              id: replyID,
              name: "User"
          };
      }

      // If there are remaining args after count, check if it's a new target
      if (remainingArgs.length > 0) {
          const newTarget = await parseTargetFromArgs(api, event, remainingArgs.join(" "));
          if (newTarget) {
              target = newTarget;
          }
      }
  } 
  // Way 2: Parse target from remaining arguments
  else if (remainingArgs.length > 0) {
      target = await parseTargetFromArgs(api, event, remainingArgs.join(" "));
  }
  // Way 3: Traditional mention (without count)
  else if (Object.keys(event.mentions || {}).length > 0) {
      const targetID = Object.keys(event.mentions)[0];
      target = {
          type: "user",
          id: targetID,
          name: event.mentions[targetID]?.replace("@", "") || "User"
      };
  } 
  else {
      return api.sendMessage(
          `❌যাকে চিপা থেকে বের করতে চাও তাকে ম্যানশন করো\n!mention 6 @Rahat Islam\n!mention 6 [uid]`,
          threadID,
          messageID
      );
  }

  if (!target) {
      return api.sendMessage("❌ইউজার ডিটেক্ট করা যায়নি!\n!mention 6 @Rahat Islam\n!mention 6 [uid]", threadID, messageID);
  }

  // Get user name if not already got (for user type)
  if (target.type === "user" && (!target.name || target.name === "User")) {
      try {
          const userInfo = await api.getUserInfo(target.id);
          target.name = userInfo[target.id]?.name || "User";
      } catch (e) {
          target.name = "User";
      }
  }

  // Check if trying to mention oneself
  if (target.type === "user" && target.id === senderID) {
      return api.sendMessage("", threadID, messageID);
  }

  // Send confirmation message
  if (target.type === "everyone") {
      api.sendMessage(
          ``,
          threadID,
          messageID
      );

      // Get all group members
      try {
          const threadInfo = await api.getThreadInfo(threadID);
          const participants = threadInfo.participantIDs;

          // Filter out bot itself
          const targetIDs = participants.filter(id => id !== senderID);

          if (targetIDs.length === 0) {
              return api.sendMessage("❌ গ্রুপে মেনশন করার মতো কেউ নেই!", threadID, messageID);
          }

          // Get names for all participants
          const userInfos = await api.getUserInfo(targetIDs);

          const mentionMessages = [
              "📢 @everyone\nসবাই চিপা থেকে বের হও🐸",
              "👥 @everyone\n🐸চিপায় অনেক মশা আছে"
          ];

          let successCount = 0;

          for (let i = 0; i < count; i++) {
              try {
                  // Create mentions array
                  const mentions = targetIDs.map(id => ({
                      tag: userInfos[id]?.name || "User",
                      id: id
                  }));

                  // Select a random message
                  const messageIndex = Math.floor(Math.random() * mentionMessages.length);
                  const messageBody = mentionMessages[messageIndex];

                  await api.sendMessage({
                      body: messageBody,
                      mentions: mentions
                  }, threadID);

                  successCount++;

                  // Add delay between mentions
                  if (i < count - 1) {
                      await new Promise(resolve => setTimeout(resolve, 2000));
                  }
              } catch (error) {
                  console.error(``, error);
              }
          }

          return api.sendMessage(
              ``,
              threadID,
              messageID
          );

      } catch (error) {
          console.error("Error getting group info:", error);
          return api.sendMessage("", threadID, messageID);
      }
  } else {
      // Single user mention
      api.sendMessage(
          ``,
          threadID,
          messageID
      );

      const mentionMessages = [
          `${target.name}\nচিপা থেকে বের হও🐸🔪`,
          `@${target.name} বস ডাকছে🏃‍♂️`
      ];

      let successCount = 0;

      for (let i = 0; i < count; i++) {
          try {
              // Select a random message from the array
              const messageIndex = Math.floor(Math.random() * mentionMessages.length);
              const messageBody = mentionMessages[messageIndex];

              await api.sendMessage({
                  body: messageBody,
                  mentions: [{ tag: target.name, id: target.id }]
              }, threadID);

              successCount++;

              // Add delay between mentions (1.5 seconds)
              if (i < count - 1) {
                  await new Promise(resolve => setTimeout(resolve, 1500));
              }
          } catch (error) {
              console.error(``, error);
          }
      }

      // Send completion message
      return api.sendMessage(
          ``,
          threadID,
          messageID
      );
  }
};