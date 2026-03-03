const client = require("../utils/mongo");

const DB_NAME = process.env.MONGODB_DB || undefined;
const CACHE_TTL_MS = Number(process.env.ROUTE_ACCESS_CACHE_MS || 10000);
const SESSION_TOUCH_INTERVAL_MS = Number(process.env.USER_SESSION_TOUCH_MS || 60 * 1000);
const ALWAYS_OPEN_PATHS = new Set(["/user/login", "/user/register"]);

// 从路径中提取路由模板
const getRouteTemplate = (path) => {
    // 处理 /91/ 开头的路径
    if (path.startsWith("/91/")) {
        const parts = path.split("/").filter(Boolean);
        if (parts.length >= 2) {
            let template = "/91";
            for (let i = 1; i < parts.length; i++) {
                let paramName;
                switch (i) {
                    case 1:
                        paramName = "uid";
                        break;
                    case 2:
                        paramName = "wd";
                        break;
                    case 3:
                        paramName = "page";
                        break;
                    default:
                        paramName = "param" + (i - 3);
                }
                template += "/:" + paramName;
            }
            return template;
        }
    }
    
    // 处理 /xvideos/ 开头的路径
    if (path.startsWith("/xvideos/")) {
        const parts = path.split("/").filter(Boolean);
        if (parts.length >= 2) {
            let template = "/xvideos";
            for (let i = 1; i < parts.length; i++) {
                let paramName;
                switch (i) {
                    case 1:
                        paramName = "uid";
                        break;
                    case 2:
                        paramName = "wd";
                        break;
                    case 3:
                        paramName = "page";
                        break;
                    default:
                        paramName = "param" + (i - 3);
                }
                template += "/:" + paramName;
            }
            return template;
        }
    }
    
    // 处理 /jabletv/ 开头的路径
    if (path.startsWith("/jabletv/")) {
        const parts = path.split("/").filter(Boolean);
        if (parts.length >= 2) {
            let template = "/jabletv";
            for (let i = 1; i < parts.length; i++) {
                let paramName;
                switch (i) {
                    case 1:
                        paramName = "uid";
                        break;
                    case 2:
                        paramName = "wd";
                        break;
                    case 3:
                        paramName = "page";
                        break;
                    default:
                        paramName = "param" + (i - 3);
                }
                template += "/:" + paramName;
            }
            return template;
        }
    }
    
    // 处理 /51cg/ 开头的路径
    if (path.startsWith("/51cg/")) {
        const parts = path.split("/").filter(Boolean);
        if (parts.length >= 2) {
            let template = "/51cg";
            // 定义固定路径段
            const fixedSegments = ["search", "detail", "img"];
            for (let i = 1; i < parts.length; i++) {
                const segment = parts[i];
                if (fixedSegments.includes(segment)) {
                    // 保持固定路径段不变
                    template += "/" + segment;
                } else {
                    // 处理参数路径段，使用param1, param2, param3...命名
                    let paramName = "param" + i;
                    template += "/:" + paramName;
                }
            }
            return template;
        }
    }
    
    // 处理 /hsex/ 开头的路径
    if (path.startsWith("/hsex/")) {
        const parts = path.split("/").filter(Boolean);
        if (parts.length >= 2) {
            let template = "/hsex";
            for (let i = 1; i < parts.length; i++) {
                let paramName;
                switch (i) {
                    case 1:
                        paramName = "uid";
                        break;
                    case 2:
                        paramName = "wd";
                        break;
                    case 3:
                        paramName = "page";
                        break;
                    default:
                        paramName = "param" + (i - 3);
                }
                template += "/:" + paramName;
            }
            return template;
        }
    }
    
    // 处理 /kanav/ 开头的路径
    if (path.startsWith("/kanav/")) {
        const parts = path.split("/").filter(Boolean);
        if (parts.length >= 2) {
            let template = "/kanav";
            for (let i = 1; i < parts.length; i++) {
                let paramName;
                switch (i) {
                    case 1:
                        paramName = "uid";
                        break;
                    case 2:
                        paramName = "wd";
                        break;
                    case 3:
                        paramName = "page";
                        break;
                    default:
                        paramName = "param" + (i - 3);
                }
                template += "/:" + paramName;
            }
            return template;
        }
    }
    
    // 处理 /madoutv/ 开头的路径
    if (path.startsWith("/madoutv/")) {
        const parts = path.split("/").filter(Boolean);
        if (parts.length >= 2) {
            let template = "/madoutv";
            for (let i = 1; i < parts.length; i++) {
                let paramName;
                switch (i) {
                    case 1:
                        paramName = "uid";
                        break;
                    case 2:
                        paramName = "wd";
                        break;
                    case 3:
                        paramName = "page";
                        break;
                    default:
                        paramName = "param" + (i - 3);
                }
                template += "/:" + paramName;
            }
            return template;
        }
    }
    
    // 处理 /spankbang/ 开头的路径
    if (path.startsWith("/spankbang/")) {
        const parts = path.split("/").filter(Boolean);
        if (parts.length >= 2) {
            let template = "/spankbang";
            for (let i = 1; i < parts.length; i++) {
                let paramName;
                switch (i) {
                    case 1:
                        paramName = "uid";
                        break;
                    case 2:
                        paramName = "wd";
                        break;
                    case 3:
                        paramName = "page";
                        break;
                    default:
                        paramName = "param" + (i - 3);
                }
                template += "/:" + paramName;
            }
            return template;
        }
    }
    
    // 处理 /proxy 路径
    if (path === "/proxy") {
        return "/proxy";
    }
    
    // 处理 /proxy/ 开头的路径
    if (path.startsWith("/proxy/")) {
        const parts = path.split("/").filter(Boolean);
        if (parts.length >= 2) {
            let template = "/proxy";
            for (let i = 1; i < parts.length; i++) {
                let paramName;
                switch (i) {
                    case 1:
                        paramName = "uid";
                        break;
                    case 2:
                        paramName = "wd";
                        break;
                    case 3:
                        paramName = "page";
                        break;
                    default:
                        paramName = "param" + (i - 3);
                }
                template += "/:" + paramName;
            }
            return template;
        }
    }
    
    // 处理其他带参数的路径
    const routePrefixes = ["/hot/", "/video/", "/other/", "/music/", "/bit/", "/comics/", "/live/", "/story/", "/v19/", "/proxy/"];
    for (const prefix of routePrefixes) {
        if (path.startsWith(prefix)) {
            const parts = path.split("/").filter(Boolean);
            if (parts.length >= 2) {
                let template = "/" + parts[0];
                for (let i = 1; i < parts.length; i++) {
                    let paramName;
                    switch (i) {
                        case 1:
                            paramName = "uid";
                            break;
                        case 2:
                            paramName = "wd";
                            break;
                        case 3:
                            paramName = "page";
                            break;
                        default:
                            paramName = "param" + (i - 3);
                    }
                    template += "/:" + paramName;
                }
                return template;
            }
        }
    }
    
    // 处理 /user/ 开头的路径
    if (path.startsWith("/user/")) {
        // 检查是否是 /user/:id 这样的路径
        const userPathMatch = path.match(/^\/user\/([^/]+)/);
        if (userPathMatch && userPathMatch[1] && !userPathMatch[1].includes("/")) {
            // 检查是否是已知的用户接口
            const userActions = ["login", "register", "profile", "logout", "favorites", "shares", "feedback"];
            if (!userActions.includes(userPathMatch[1])) {
                return "/user/:id";
            }
        }
    }
    
    // 如果没有匹配的模板，返回原始路径
    return path;
};

// 检查路径是否是routers里面的接口
const isRoutePath = (path) => {
    // 定义需要统计的路由前缀
    const routePrefixes = [
        "/91/", // 像 /91/eb4f1958453cff394bb8 这样的路径
        "/xvideos/", // xvideos相关接口
        "/jabletv/", // jabletv相关接口
        "/51cg/", // 51cg相关接口
        "/hsex/", // hsex相关接口
        "/kanav/", // kanav相关接口
        "/madoutv/", // madoutv相关接口
        "/spankbang/", // spankbang相关接口
        "/user/", // 用户相关接口
        "/hot/", // 热点相关接口
        "/video/", // 视频相关接口
        "/other/", // 其他接口
        "/music/", // 音乐相关接口
        "/bit/", // bit相关接口
        "/comics/", // 漫画相关接口
        "/live/", // 直播相关接口
        "/story/", // 故事相关接口
        "/v19/", // v19相关接口
        "/proxy/", // 代理相关接口
        "/scheduleJob/" // 定时任务相关接口
    ];
    
    // 检查路径是否以任何一个路由前缀开头
    return routePrefixes.some(prefix => path.startsWith(prefix));
};

let cache = {
    at: 0,
    rules: [],
};

const getDb = async () => {
    try {
        await client.connect();
        return DB_NAME ? client.db(DB_NAME) : client.db();
    } catch (error) {
        console.error("MongoDB连接失败:", error);
        return null;
    }
};

const getTokenFromRequest = (ctx) => {
    const headerToken = String(ctx.get("x-user-token") || "").trim();
    if (headerToken) return headerToken;
    const authHeader = String(ctx.get("authorization") || "").trim();
    if (!authHeader) return "";
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    return match ? match[1].trim() : "";
};

const normalizeAccess = (value) => {
    const v = String(value || "").trim().toLowerCase();
    if (v === "admin") return "admin";
    if (v === "user") return "user";
    return "open";
};

const ruleRank = (rule) => {
    const path = rule.path || "";
    if (path === "*" || path === "/*") return 4;
    if (path.endsWith("*")) return 3;
    if (path.includes(":")) return 2;
    return 1;
};

const compileRule = (raw) => {
    const path = String(raw.path || "").trim() || "/";
    const method = String(raw.method || "*").trim().toUpperCase();
    const access = normalizeAccess(raw.access);
    const enabled = raw.enabled !== false;
    const rank = ruleRank({ path });
    let matcher = null;
    if (path === "*" || path === "/*") {
        matcher = () => true;
    } else if (path.endsWith("*")) {
        const prefix = path.slice(0, -1);
        matcher = (p) => p.startsWith(prefix);
    } else if (path.includes(":")) {
        const pattern = "^" + path.replace(/:[^/]+/g, "[^/]+") + "$";
        const regex = new RegExp(pattern);
        matcher = (p) => regex.test(p);
    } else {
        matcher = (p) => p === path;
    }
    return {
        id: raw._id,
        path,
        method,
        access,
        enabled,
        rank,
        length: path.length,
        matchPath: matcher,
    };
};

const loadRules = async () => {
    const now = Date.now();
    if (now - cache.at < CACHE_TTL_MS) return cache.rules;
    const db = await getDb();
    if (!db) {
        console.warn("数据库连接失败，使用缓存的规则");
        return cache.rules;
    }
    try {
        const list = await db.collection("route_access").find().toArray();
        const compiled = list
            .map(compileRule)
            .sort((a, b) => (a.rank !== b.rank ? a.rank - b.rank : b.length - a.length));
        cache = { at: now, rules: compiled };
        return compiled;
    } catch (error) {
        console.error("加载规则失败:", error);
        return cache.rules;
    }
};

const matchRule = (rules, path, method) => {
    const upperMethod = String(method || "").toUpperCase();
    for (const rule of rules) {
        if (!rule.enabled) continue;
        if (rule.method !== "*" && rule.method !== "ALL" && rule.method !== upperMethod) continue;
        if (rule.matchPath(path)) return rule;
    }
    return null;
};

const touchSession = (db, session, user, ctx) => {
    const now = new Date();
    const lastSeenAt = session.lastSeenAt ? new Date(session.lastSeenAt) : null;
    if (lastSeenAt && now - lastSeenAt <= SESSION_TOUCH_INTERVAL_MS) return;
    db.collection("user_sessions")
        .updateOne(
            { _id: session._id },
            {
                $set: {
                    lastSeenAt: now,
                    lastPage: ctx.request.path || "",
                    ip: ctx.request.ip,
                    userAgent: ctx.headers["user-agent"] || "",
                },
            },
        )
        .catch(() => {});
    db.collection("users")
        .updateOne({ _id: user._id }, { $set: { lastSeenAt: now } })
        .catch(() => {});
};

// 更新访问统计
const updateAccessStats = async (db, path, success) => {
    if (!db) {
        console.warn("数据库连接失败，跳过访问统计更新");
        return;
    }
    try {
        // 获取路由模板
        const template = getRouteTemplate(path);
        if (!template) return;
        
        const stats = await db.collection("route_access_stats").findOne({ path: template });
        if (stats) {
            await db.collection("route_access_stats").updateOne(
                { path: template },
                {
                    $inc: {
                        total: 1,
                        success: success ? 1 : 0,
                        failed: success ? 0 : 1
                    },
                    $set: { updatedAt: new Date() }
                }
            );
        } else {
            await db.collection("route_access_stats").insertOne({
                path: template,
                total: 1,
                success: success ? 1 : 0,
                failed: success ? 0 : 1,
                createdAt: new Date(),
                updatedAt: new Date()
            });
        }
    } catch (error) {
        console.error("更新访问统计失败:", error);
    }
};

module.exports = async (ctx, next) => {
    if (ctx.method === "OPTIONS") {
        await next();
        return;
    }
    const path = ctx.request.path || "";
    if (/\/[^/]+\.[^/]+$/.test(path)) {
        await next();
        // 只统计routers里面的接口
        if (isRoutePath(path)) {
            const db = await getDb();
            await updateAccessStats(db, path, true);
        }
        return;
    }
    if (ALWAYS_OPEN_PATHS.has(path)) {
        await next();
        // 只统计routers里面的接口
        if (isRoutePath(path)) {
            const db = await getDb();
            await updateAccessStats(db, path, true);
        }
        return;
    }
    
    let success = true;
    let db = null;
    
    try {
        const rules = await loadRules();
        const rule = matchRule(rules, path, ctx.method);
        if (!rule || rule.access === "open") {
            await next();
            // 只统计routers里面的接口
            if (isRoutePath(path)) {
                db = await getDb();
                await updateAccessStats(db, path, success);
            }
            return;
        }
        const token = getTokenFromRequest(ctx);
        if (!token) {
            success = false;
            ctx.status = 401;
            ctx.body = { code: 401, message: "未登录" };
            // 只统计routers里面的接口
            if (isRoutePath(path)) {
                db = await getDb();
                await updateAccessStats(db, path, success);
            }
            return;
        }
        db = await getDb();
        if (!db) {
            // 数据库连接失败，允许访问
            console.warn("数据库连接失败，跳过认证");
            await next();
            // 只统计routers里面的接口
            if (isRoutePath(path)) {
                await updateAccessStats(db, path, success);
            }
            return;
        }
        const session = await db.collection("user_sessions").findOne({ token });
        if (!session || session.expiresAt <= new Date()) {
            success = false;
            ctx.status = 401;
            ctx.body = { code: 401, message: "登录已过期" };
            // 只统计routers里面的接口
            if (isRoutePath(path)) {
                await updateAccessStats(db, path, success);
            }
            return;
        }
        const user = await db.collection("users").findOne({ _id: session.userId });
        if (!user) {
            success = false;
            ctx.status = 401;
            ctx.body = { code: 401, message: "用户不存在" };
            // 只统计routers里面的接口
            if (isRoutePath(path)) {
                await updateAccessStats(db, path, success);
            }
            return;
        }
        if (user.isDisabled) {
            success = false;
            const reason = user.disabledReason ? `：${user.disabledReason}` : "";
            ctx.status = 403;
            ctx.body = { code: 403, message: `账号已被禁用${reason}` };
            // 只统计routers里面的接口
            if (isRoutePath(path)) {
                await updateAccessStats(db, path, success);
            }
            return;
        }
        if (rule.access === "admin" && user.role !== "admin") {
            success = false;
            ctx.status = 403;
            ctx.body = { code: 403, message: "需要管理员权限" };
            // 只统计routers里面的接口
            if (isRoutePath(path)) {
                await updateAccessStats(db, path, success);
            }
            return;
        }
        ctx.state.user = user;
        ctx.state.session = session;
        touchSession(db, session, user, ctx);
        await next();
    } catch (error) {
        success = false;
        console.error("路由访问控制错误:", error);
        // 数据库连接错误，允许访问
        if (error.message.includes("MongoDB") || error.message.includes("mongo")) {
            console.warn("数据库连接错误，允许访问");
            await next();
        } else {
            ctx.status = 500;
            ctx.body = { code: 500, message: "服务器错误" };
        }
    } finally {
        // 只统计routers里面的接口
        if (isRoutePath(path)) {
            if (!db) {
                db = await getDb();
            }
            await updateAccessStats(db, path, success);
        }
    }
};
