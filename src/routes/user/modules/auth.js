const Router = require("koa-router");
const crypto = require("crypto");
const { ObjectId } = require("mongodb");
const client = require("../../../utils/mongo");
// const nodemailer = require("nodemailer");

const authRouter = new Router();

const TOKEN_TTL_MS = Number(process.env.USER_TOKEN_TTL_MS || 7 * 24 * 60 * 60 * 1000);
const DB_NAME = process.env.MONGODB_DB || undefined;
const SESSION_TOUCH_INTERVAL_MS = Number(process.env.USER_SESSION_TOUCH_MS || 60 * 1000);
const RESET_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 重置令牌有效期24小时

// 邮件发送配置
// const transporter = nodemailer.createTransport({
//     service: "qq", // 可根据需要更换为其他邮件服务
//     auth: {
//         user: process.env.EMAIL_USER || "",
//         pass: process.env.EMAIL_PASS || ""
//     }
// });

let indexesReady = false;
const ensureIndexes = async (db) => {
    if (indexesReady || !db) return;
    try {
        await db.collection("users").createIndex({ username: 1 }, { unique: true });
        await db.collection("user_sessions").createIndex({ token: 1 }, { unique: true });
        await db.collection("user_sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
        await db.collection("user_sessions").createIndex({ lastSeenAt: -1 });
        await db.collection("password_reset_tokens").createIndex({ token: 1 }, { unique: true });
        await db.collection("password_reset_tokens").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
        indexesReady = true;
    } catch (error) {
        console.error("创建索引失败:", error);
    }
};

const getDb = async () => {
    try {
        await client.connect();
        const db = DB_NAME ? client.db(DB_NAME) : client.db();
        await ensureIndexes(db);
        return db;
    } catch (error) {
        console.error("MongoDB连接失败:", error);
        return null;
    }
};

const hashPassword = (password, salt = null) => {
    const realSalt = salt || crypto.randomBytes(16).toString("hex");
    const iterations = 120000;
    const keylen = 32;
    const digest = "sha256";
    const hash = crypto.pbkdf2Sync(password, realSalt, iterations, keylen, digest).toString("hex");
    return { salt: realSalt, iterations, keylen, digest, hash };
};

const verifyPassword = (password, user) => {
    const { salt, iterations, keylen, digest, hash } = user;
    const verifyHash = crypto.pbkdf2Sync(password, salt, iterations, keylen, digest).toString("hex");
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(verifyHash, "hex"));
};

const sanitizeUser = (user) => {
    if (!user) return null;
        const { password, hash, salt, iterations, keylen, digest, securityQuestion, securityAnswer, securityAnswerSalt, securityAnswerIterations, securityAnswerKeylen, securityAnswerDigest, ...rest } = user;
        return rest;
};

const issueToken = () => crypto.randomBytes(32).toString("hex");

const getTokenFromRequest = (ctx) => {
    const headerToken = String(ctx.get("x-user-token") || "").trim();
    if (headerToken) return headerToken;
    const authHeader = String(ctx.get("authorization") || "").trim();
    if (!authHeader) return "";
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    return match ? match[1].trim() : "";
};

const authMiddleware = async (ctx, next) => {
    const token = getTokenFromRequest(ctx);
    if (!token) {
        ctx.status = 401;
        ctx.body = { code: 401, message: "未登录" };
        return;
    }
    const db = await getDb();
    if (!db) {
        ctx.status = 500;
        ctx.body = { code: 500, message: "数据库连接失败" };
        return;
    }
    try {
        const session = await db.collection("user_sessions").findOne({ token });
        if (!session || session.expiresAt <= new Date()) {
            ctx.status = 401;
            ctx.body = { code: 401, message: "登录已过期" };
            return;
        }
        // 确保userId是有效的ObjectId
        let userId = session.userId;
        if (!userId) {
            ctx.status = 401;
            ctx.body = { code: 401, message: "登录已过期" };
            return;
        }
        if (typeof userId === 'string' && ObjectId.isValid(userId)) {
            userId = new ObjectId(userId);
        } else if (!ObjectId.isValid(userId)) {
            ctx.status = 401;
            ctx.body = { code: 401, message: "登录已过期" };
            return;
        }
        const user = await db.collection("users").findOne({ _id: userId });
        if (!user) {
            ctx.status = 401;
            ctx.body = { code: 401, message: "用户不存在" };
            return;
        }
        if (user.isDisabled) {
            const reason = user.disabledReason ? `：${user.disabledReason}` : "";
            ctx.status = 403;
            ctx.body = { code: 403, message: `账号已被禁用${reason}` };
            return;
        }
        ctx.state.user = user;
        ctx.state.session = session;
        const now = new Date();
        const lastSeenAt = session.lastSeenAt ? new Date(session.lastSeenAt) : null;
        if (!lastSeenAt || now - lastSeenAt > SESSION_TOUCH_INTERVAL_MS) {
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
            session.lastSeenAt = now;
        }
        await next();
    } catch (error) {
        console.error("认证失败:", error);
        ctx.status = 500;
        ctx.body = { code: 500, message: "服务器错误" };
    }
};

const requireAdmin = async (ctx, next) => {
    const user = ctx.state.user;
    if (!user || user.role !== "admin") {
        ctx.status = 403;
        ctx.body = { code: 403, message: "需要管理员权限" };
        return;
    }
    await next();
};

const isValidAccount = (value) => /^[A-Za-z0-9]+@[A-Za-z0-9]+(\.[A-Za-z0-9]+)+$/.test(String(value || ""));

// 注册
authRouter.post("/user/register", async (ctx) => {
    const { username, password, nickname } = ctx.request.body || {};
    const safeUsername = String(username || "").trim();
    const safePassword = String(password || "").trim();
    if (!safeUsername || !safePassword) {
        ctx.body = { code: 400, message: "用户名或密码不能为空" };
        return;
    }
    if (!isValidAccount(safeUsername)) {
        ctx.body = { code: 400, message: "账号需为仅字母数字的邮箱" };
        return;
    }

    try {
        const db = await getDb();
        if (!db) {
            ctx.body = { code: 500, message: "数据库连接失败" };
            return;
        }
        const totalUsers = await db.collection("users").countDocuments();
        const { salt, iterations, keylen, digest, hash } = hashPassword(safePassword);
        const newUser = {
            username: safeUsername,
            nickname: String(nickname || "").trim() || safeUsername,
            role: totalUsers === 0 ? "admin" : "user",
            apiAccess: totalUsers === 0 ? "all" : "normal",
            isDisabled: false,
            disabledReason: "",
            salt,
            iterations,
            keylen,
            digest,
            hash,
            // 安全问题相关字段
            securityQuestion: String(ctx.request.body?.securityQuestion || "").trim() || "",
            securityAnswer: String(ctx.request.body?.securityAnswer || "").trim() ? hashPassword(String(ctx.request.body.securityAnswer).trim()).hash : "",
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = await db.collection("users").insertOne(newUser);
        ctx.body = {
            code: 200,
            message: "注册成功",
            data: { id: result.insertedId, username: newUser.username, nickname: newUser.nickname, role: newUser.role },
        };
    } catch (err) {
        if (err && err.code === 11000) {
            ctx.body = { code: 409, message: "用户名已存在" };
            return;
        }
        console.error("注册失败:", err);
        ctx.body = { code: 500, message: "注册失败" };
    }
});

// 登录
authRouter.post("/user/login", async (ctx) => {
    const { username, password } = ctx.request.body || {};
    const safeUsername = String(username || "").trim();
    const safePassword = String(password || "").trim();
    if (!safeUsername || !safePassword) {
        ctx.body = { code: 400, message: "用户名或密码不能为空" };
        return;
    }
    if (!isValidAccount(safeUsername)) {
        ctx.body = { code: 400, message: "账号需为仅字母数字的邮箱" };
        return;
    }
    try {
        const db = await getDb();
        if (!db) {
            ctx.body = { code: 500, message: "数据库连接失败" };
            return;
        }
        const user = await db.collection("users").findOne({ username: safeUsername });
        if (!user || !verifyPassword(safePassword, user)) {
            ctx.body = { code: 401, message: "用户名或密码错误" };
            return;
        }
        if (user.isDisabled) {
            const reason = user.disabledReason ? `：${user.disabledReason}` : "";
            ctx.body = { code: 403, message: `账号已被禁用${reason}` };
            return;
        }
        const token = issueToken();
        const now = new Date();
        const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
        await db.collection("user_sessions").insertOne({
            userId: user._id,
            token,
            createdAt: now,
            expiresAt,
            lastSeenAt: now,
            lastPage: ctx.request.path || "",
            ip: ctx.request.ip,
            userAgent: ctx.headers["user-agent"] || "",
        });
        ctx.body = {
            code: 200,
            message: "登录成功",
            data: {
                token,
                expiresAt: expiresAt.getTime(),
                user: sanitizeUser(user),
            },
        };
    } catch (error) {
        console.error("登录失败:", error);
        ctx.body = { code: 500, message: "登录失败" };
    }
});

// 退出登录
authRouter.post("/user/logout", authMiddleware, async (ctx) => {
    const db = await getDb();
    await db.collection("user_sessions").deleteOne({ _id: ctx.state.session._id });
    ctx.body = { code: 200, message: "已退出" };
});

// 验证当前用户密码
authRouter.post("/user/verify-password", authMiddleware, async (ctx) => {
    const { password } = ctx.request.body || {};
    const safePassword = String(password || "").trim();
    if (!safePassword) {
        ctx.body = { code: 400, message: "密码不能为空" };
        return;
    }
    const user = ctx.state.user;
    const ok = verifyPassword(safePassword, user);
    ctx.body = { code: 200, message: ok ? "验证成功" : "验证失败", data: ok };
});

// 当前用户信息
authRouter.get("/user/profile", authMiddleware, async (ctx) => {
    ctx.body = {
        code: 200,
        message: "获取成功",
        data: sanitizeUser(ctx.state.user),
    };
});

// 最近访问记录（登录用户）
authRouter.get("/user/visit-history", authMiddleware, async (ctx) => {
    const db = await getDb();
    const userId = ctx.state.user._id;
    const user = await db.collection("users").findOne({ _id: userId });
    const raw = Array.isArray(user?.visitHistory) ? user.visitHistory : [];
    const now = Date.now();
    const cutoff = now - 7 * 24 * 60 * 60 * 1000;
    const ip = ctx.request.ip || "";
    const userAgent = ctx.headers["user-agent"] || "";
    const normalizeEntry = (entry) => {
        if (entry && typeof entry === "object") {
            const time = Number(entry.time ?? entry.timestamp ?? entry.lastSeenAt ?? "");
            if (!Number.isFinite(time)) return null;
            return {
                time,
                ip: String(entry.ip || ""),
                userAgent: String(entry.userAgent || entry.ua || ""),
            };
        }
        const time = Number(entry);
        if (!Number.isFinite(time)) return null;
        return { time, ip: "", userAgent: "" };
    };
    const normalized = raw
        .map(normalizeEntry)
        .filter(Boolean)
        .filter((item) => item.time >= cutoff);
    const merged = [{ time: now, ip, userAgent }, ...normalized];
    const deduped = [];
    const seen = new Set();
    merged.forEach((item) => {
        const key = `${item.time}|${item.ip}|${item.userAgent}`;
        if (seen.has(key)) return;
        seen.add(key);
        deduped.push(item);
    });
    const list = deduped.slice(0, 200);
    await db.collection("users").updateOne({ _id: userId }, { $set: { visitHistory: list, updatedAt: new Date() } });
    ctx.body = { code: 200, message: "获取成功", data: list };
});

// 更新头像（登录用户）
authRouter.post("/user/avatar", authMiddleware, async (ctx) => {
    const { avatar } = ctx.request.body || {};
    const safeAvatar = String(avatar || "").trim();
    const db = await getDb();
    await db.collection("users").updateOne(
        { _id: ctx.state.user._id },
        { $set: { avatar: safeAvatar, updatedAt: new Date() } }
    );
    const updated = await db.collection("users").findOne({ _id: ctx.state.user._id });
    ctx.body = { code: 200, message: "头像已更新", data: sanitizeUser(updated) };
});

// 更新用户信息（登录用户）
authRouter.put("/user/profile", authMiddleware, async (ctx) => {
    const { nickname, avatar, profileNote, oldPassword, password } = ctx.request.body || {};
    const db = await getDb();
    const update = { updatedAt: new Date() };
    
    // 更新基本信息
    if (nickname !== undefined) update.nickname = String(nickname || "").trim();
    if (avatar !== undefined) update.avatar = String(avatar || "").trim();
    if (profileNote !== undefined) update.profileNote = String(profileNote || "").trim();
    
    // 更新密码
    if (password !== undefined) {
        const safeOldPassword = String(oldPassword || "").trim();
        const safePassword = String(password || "").trim();
        if (!safeOldPassword || !safePassword) {
            ctx.body = { code: 400, message: "旧密码和新密码不能为空" };
            return;
        }
        if (!verifyPassword(safeOldPassword, ctx.state.user)) {
            ctx.body = { code: 400, message: "旧密码错误" };
            return;
        }
        const { salt, iterations, keylen, digest, hash } = hashPassword(safePassword);
        update.salt = salt;
        update.iterations = iterations;
        update.keylen = keylen;
        update.digest = digest;
        update.hash = hash;
    }
    
    await db.collection("users").updateOne(
        { _id: ctx.state.user._id },
        { $set: update }
    );
    const updated = await db.collection("users").findOne({ _id: ctx.state.user._id });
    ctx.body = { code: 200, message: "更新成功", data: sanitizeUser(updated) };
});

// 获取当前用户安全问题（登录用户）
authRouter.get("/user/security-question", authMiddleware, async (ctx) => {
    ctx.body = {
        code: 200,
        message: "获取成功",
        data: {
            securityQuestion: ctx.state.user.securityQuestion || ""
        }
    };
});

// 更新安全问题（登录用户）
authRouter.put("/user/security-question", authMiddleware, async (ctx) => {
    const { securityQuestion, securityAnswer } = ctx.request.body || {};
    if (!securityQuestion || !securityAnswer) {
        ctx.body = { code: 400, message: "安全问题和答案不能为空" };
        return;
    }
    
    const db = await getDb();
    const { salt, iterations, keylen, digest, hash } = hashPassword(String(securityAnswer || "").trim());
    const update = {
        securityQuestion: String(securityQuestion || "").trim(),
        securityAnswer: hash,
        securityAnswerSalt: salt,
        securityAnswerIterations: iterations,
        securityAnswerKeylen: keylen,
        securityAnswerDigest: digest,
        updatedAt: new Date()
    };
    
    await db.collection("users").updateOne(
        { _id: ctx.state.user._id },
        { $set: update }
    );
    const updated = await db.collection("users").findOne({ _id: ctx.state.user._id });
    ctx.body = { code: 200, message: "安全问题已更新", data: sanitizeUser(updated) };
});

// 用户统计信息（登录用户）
authRouter.get("/user/stats", authMiddleware, async (ctx) => {
    const db = await getDb();
    const userId = ctx.state.user._id;
    const stats = await db.collection("user_stats").findOne({ userId });
    ctx.body = {
        code: 200,
        message: "获取成功",
        data: {
            favoriteCount: stats?.favoriteCount || 0,
            historyCount: stats?.historyCount || 0,
            searchCount: stats?.searchCount || 0,
            shareCount: stats?.shareCount || 0,
            watchSeconds: stats?.watchSeconds || 0
        }
    };
});

// 更新用户统计信息（登录用户）
authRouter.post("/user/stats", authMiddleware, async (ctx) => {
    const { favoriteCount, shareCount, historyCount, searchCount, watchSeconds } = ctx.request.body || {};
    const db = await getDb();
    const userId = ctx.state.user._id;
    await db.collection("user_stats").updateOne(
        { userId },
        { $set: {
            favoriteCount: Number(favoriteCount) || 0,
            shareCount: Number(shareCount) || 0,
            historyCount: Number(historyCount) || 0,
            searchCount: Number(searchCount) || 0,
            watchSeconds: Number(watchSeconds) || 0,
            updatedAt: new Date()
        }},
        { upsert: true }
    );
    ctx.body = { code: 200, message: "统计信息已更新" };
});

// 忘记密码
authRouter.post("/user/forgot-password", async (ctx) => {
    const { email } = ctx.request.body || {};
    const safeEmail = String(email || "").trim();
    if (!safeEmail || !isValidAccount(safeEmail)) {
        ctx.body = { code: 400, message: "请输入有效的邮箱地址" };
        return;
    }
    try {
        const db = await getDb();
        if (!db) {
            ctx.body = { code: 500, message: "数据库连接失败" };
            return;
        }
        const user = await db.collection("users").findOne({ username: safeEmail });
        if (!user) {
            ctx.body = { code: 400, message: "邮箱不存在" };
            return;
        }
        if (!user.securityQuestion || !user.securityAnswer) {
            ctx.body = { code: 400, message: "该账户未设置安全问题" };
            return;
        }
        ctx.body = {
            code: 200,
            message: "获取安全问题成功",
            data: {
                userId: user._id.toString(),
                securityQuestion: user.securityQuestion
            }
        };
    } catch (error) {
        console.error("忘记密码失败:", error);
        ctx.body = { code: 500, message: "获取安全问题失败，请稍后重试" };
    }
});

// 验证安全问题答案
authRouter.post("/user/verify-security-answer", async (ctx) => {
    const { userId, securityAnswer } = ctx.request.body || {};
    const safeUserId = String(userId || "").trim();
    const safeSecurityAnswer = String(securityAnswer || "").trim();
    if (!safeUserId || !safeSecurityAnswer) {
        ctx.body = { code: 400, message: "用户ID和答案不能为空" };
        return;
    }
    try {
        const db = await getDb();
        if (!db) {
            ctx.body = { code: 500, message: "数据库连接失败" };
            return;
        }
        const user = await db.collection("users").findOne({ _id: new ObjectId(safeUserId) });
        if (!user) {
            ctx.body = { code: 400, message: "用户不存在" };
            return;
        }
        // 验证安全问题答案
        // 使用存储的盐值等信息来计算哈希
        const { securityAnswerSalt, securityAnswerIterations, securityAnswerKeylen, securityAnswerDigest } = user;
        if (!securityAnswerSalt || !securityAnswerIterations || !securityAnswerKeylen || !securityAnswerDigest) {
            ctx.body = { code: 400, message: "安全问题答案未设置" };
            return;
        }
        const verifyHash = crypto.pbkdf2Sync(safeSecurityAnswer, securityAnswerSalt, securityAnswerIterations, securityAnswerKeylen, securityAnswerDigest).toString("hex");
        if (user.securityAnswer !== verifyHash) {
            ctx.body = { code: 400, message: "安全问题答案错误" };
            return;
        }
        ctx.body = {
            code: 200,
            message: "验证成功",
            data: { valid: true }
        };
    } catch (error) {
        console.error("验证安全问题失败:", error);
        ctx.body = { code: 500, message: "验证失败，请稍后重试" };
    }
});

// 重置密码
authRouter.post("/user/reset-password", async (ctx) => {
    const { userId, password } = ctx.request.body || {};
    const safeUserId = String(userId || "").trim();
    const safePassword = String(password || "").trim();
    if (!safeUserId || !safePassword) {
        ctx.body = { code: 400, message: "用户ID和密码不能为空" };
        return;
    }
    try {
        const db = await getDb();
        if (!db) {
            ctx.body = { code: 500, message: "数据库连接失败" };
            return;
        }
        // 更新密码
        const { salt, iterations, keylen, digest, hash } = hashPassword(safePassword);
        await db.collection("users").updateOne(
            { _id: new ObjectId(safeUserId) },
            { $set: {
                salt,
                iterations,
                keylen,
                digest,
                hash,
                updatedAt: new Date()
            }}
        );
        ctx.body = { code: 200, message: "密码重置成功" };
    } catch (error) {
        console.error("重置密码失败:", error);
        ctx.body = { code: 500, message: "重置密码失败，请稍后重试" };
    }
});

// 获取安全问题列表（公开）
authRouter.get("/user/security-questions", async (ctx) => {
    try {
        const db = await getDb();
        if (!db) {
            ctx.body = { code: 500, message: "数据库连接失败" };
            return;
        }
        const settings = await db.collection("password_reset_settings").findOne({ _id: "settings" });
        const securityQuestions = settings?.securityQuestions || [
            "您母亲的姓名是什么？",
            "您的出生城市是？",
            "您的小学校名是？",
            "您的第一个宠物名字是？",
            "您的第一次旅行地点是？"
        ];
        ctx.body = {
            code: 200,
            message: "获取成功",
            data: { securityQuestions }
        };
    } catch (error) {
        console.error("获取安全问题列表失败:", error);
        // 返回默认安全问题
        ctx.body = {
            code: 200,
            message: "获取成功",
            data: {
                securityQuestions: [
                    "您母亲的姓名是什么？",
                    "您的出生城市是？",
                    "您的小学校名是？",
                    "您的第一个宠物名字是？",
                    "您的第一次旅行地点是？"
                ]
            }
        };
    }
});

module.exports = {
    router: authRouter,
    authMiddleware,
    requireAdmin,
    getDb,
    sanitizeUser
};