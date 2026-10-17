module.exports.config = {
    name: "leave",
    version: "1.0.0",
    hasPermssion: 2,  // শুধুমাত্র admin-level ইউজার চালাতে পারবে
    credits: "rX Abdullah",
    description: "Make the bot leave the group",
    commandCategory: "System", 
    usages: "leave",
    cooldowns: 5
};

module.exports.run = async ({ api, event }) => {
    const { threadID } = event;
    api.sendMessage("👋 Bot is leaving this group!", threadID, () => {
        api.removeUserFromGroup(api.getCurrentUserID(), threadID);
    });
};
