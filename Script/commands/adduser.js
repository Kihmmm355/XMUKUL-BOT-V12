const { findUid } = global.utils;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
    config: {
        name: "adduser",
        version: "2.0",
        author: "NTKhang | adapted for Mirai+GoatBot",
        countDown: 5,
        role: 1,
        description: {
            en: "Add user to the group"
        },
        category: "box chat",
        guide: {
            en: "   {pn} [link profile | uid]"
        }
    },

    langs: {
        en: {
            alreadyInGroup: "Already in group",
            successAdd: "- Successfully added %1 member(s) to the group",
            failedAdd: "- Failed to add %1 member(s) to the group",
            approve: "- Added %1 member(s) to the approval list",
            invalidLink: "Please enter a valid Facebook link",
            cannotGetUid: "Cannot get UID of this user",
            linkNotExist: "This profile URL does not exist",
            cannotAddUser: "Bot is blocked or this user blocked strangers from adding to the group",
            noArgs: "Please provide a Facebook UID or profile link"
        },
        bn: {
            alreadyInGroup: "ইতিমধ্যে গ্রুপে আছে",
            successAdd: "- %1 জন সদস্যকে গ্রুপে সফলভাবে যোগ করা হয়েছে",
            failedAdd: "- %1 জন সদস্যকে গ্রুপে যোগ করতে ব্যর্থ",
            approve: "- %1 জন সদস্যকে approval তালিকায় যোগ করা হয়েছে",
            invalidLink: "অনুগ্রহ করে সঠিক Facebook link দিন",
            cannotGetUid: "এই user এর UID পাওয়া যাচ্ছে না",
            linkNotExist: "এই profile URL টি বিদ্যমান নেই",
            cannotAddUser: "Bot blocked আছে বা এই user অপরিচিতদের গ্রুপে add করা block করে রেখেছে",
            noArgs: "Facebook UID বা profile link দিন"
        }
    },

    onStart: async function ({ message, api, event, args, threadsData, getLang }) {
        if (!args || args.length === 0) {
            return message.reply(getLang("noArgs"));
        }

        // ── Get thread info from local DB (no live FCA call) ──────────────────
        let members = [], adminIDs = [], approvalMode = false;
        try {
            const threadInfo = await threadsData.get(event.threadID);
            members    = threadInfo.members    || threadInfo.participantIDs || [];
            adminIDs   = threadInfo.adminIDs   || [];
            approvalMode = !!threadInfo.approvalMode;
        } catch (_) { /* if DB fails, proceed anyway */ }

        const botID = String(api.getCurrentUserID());

        const success = [
            { type: "success",     uids: [] },
            { type: "waitApproval", uids: [] }
        ];
        const failed = [];

        function pushFail(msg, item) {
            item = String(item).replace(
                /(?:https?:\/\/)?(?:www\.)?(?:facebook|fb|m\.facebook)\.(?:com|me)/i, ""
            );
            const existing = failed.find(e => e.type === msg);
            if (existing) existing.uids.push(item);
            else failed.push({ type: msg, uids: [item] });
        }

        const fbLinkRegex = /(?:https?:\/\/)?(?:www\.)?(?:facebook|fb|m\.facebook)\.(?:com|me)\/(?:(?:\w)*#!\/)?(?:pages\/)?(?:[\w\-]*\/)*([\w\-\.]+)(?:\/)?/i;

        for (const item of args) {
            let uid = null;
            let skip = false;

            if (isNaN(item) && fbLinkRegex.test(item)) {
                // ── Resolve profile URL → UID (with retry) ────────────────────
                for (let attempt = 0; attempt < 10; attempt++) {
                    try {
                        uid = await findUid(item);
                        break;
                    } catch (err) {
                        if (err.name === "SlowDown" || err.name === "CannotGetData") {
                            await sleep(1000);
                            continue;
                        }
                        pushFail(
                            err.name === "InvalidLink"    ? getLang("invalidLink") :
                            err.name === "CannotGetData"  ? getLang("cannotGetUid") :
                            err.name === "LinkNotExist"   ? getLang("linkNotExist") :
                            err.message || getLang("cannotGetUid"),
                            item
                        );
                        skip = true;
                        break;
                    }
                }
            } else if (!isNaN(item)) {
                uid = item;
            } else {
                continue; // not a number and not an FB link — skip silently
            }

            if (skip || uid == null) continue;

            const uidStr = String(uid);

            // ── Check if already in group ──────────────────────────────────────
            const alreadyIn = members.some(m => {
                const mId = String(m.userID || m);
                return mId === uidStr;
            });

            if (alreadyIn) {
                pushFail(getLang("alreadyInGroup"), item);
                continue;
            }

            // ── Try to add ────────────────────────────────────────────────────
            try {
                await api.addUserToGroup(uid, event.threadID);
                const adminIdList = adminIDs.map(a => String(a.id || a));
                if (approvalMode && !adminIdList.includes(botID)) {
                    success[1].uids.push(uid);
                } else {
                    success[0].uids.push(uid);
                }
            } catch (_) {
                pushFail(getLang("cannotAddUser"), item);
            }
        }

        // ── Build reply ───────────────────────────────────────────────────────
        let msg = "";
        if (success[0].uids.length)
            msg += getLang("successAdd", success[0].uids.length) + "\n";
        if (success[1].uids.length)
            msg += getLang("approve", success[1].uids.length) + "\n";
        if (failed.length) {
            const totalFail = failed.reduce((n, f) => n + f.uids.length, 0);
            msg += getLang("failedAdd", totalFail);
            failed.forEach(f => {
                msg += `\n    + ${f.uids.join("\n       ")}: ${f.type}`;
            });
        }
        if (msg.trim()) return message.reply(msg.trim());
    }
};
