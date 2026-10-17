/**
 * includes/database/mongodb/index.js
 *
 * MongoDB support - migrated from Rx-mirai-goat (includes/models/mongodb/*).
 * This is an ADDITIVE alternative to the bot's default SQLite database, not
 * a replacement. Existing SQLite data and every SQLite-based command keeps
 * working exactly as before. To use MongoDB instead, set in config.json:
 *
 *   "database": { "engine": "mongodb", "mongodbUri": "mongodb+srv://..." }
 *
 * The engine choice only affects the usersData/threadsData/globalData shim
 * consumed by GoatBot-style commands (includes/compat/Rahat_pter.js) - it
 * gives them the SAME get/getData/set/getAll/create/deleteKey/getName/
 * getMoney/addMoney/subtractMoney interface, just backed by Mongo documents
 * instead of the Sequelize Users/Currencies/Threads tables.
 *
 * NOTE: userDashBoard.js (Rx-mirai-goat's separate web-dashboard login
 * model, with a plaintext password field) was intentionally NOT migrated -
 * this bot has no web dashboard, so there is nothing to back it.
 */

const _ = require("lodash");

let mongoose = null;
let connected = false;

function isEnabled() {
    return !!(global.config.database && global.config.database.engine === "mongodb");
}

async function connect() {
    if (connected) return;
    mongoose = require("mongoose");
    const uri = global.config.database && global.config.database.mongodbUri;
    if (!uri) throw new Error("config.database.mongodbUri is empty - set it before using engine: \"mongodb\"");
    await mongoose.connect(uri);
    connected = true;
}

function getModels() {
    return {
        UserModel: require("./models/user.js"),
        ThreadModel: require("./models/thread.js"),
        GlobalModel: require("./models/global.js")
    };
}

// ===== usersData shim (Mongo-backed) - same interface as buildUsersDataShim =====
function buildUsersDataShimMongo() {
    const { UserModel } = getModels();
    async function ensure(id) {
        id = String(id);
        let u = await UserModel.findOne({ userID: id });
        if (!u) u = await UserModel.create({ userID: id, name: "", money: 0, exp: 0, data: {} });
        return u;
    }
    function merged(u) {
        return Object.assign(
            { userID: u.userID, name: u.name, money: u.money || 0, exp: u.exp || 0, data: _.cloneDeep(u.data || {}) },
            _.cloneDeep(u.data || {})
        );
    }
    return {
        async get(id, path, defaultValue) {
            const u = await ensure(id);
            const m = merged(u);
            return path ? _.cloneDeep(_.get(m, path, defaultValue)) : m;
        },
        async getData(id, path, defaultValue) { return this.get(id, path, defaultValue); },
        async set(id, updateData, path) {
            const u = await ensure(id);
            if (path) {
                if (path === "money" || path === "exp" || path === "name") { u[path] = updateData; }
                else {
                    const newData = _.cloneDeep(u.data || {});
                    _.set(newData, path.startsWith("data.") ? path.slice(5) : path, updateData);
                    u.data = newData;
                }
            } else if (typeof updateData === "object" && updateData !== null) {
                const { money, exp, name, data, ...rest } = updateData;
                if (typeof money === "number") u.money = money;
                if (typeof exp === "number") u.exp = exp;
                if (typeof name === "string") u.name = name;
                const merge = { ...(data || {}), ...rest };
                if (Object.keys(merge).length) u.data = _.merge(_.cloneDeep(u.data || {}), merge);
            }
            await u.save();
        },
        async getAll() {
            const all = await UserModel.find({});
            return all.map(merged);
        },
        async create(id, info = {}) {
            const { money, exp, name, data, ...rest } = info;
            await UserModel.create({ userID: String(id), name: name || "", money: money || 0, exp: exp || 0, data: { ...(data || {}), ...rest } });
        },
        async getName(id) {
            const u = await ensure(id);
            return u.name || "Facebook user";
        },
        async getMoney(id) {
            const u = await ensure(id);
            return u.money || 0;
        },
        async addMoney(id, amount) {
            const u = await ensure(id);
            u.money = (u.money || 0) + amount;
            await u.save();
            return u.money;
        },
        async subtractMoney(id, amount) {
            const u = await ensure(id);
            u.money = Math.max(0, (u.money || 0) - amount);
            await u.save();
            return u.money;
        },
        async deleteKey(id, path) {
            const u = await ensure(id);
            const newData = _.cloneDeep(u.data || {});
            _.unset(newData, path.startsWith("data.") ? path.slice(5) : path);
            u.data = newData;
            await u.save();
        }
    };
}

// ===== threadsData shim (Mongo-backed) - same interface as buildThreadsDataShim =====
function buildThreadsDataShimMongo() {
    const { ThreadModel } = getModels();
    async function ensure(id) {
        id = String(id);
        let t = await ThreadModel.findOne({ threadID: id });
        if (!t) t = await ThreadModel.create({ threadID: id, settings: {}, data: {} });
        return t;
    }
    function merged(t) {
        return Object.assign(
            { threadID: t.threadID, settings: _.cloneDeep(t.settings || {}), data: _.cloneDeep(t.data || {}) },
            _.cloneDeep(t.data || {})
        );
    }
    return {
        async get(id, path, defaultValue) {
            const t = await ensure(id);
            const m = merged(t);
            return path ? _.cloneDeep(_.get(m, path, defaultValue)) : m;
        },
        async getData(id, path, defaultValue) { return this.get(id, path, defaultValue); },
        async set(id, updateData, path) {
            const t = await ensure(id);
            if (path) {
                if (path.startsWith("settings.")) {
                    const s = _.cloneDeep(t.settings || {});
                    _.set(s, path.slice(9), updateData);
                    t.settings = s;
                } else {
                    const d = _.cloneDeep(t.data || {});
                    _.set(d, path.startsWith("data.") ? path.slice(5) : path, updateData);
                    t.data = d;
                }
            } else if (typeof updateData === "object" && updateData !== null) {
                const { settings, data, ...rest } = updateData;
                if (settings) t.settings = _.merge(_.cloneDeep(t.settings || {}), settings);
                const dataMerge = { ...(data || {}), ...rest };
                if (Object.keys(dataMerge).length) t.data = _.merge(_.cloneDeep(t.data || {}), dataMerge);
            }
            await t.save();
        },
        async getAll() {
            const all = await ThreadModel.find({});
            return all.map(merged);
        },
        async create(id, info = {}) {
            const { settings, data, ...rest } = info;
            await ThreadModel.create({ threadID: String(id), settings: settings || {}, data: { ...(data || {}), ...rest } });
        },
        async deleteKey(id, path) {
            const t = await ensure(id);
            const d = _.cloneDeep(t.data || {});
            _.unset(d, path.startsWith("data.") ? path.slice(5) : path);
            t.data = d;
            await t.save();
        }
    };
}

// ===== globalData shim (Mongo-backed) - same interface as buildGlobalDataShim =====
function buildGlobalDataShimMongo() {
    const { GlobalModel } = getModels();
    async function ensure(key) {
        let g = await GlobalModel.findOne({ key: String(key) });
        if (!g) g = await GlobalModel.create({ key: String(key), data: {} });
        return g;
    }
    return {
        async get(key, path, defaultValue) {
            const g = await ensure(key);
            return path ? _.cloneDeep(_.get(g.data, path, defaultValue)) : _.cloneDeep(g.data ?? defaultValue);
        },
        async getData(key, path, defaultValue) { return this.get(key, path, defaultValue); },
        async set(key, updateData, path) {
            const g = await ensure(key);
            if (path) {
                const d = _.cloneDeep(g.data || {});
                _.set(d, path, updateData);
                g.data = d;
            } else {
                g.data = updateData;
            }
            await g.save();
        },
        async getAll() {
            const all = await GlobalModel.find({});
            const out = {};
            for (const g of all) out[g.key] = _.cloneDeep(g.data);
            return out;
        },
        async create(key, data = {}) { await GlobalModel.create({ key: String(key), data }); },
        async deleteKey(key, path) {
            const g = await ensure(key);
            if (path) { const d = _.cloneDeep(g.data || {}); _.unset(d, path); g.data = d; await g.save(); }
            else { await GlobalModel.deleteOne({ key: String(key) }); }
        }
    };
}

module.exports = { isEnabled, connect, buildUsersDataShimMongo, buildThreadsDataShimMongo, buildGlobalDataShimMongo };
