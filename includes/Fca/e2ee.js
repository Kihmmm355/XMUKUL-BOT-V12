"use strict";

// ── Thread type detection ────────────────────────────────────────────────────
// Always returns false: E2EE is disabled, all threads are plain MQTT.
function isE2EEChatJid(value) {
  void value;
  return false;
}

// ── Media cache ──────────────────────────────────────────────────────────────
// Stub: nothing to cache without the native bridge.
async function storeMedia(_buffer, _mimeType) {
  return null;
}

// ── Bridge lifecycle ──────────────────────────────────────────────────────────
// All methods are no-ops. createBridge is only called when enableE2EE is true
// (which requires e2ee.enable: true in config.json — disabled in this build).
function createBridge(_ctx) {
  return {
    isConnected:   function () { return false; },
    isFullyReady:  function () { return false; },
    getState:      function () { return {}; },
    getDeviceData: async function () { return null; },
    sendMessage:   async function () {},
    sendReaction:  async function () {},
    sendTyping:    async function () {},
    unsendMessage: async function () {},
    markAsRead:    async function () {},
    editMessage:   async function () {},
    downloadMedia: async function () { return null; },
    sendMedia:     async function () {},
    connect:       async function () {},
    disconnect:    async function () {},
  };
}

// ── API patching ─────────────────────────────────────────────────────────────
// No-op: only called when enableE2EE is true, which it never is in this build.
function patchApiForE2EE(_api, _ctx) {
  // nothing
}

module.exports = {
  isE2EEChatJid,
  storeMedia,
  createBridge,
  patchApiForE2EE,
};
