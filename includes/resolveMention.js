async function getMentionedIDs(api, event) {
    const ids = new Set();
    const m = event && event.mentions;

    if (m && typeof m === "object" && !Array.isArray(m)) {
        for (const id of Object.keys(m)) {
            if (id) ids.add(String(id));
        }
    }

   if (Array.isArray(m)) {
        for (const entry of m) {
            const id = entry && (entry.id || entry.userID || entry.senderID || entry.fbid);
            if (id) ids.add(String(id));
        }
    }

    if (ids.size === 0 && event && event.body && event.body.includes("@") && event.threadID) {
        try {
            const threadInfo = await api.getThreadInfo(event.threadID);
            const users = threadInfo.userInfo || [];
            const bodyLower = event.body.toLowerCase();
            for (const u of users) {
                if (!u.name) continue;
                const nameLower = u.name.trim().toLowerCase();
                if (nameLower && bodyLower.includes("@" + nameLower)) ids.add(String(u.id));
            }
        } catch (e) {
          
        }
    }

    return Array.from(ids);
}

module.exports = { getMentionedIDs };
