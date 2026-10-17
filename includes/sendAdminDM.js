"use strict";

module.exports = async function sendAdminDM(api, uid, msg) {
    try {
        return await api.sendMessage(msg, `${uid}@msgr`);
    } catch (e2eeError) {
        return await api.sendMessageDM(msg, uid);
    }
};
