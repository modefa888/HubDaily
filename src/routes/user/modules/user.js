const Router = require("koa-router");
const { ObjectId } = require("mongodb");
const { authMiddleware, requireAdmin, getDb, sanitizeUser } = require("./auth");

const userRouter = new Router();

// 用户列表（管理员）- 分页
userRouter.get("/user/list", authMiddleware, requireAdmin, async (ctx) => {
    const page = Math.max(1, Number(ctx.query.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(ctx.query.pageSize || 20)));
    const skip = (page - 1) * pageSize;
    const sortKey = String(ctx.query.sortKey || "").trim();
    const sortDir = String(ctx.query.sortDir || "desc").toLowerCase() === "asc" ? 1 : -1;
    const allowedSortKeys = new Set(["favoriteCount", "historyCount", "searchCount", "watchSeconds", "shareCount"]);

    const db = await getDb();
    const total = await db.collection("users").countDocuments();
    let users = [];
    let statsMap = {};
    if (allowedSortKeys.has(sortKey)) {
        const pipeline = [
            {
                $lookup: {
                    from: "user_stats",
                    localField: "_id",
                    foreignField: "userId",
                    as: "stats",
                },
            },
            {
                $addFields: {
                    stats: { $ifNull: [{ $arrayElemAt: ["$stats", 0] }, {}] },
                },
            },
            {
                $addFields: {
                    favoriteCount: { $ifNull: ["$stats.favoriteCount", 0] },
                    historyCount: { $ifNull: ["$stats.historyCount", 0] },
                    searchCount: { $ifNull: ["$stats.searchCount", 0] },
                    watchSeconds: { $ifNull: ["$stats.watchSeconds", 0] },
                    shareCount: { $ifNull: ["$stats.shareCount", 0] },
                },
            },
            { $sort: { [sortKey]: sortDir, createdAt: -1 } },
            { $skip: skip },
            { $limit: pageSize },
        ];
        const result = await db.collection("users").aggregate(pipeline).toArray();
        users = result.map((u) => {
            const { stats, favoriteCount, historyCount, searchCount, watchSeconds, shareCount, ...rest } = u;
            statsMap[String(u._id)] = {
                favoriteCount: favoriteCount || 0,
                historyCount: historyCount || 0,
                searchCount: searchCount || 0,
                shareCount: shareCount || 0,
                watchSeconds: watchSeconds || 0,
                updatedAt: stats && stats.updatedAt ? stats.updatedAt.getTime() : null,
            };
            return rest;
        });
    } else {
        users = await db
            .collection("users")
            .find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(pageSize)
            .toArray();
    }

    ctx.body = {
        code: 200,
        message: "获取成功",
        data: users.map(sanitizeUser),
        statsMap,
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
    };
});

// 页面列表（管理员）
userRouter.get("/user/pages", authMiddleware, requireAdmin, async (ctx) => {
    const fs = require("fs");
    const path = require("path");
    const PUBLIC_DIR = path.join(__dirname, "../../../../public");
    
    const listHtmlPages = () => {
        const results = [];
        const walk = (dir) => {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            entries.forEach((entry) => {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    walk(fullPath);
                    return;
                }
                if (entry.isFile() && entry.name.endsWith(".html")) {
                    const relPath = path.relative(PUBLIC_DIR, fullPath).replace(/\\/g, "/");
                    const pagePath = "/" + relPath;
                    if (pagePath === "/404.html" || pagePath === "/no-access.html") return;
                    results.push(pagePath);
                }
            });
        };
        walk(PUBLIC_DIR);
        return results.sort();
    };
    
    ctx.body = { code: 200, message: "获取成功", data: listHtmlPages() };
});

// 在线用户（管理员）
userRouter.get("/user/online", authMiddleware, requireAdmin, async (ctx) => {
    const rawWithin = Number(ctx.query.within || 300000);
    const withinMs = Math.min(24 * 60 * 60 * 1000, Math.max(60 * 1000, rawWithin));
    const since = new Date(Date.now() - withinMs);
    const db = await getDb();
    const sessions = await db
        .collection("user_sessions")
        .aggregate([
            { $match: { lastSeenAt: { $gte: since } } },
            {
                $lookup: {
                    from: "users",
                    localField: "userId",
                    foreignField: "_id",
                    as: "user",
                },
            },
            { $unwind: "$user" },
            { $sort: { lastSeenAt: -1 } },
            { $limit: 500 },
        ])
        .toArray();
    ctx.body = {
        code: 200,
        message: "获取成功",
        withinMs,
        total: sessions.length,
        data: sessions.map((s) => ({
            sessionId: String(s._id),
            userId: String(s.userId),
            username: s.user ? s.user.username : "",
            nickname: s.user ? s.user.nickname : "",
            role: s.user ? s.user.role : "",
            isDisabled: !!(s.user && s.user.isDisabled),
            lastSeenAt: s.lastSeenAt ? s.lastSeenAt.getTime() : 0,
            lastPage: s.lastPage || "",
            ip: s.ip || "",
            userAgent: s.userAgent || "",
            createdAt: s.createdAt ? s.createdAt.getTime() : 0,
        })),
    };
});

// 更新用户角色（管理员）
userRouter.post("/user/user-role", authMiddleware, requireAdmin, async (ctx) => {
    const { userId, role } = ctx.request.body;
    if (!userId || !role) {
        ctx.body = { code: 400, message: "缺少参数" };
        return;
    }
    if (!ObjectId.isValid(userId)) {
        ctx.body = { code: 400, message: "用户ID不合法" };
        return;
    }
    // 检查角色是否存在
    const db = await getDb();
    const existingRole = await db.collection("roles").findOne({ name: role });
    if (!existingRole) {
        // 检查是否是默认角色
        const defaultRoles = ["admin", "user"];
        if (!defaultRoles.includes(role)) {
            ctx.body = { code: 400, message: "角色类型不合法" };
            return;
        }
    }
    try {
        const result = await db.collection("users").updateOne(
            { _id: new ObjectId(userId) },
            { $set: { role } }
        );
        if (result.matchedCount === 0) {
            ctx.body = { code: 404, message: "用户不存在" };
            return;
        }
        ctx.body = { code: 200, message: "角色更新成功" };
    } catch (error) {
        console.error("更新用户角色失败:", error);
        ctx.body = { code: 500, message: "更新失败" };
    }
});

// 角色管理接口（管理员）

// 获取角色列表
userRouter.get("/user/roles", authMiddleware, requireAdmin, async (ctx) => {
    try {
        const db = await getDb();
        let roles = await db.collection("roles").find().toArray();
        
        // 确保默认角色存在
        const defaultRoles = [
            { name: "admin", description: "管理员角色", permissions: [] },
            { name: "user", description: "普通用户角色", permissions: [] }
        ];
        
        for (const defaultRole of defaultRoles) {
            const existingRole = roles.find(role => role.name === defaultRole.name);
            if (!existingRole) {
                // 检查数据库中是否存在
                const dbRole = await db.collection("roles").findOne({ name: defaultRole.name });
                if (!dbRole) {
                    // 创建默认角色
                    await db.collection("roles").insertOne({
                        ...defaultRole,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    });
                    roles.push({
                        ...defaultRole,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    });
                } else {
                    roles.push(dbRole);
                }
            }
        }
        
        // 为每个角色添加用户数量统计
        const rolesWithStats = await Promise.all(roles.map(async (role) => {
            // 统计使用此角色的用户数量
            const userCount = await db.collection("users").countDocuments({ role: role.name });
            // 确保权限数组存在并统计数量
            const permissionsCount = Array.isArray(role.permissions) ? role.permissions.length : 0;
            
            return {
                ...role,
                userCount,
                permissionsCount
            };
        }));
        
        ctx.body = { code: 200, message: "获取成功", data: rolesWithStats };
    } catch (error) {
        console.error("获取角色列表失败:", error);
        ctx.body = { code: 500, message: "获取失败" };
    }
});

// 获取角色详情
userRouter.get("/user/role/:name", authMiddleware, requireAdmin, async (ctx) => {
    const name = decodeURIComponent(ctx.params.name);
    if (!name || !name.trim()) {
        ctx.body = { code: 400, message: "角色名称不能为空" };
        return;
    }
    try {
        const db = await getDb();
        const role = await db.collection("roles").findOne({ name: name.trim() });
        if (role) {
            ctx.body = { code: 200, message: "获取成功", data: role };
        } else {
            // 检查是否是默认角色
            const defaultRoles = {
                admin: { name: "admin", description: "管理员角色", permissions: [] },
                user: { name: "user", description: "普通用户角色", permissions: [] }
            };
            if (defaultRoles[name.trim()]) {
                ctx.body = { code: 200, message: "获取成功", data: defaultRoles[name.trim()] };
            } else {
                ctx.body = { code: 404, message: "角色不存在" };
            }
        }
    } catch (error) {
        console.error("获取角色详情失败:", error);
        ctx.body = { code: 500, message: "获取失败" };
    }
});

// 添加角色
userRouter.post("/user/role", authMiddleware, requireAdmin, async (ctx) => {
    const { name, description } = ctx.request.body;
    if (!name || !name.trim()) {
        ctx.body = { code: 400, message: "角色名称不能为空" };
        return;
    }
    try {
        const db = await getDb();
        // 检查角色是否已存在
        const existingRole = await db.collection("roles").findOne({ name: name.trim() });
        if (existingRole) {
            ctx.body = { code: 400, message: "角色已存在" };
            return;
        }
        // 创建角色
        const role = {
            name: name.trim(),
            description: description ? description.trim() : "",
            permissions: [],
            createdAt: new Date(),
            updatedAt: new Date()
        };
        await db.collection("roles").insertOne(role);
        ctx.body = { code: 200, message: "角色添加成功" };
    } catch (error) {
        console.error("添加角色失败:", error);
        ctx.body = { code: 500, message: "添加失败" };
    }
});

// 更新角色
userRouter.put("/user/role/:name", authMiddleware, requireAdmin, async (ctx) => {
    const oldName = decodeURIComponent(ctx.params.name);
    const { name, description } = ctx.request.body;
    if (!name || !name.trim()) {
        ctx.body = { code: 400, message: "角色名称不能为空" };
        return;
    }
    try {
        const db = await getDb();
        // 检查角色是否存在
        const existingRole = await db.collection("roles").findOne({ name: oldName });
        if (!existingRole) {
            ctx.body = { code: 404, message: "角色不存在" };
            return;
        }
        // 检查新名称是否与其他角色冲突
        if (name.trim() !== oldName) {
            const nameConflict = await db.collection("roles").findOne({ name: name.trim() });
            if (nameConflict) {
                ctx.body = { code: 400, message: "角色名称已存在" };
                return;
            }
        }
        // 更新角色
        await db.collection("roles").updateOne(
            { name: oldName },
            { $set: {
                name: name.trim(),
                description: description ? description.trim() : "",
                updatedAt: new Date()
            }}
        );
        ctx.body = { code: 200, message: "角色更新成功" };
    } catch (error) {
        console.error("更新角色失败:", error);
        ctx.body = { code: 500, message: "更新失败" };
    }
});

// 删除角色
userRouter.delete("/user/role/:name", authMiddleware, requireAdmin, async (ctx) => {
    const name = decodeURIComponent(ctx.params.name);
    if (!name || !name.trim()) {
        ctx.body = { code: 400, message: "角色名称不能为空" };
        return;
    }
    try {
        const db = await getDb();
        // 检查角色是否存在
        const existingRole = await db.collection("roles").findOne({ name: name.trim() });
        if (!existingRole) {
            ctx.body = { code: 404, message: "角色不存在" };
            return;
        }
        // 检查是否有用户正在使用此角色
        const userCount = await db.collection("users").countDocuments({ role: name.trim() });
        if (userCount > 0) {
            ctx.body = { code: 400, message: `有 ${userCount} 个用户正在使用此角色，无法删除` };
            return;
        }
        // 删除角色
        await db.collection("roles").deleteOne({ name: name.trim() });
        ctx.body = { code: 200, message: "角色删除成功" };
    } catch (error) {
        console.error("删除角色失败:", error);
        ctx.body = { code: 500, message: "删除失败" };
    }
});

// 批量获取用户统计信息
userRouter.post("/user/stats/batch", authMiddleware, requireAdmin, async (ctx) => {
    const { ids } = ctx.request.body;
    if (!Array.isArray(ids)) {
        ctx.body = { code: 400, message: "缺少参数" };
        return;
    }
    try {
        const db = await getDb();
        const stats = await db.collection("user_stats").find({ userId: { $in: ids.map(id => new ObjectId(id)) } }).toArray();
        const statsMap = {};
        stats.forEach(stat => {
            statsMap[String(stat.userId)] = {
                favoriteCount: stat.favoriteCount || 0,
                historyCount: stat.historyCount || 0,
                searchCount: stat.searchCount || 0,
                shareCount: stat.shareCount || 0,
                watchSeconds: stat.watchSeconds || 0,
                updatedAt: stat.updatedAt ? stat.updatedAt.getTime() : null
            };
        });
        ctx.body = { code: 200, message: "获取成功", data: statsMap };
    } catch (error) {
        console.error("批量获取用户统计信息失败:", error);
        ctx.body = { code: 500, message: "获取失败" };
    }
});

// 获取密码重置设置（管理员）
userRouter.get("/user/password-reset-settings", authMiddleware, requireAdmin, async (ctx) => {
    try {
        const db = await getDb();
        const settings = await db.collection("password_reset_settings").findOne({ _id: "settings" });
        if (settings) {
            ctx.body = { code: 200, message: "获取成功", data: settings };
        } else {
            // 返回默认设置
            const defaultSettings = {
                resetMethod: "securityQuestion",
                securityQuestions: [
                    "您母亲的姓名是什么？",
                    "您的出生城市是？",
                    "您的小学校名是？",
                    "您的第一个宠物名字是？",
                    "您的第一次旅行地点是？"
                ],
                emailFrom: "",
                emailPass: "",
                emailSubject: "密码重置请求",
                emailTemplate: "您请求重置您的账户密码。请点击以下链接完成重置：\n\n{resetLink}\n\n此链接将在24小时后失效。\n\n如果您没有请求密码重置，请忽略此邮件。"
            };
            ctx.body = { code: 200, message: "获取成功", data: defaultSettings };
        }
    } catch (error) {
        console.error("获取密码重置设置失败:", error);
        ctx.body = { code: 500, message: "获取失败" };
    }
});

// 更新密码重置设置（管理员）
userRouter.put("/user/password-reset-settings", authMiddleware, requireAdmin, async (ctx) => {
    const { resetMethod, securityQuestions, emailFrom, emailPass, emailSubject, emailTemplate } = ctx.request.body || {};
    if (!resetMethod) {
        ctx.body = { code: 400, message: "缺少密码重置方式" };
        return;
    }
    try {
        const db = await getDb();
        const settings = {
            _id: "settings",
            resetMethod: String(resetMethod),
            securityQuestions: Array.isArray(securityQuestions) ? securityQuestions : [],
            emailFrom: String(emailFrom || ""),
            emailPass: String(emailPass || ""),
            emailSubject: String(emailSubject || "密码重置请求"),
            emailTemplate: String(emailTemplate || "您请求重置您的账户密码。请点击以下链接完成重置：\n\n{resetLink}\n\n此链接将在24小时后失效。\n\n如果您没有请求密码重置，请忽略此邮件。"),
            updatedAt: new Date()
        };
        await db.collection("password_reset_settings").updateOne(
            { _id: "settings" },
            { $set: settings },
            { upsert: true }
        );
        ctx.body = { code: 200, message: "设置更新成功", data: settings };
    } catch (error) {
        console.error("更新密码重置设置失败:", error);
        ctx.body = { code: 500, message: "更新失败" };
    }
});

// 搜索关键字列表（管理员）
userRouter.get("/user/search-keywords", authMiddleware, requireAdmin, async (ctx) => {
    const page = Math.max(1, Number(ctx.query.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(ctx.query.pageSize || 20)));
    const skip = (page - 1) * pageSize;

    const db = await getDb();
    const total = await db.collection("search_keywords").countDocuments();
    const keywords = await db
        .collection("search_keywords")
        .find()
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(pageSize)
        .toArray();

    ctx.body = {
        code: 200,
        message: "获取成功",
        data: {
            items: keywords.map(item => ({
                keyword: item.keyword,
                username: item.username,
                timestamp: item.timestamp.getTime(),
                url: item.url
            })),
            total
        },
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
    };
});

// 搜索关键字统计（管理员）
userRouter.get("/user/search-keywords/stats", authMiddleware, requireAdmin, async (ctx) => {
    const db = await getDb();
    const stats = await db
        .collection("search_keywords")
        .aggregate([
            { $group: { _id: "$keyword", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 20 }
        ])
        .toArray();

    ctx.body = {
        code: 200,
        message: "获取成功",
        data: stats.map(item => ({
            keyword: item._id,
            count: item.count
        }))
    };
});

// 获取单个用户信息（管理员）
userRouter.get("/user/:id", authMiddleware, requireAdmin, async (ctx) => {
    const id = String(ctx.params.id || "").trim();
    if (!ObjectId.isValid(id)) {
        ctx.body = { code: 400, message: "用户ID不合法" };
        return;
    }
    try {
        const db = await getDb();
        const user = await db.collection("users").findOne({ _id: new ObjectId(id) });
        if (!user) {
            ctx.body = { code: 404, message: "用户不存在" };
            return;
        }
        ctx.body = { code: 200, message: "获取成功", data: sanitizeUser(user) };
    } catch (error) {
        console.error("获取用户信息失败:", error);
        ctx.body = { code: 500, message: "获取失败" };
    }
});

// 更新单个用户信息（管理员）
userRouter.put("/user/:id", authMiddleware, requireAdmin, async (ctx) => {
    const id = String(ctx.params.id || "").trim();
    if (!ObjectId.isValid(id)) {
        ctx.body = { code: 400, message: "用户ID不合法" };
        return;
    }
    const { nickname, apiAccess, isDisabled, disabledReason } = ctx.request.body || {};
    try {
        const db = await getDb();
        const update = { updatedAt: new Date() };
        if (nickname !== undefined) update.nickname = String(nickname || "").trim();
        if (apiAccess !== undefined) update.apiAccess = String(apiAccess || "normal").trim();
        if (isDisabled !== undefined) update.isDisabled = !!isDisabled;
        if (disabledReason !== undefined) update.disabledReason = String(disabledReason || "").trim();
        const result = await db.collection("users").updateOne(
            { _id: new ObjectId(id) },
            { $set: update }
        );
        if (result.matchedCount === 0) {
            ctx.body = { code: 404, message: "用户不存在" };
            return;
        }
        const updatedUser = await db.collection("users").findOne({ _id: new ObjectId(id) });
        ctx.body = { code: 200, message: "更新成功", data: sanitizeUser(updatedUser) };
    } catch (error) {
        console.error("更新用户信息失败:", error);
        ctx.body = { code: 500, message: "更新失败" };
    }
});

module.exports = {
    router: userRouter
};