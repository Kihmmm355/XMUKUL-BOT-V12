module.exports.config = {
    name: "out",
    version: "1.0.0",
    hasPermssion: 2,
    credits: "🔰𝐑𝐀𝐇𝐀𝐓 𝐈𝐒𝐋𝐀𝐌🔰",
    description: "Make the bot leave the group",
    commandCategory: "System",
    usages: "leave",
    cooldowns: 5
};

module.exports.run = async ({ api, event }) => {
    const { threadID } = event;
    api.sendMessage("@everyone বস গ্রুপ থেকে বের হতে বলছে🥹\nচলে গেলাম সবাই ভালো থাকো🫠", threadID, () => {
        api.removeUserFromGroup(api.getCurrentUserID(), threadID);
    });
};
