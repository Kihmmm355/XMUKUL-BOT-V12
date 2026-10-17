"use strict";

module.exports = async function sendResendNotice(api, payload) {
    try {
        const config = (typeof global !== "undefined" && global.config) || {};
        if (!config.Xrahat_resend) return null;

        const tid = config.Resend_Group_tid;
        if (!tid || typeof tid !== "string" || !tid.trim()) return null;

        return await api.sendMessage(payload, tid.trim());
    } catch (_err) {
        
        return null;
    }
};
