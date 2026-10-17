"use strict";

/**
 * utils/log.js
 * ============================================================
 * Console output now comes 100% from the Rx-mirai-goat (GOATBOT V3)
 * logger — utils/logger/log.js + utils/logger/logColor.js +
 * utils/func/colors.js are copied verbatim from that project, unchanged.
 * This file is only a thin compatibility bridge so the ~250 existing
 * command/event files (which call `logger(message, level)` and
 * `logger.loader(message, level)`) keep working without editing each
 * one, while what actually prints to the console is byte-for-byte the
 * same badge/color/timestamp style as Rx-mirai-goat.
 *
 *   const logger = require("./utils/log.js");
 *   logger(message, level)          -> old call style, still works
 *   logger.loader(message, level)   -> old call style, still works
 *   logger.info/success/warn/error/master("PREFIX", message) -> same
 *   signature as Rx-mirai-goat's own log.info/success/warn/error/master
 *   logger.LOG_FILE                 -> kept for anything that reads it
 * ============================================================
 */

const fs = require("fs");
const path = require("path");
const sourceLog = require("./logger/log.js");

// ---- quiet background file log (visual console output is unaffected) ----
const LOG_DIR = path.join(process.cwd(), "logs");
try { if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true }); } catch (_) {}
const LOG_FILE = path.join(LOG_DIR, "bot.log");
function appendToFile(line) {
	try {
		fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${line}\n`);
	} catch (_) { /* never let file logging crash the bot */ }
}

// map an old-style level string to one of source's log functions
function levelToFn(level) {
	switch (String(level || "").toLowerCase()) {
		case "error": return sourceLog.error;
		case "warn": return sourceLog.warn;
		case "success": return sourceLog.success;
		case "master": return sourceLog.master;
		default: return sourceLog.info;
	}
}

function logger(message, level) {
	const fn = levelToFn(level);
	fn("LOG", message);
	appendToFile(`[${(level || "info").toUpperCase()}] ${message}`);
}

logger.loader = function (message, level) {
	const fn = levelToFn(level);
	fn("LOADER", message);
	appendToFile(`[LOADER] ${message}`);
};

// direct passthroughs matching Rx-mirai-goat's own log.info/success/warn/error/master
// signature: (prefix, message) — also tolerates the old single-arg form (message).
function makeDirect(sourceFn, defaultPrefix) {
	return function (a, b) {
		if (b === undefined) {
			sourceFn(defaultPrefix, a);
			appendToFile(`[${defaultPrefix}] ${a}`);
		} else {
			sourceFn(a, b);
			appendToFile(`[${a}] ${b}`);
		}
	};
}
logger.info = makeDirect(sourceLog.info, "INFO");
logger.success = makeDirect(sourceLog.success, "SUCCESS");
logger.warn = makeDirect(sourceLog.warn, "WARN");
logger.error = makeDirect(sourceLog.error, "ERROR");
logger.err = logger.error;
logger.master = makeDirect(sourceLog.master, "MASTER");
logger.dev = sourceLog.dev;

logger.LOG_FILE = LOG_FILE;

module.exports = logger;
