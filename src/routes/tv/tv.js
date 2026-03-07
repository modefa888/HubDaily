const Router = require("koa-router");
const { ObjectId } = require("mongodb");
const client = require("../../utils/mongo");

const tvRouter = new Router();

const getDb = async () => {
    try {
        await client.connect();
        return client.db();
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

// 获取 TV 分享墙的视频列表
tvRouter.get("/tv/shares", async (ctx) => {
    try {
        const db = await getDb();
        if (!db) {
            ctx.body = {
                code: 200,
                message: "获取成功",
                data: []
            };
            return;
        }
        
        // 获取分页参数
        const page = parseInt(ctx.query.page) || 1;
        const limit = parseInt(ctx.query.limit) || 20;
        const skip = (page - 1) * limit;
        
        // 获取 TV 分享视频
        const shares = await db.collection("tv_shares").find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();
        
        ctx.body = {
            code: 200,
            message: "获取成功",
            data: shares.map((share) => ({
                id: String(share._id),
                shareId: share.shareId,
                url: share.url,
                title: share.title,
                pic: share.pic || "",
                source: share.source || "",
                expireSeconds: share.expireSeconds || 0,
                expiresAt: share.expiresAt ? share.expiresAt.getTime() : 0,
                createdAt: share.createdAt ? share.createdAt.getTime() : 0
            }))
        };
    } catch (error) {
        console.error("获取 TV 分享墙失败:", error);
        ctx.body = {
            code: 200,
            message: "获取成功",
            data: []
        };
    }
});

// 添加视频到 TV 分享墙
tvRouter.post("/tv/add-share", async (ctx) => {
    try {
        const db = await getDb();
        if (!db) {
            ctx.body = { code: 500, message: "数据库连接失败" };
            return;
        }
        
        // 检查用户权限
        let userRole = "guest";
        let isLoggedIn = false;
        
        // 尝试获取用户信息
        const token = getTokenFromRequest(ctx);
        if (token) {
            try {
                const session = await db.collection("user_sessions").findOne({ token });
                if (session && session.expiresAt > new Date()) {
                    const user = await db.collection("users").findOne({ _id: session.userId });
                    if (user && !user.isDisabled) {
                        userRole = user.role || "user";
                        isLoggedIn = true;
                    }
                }
            } catch (error) {
                console.error("获取用户信息失败:", error);
            }
        }
        
        // 检查用户是否是管理员
        if (!isLoggedIn || userRole !== "admin") {
            ctx.body = { code: 403, message: "需要管理员权限才能进行此操作" };
            return;
        }
        
        // 获取请求参数
        const { shareId, url, title, pic, source, expireSeconds, expiresAt } = ctx.request.body || {};
        const safeUrl = String(url || "").trim();
        const safeTitle = String(title || "").trim();
        
        if (!safeUrl || !safeTitle) {
            ctx.body = { code: 400, message: "缺少必要参数" };
            return;
        }
        
        // 检查是否已经存在
        const existingShare = await db.collection("tv_shares").findOne({ shareId });
        if (existingShare) {
            ctx.body = { code: 400, message: "该视频已经在 TV 分享墙中" };
            return;
        }
        
        // 添加到 TV 分享墙
        await db.collection("tv_shares").insertOne({
            shareId: shareId || `tv_${Date.now()}`,
            url: safeUrl,
            title: safeTitle,
            pic: String(pic || "").trim(),
            source: String(source || "").trim(),
            expireSeconds: Number(expireSeconds) || 3600, // 默认1小时过期
            expiresAt: expiresAt ? new Date(expiresAt) : new Date(Date.now() + 3600000), // 默认1小时过期
            createdAt: new Date(),
            updatedAt: new Date()
        });
        
        ctx.body = {
            code: 200,
            message: "添加成功"
        };
    } catch (error) {
        console.error("添加到 TV 分享墙失败:", error);
        ctx.body = { code: 500, message: "添加失败，请重试" };
    }
});

// 更新 TV 分享墙中的视频
tvRouter.put("/tv/shares/:shareId", async (ctx) => {
    try {
        const db = await getDb();
        if (!db) {
            ctx.body = { code: 500, message: "数据库连接失败" };
            return;
        }
        
        // 检查用户权限
        let userRole = "guest";
        let isLoggedIn = false;
        
        // 尝试获取用户信息
        const token = getTokenFromRequest(ctx);
        if (token) {
            try {
                const session = await db.collection("user_sessions").findOne({ token });
                if (session && session.expiresAt > new Date()) {
                    const user = await db.collection("users").findOne({ _id: session.userId });
                    if (user && !user.isDisabled) {
                        userRole = user.role || "user";
                        isLoggedIn = true;
                    }
                }
            } catch (error) {
                console.error("获取用户信息失败:", error);
            }
        }
        
        // 检查用户是否是管理员
        if (!isLoggedIn || userRole !== "admin") {
            ctx.body = { code: 403, message: "需要管理员权限才能进行此操作" };
            return;
        }
        
        // 获取分享ID
        const shareId = String(ctx.params.shareId || "").trim();
        if (!shareId) {
            ctx.body = { code: 400, message: "缺少分享ID" };
            return;
        }
        
        // 获取请求参数
        const { url, title, pic, source, expireSeconds, expiresAt } = ctx.request.body || {};
        const updateData = {};
        
        if (url) updateData.url = String(url).trim();
        if (title) updateData.title = String(title).trim();
        if (pic) updateData.pic = String(pic).trim();
        if (source) updateData.source = String(source).trim();
        if (expireSeconds !== undefined) updateData.expireSeconds = Number(expireSeconds) || 0;
        if (expiresAt) updateData.expiresAt = new Date(expiresAt);
        updateData.updatedAt = new Date();
        
        // 更新分享
        const updateResult = await db.collection("tv_shares").updateOne(
            { shareId },
            { $set: updateData }
        );
        
        if (updateResult.matchedCount === 0) {
            ctx.body = { code: 404, message: "分享不存在" };
            return;
        }
        
        ctx.body = {
            code: 200,
            message: "更新成功"
        };
    } catch (error) {
        console.error("更新 TV 分享失败:", error);
        ctx.body = { code: 500, message: "更新失败，请重试" };
    }
});

// 删除 TV 分享墙中的视频
tvRouter.delete("/tv/shares/:shareId", async (ctx) => {
    try {
        const db = await getDb();
        if (!db) {
            ctx.body = { code: 500, message: "数据库连接失败" };
            return;
        }
        
        // 检查用户权限
        let userRole = "guest";
        let isLoggedIn = false;
        
        // 尝试获取用户信息
        const token = getTokenFromRequest(ctx);
        if (token) {
            try {
                const session = await db.collection("user_sessions").findOne({ token });
                if (session && session.expiresAt > new Date()) {
                    const user = await db.collection("users").findOne({ _id: session.userId });
                    if (user && !user.isDisabled) {
                        userRole = user.role || "user";
                        isLoggedIn = true;
                    }
                }
            } catch (error) {
                console.error("获取用户信息失败:", error);
            }
        }
        
        // 检查用户是否是管理员
        if (!isLoggedIn || userRole !== "admin") {
            ctx.body = { code: 403, message: "需要管理员权限才能进行此操作" };
            return;
        }
        
        // 获取分享ID
        const shareId = String(ctx.params.shareId || "").trim();
        if (!shareId) {
            ctx.body = { code: 400, message: "缺少分享ID" };
            return;
        }
        
        // 删除分享
        await db.collection("tv_shares").deleteOne({ shareId });
        
        ctx.body = {
            code: 200,
            message: "删除成功"
        };
    } catch (error) {
        console.error("删除 TV 分享失败:", error);
        ctx.body = { code: 500, message: "删除失败，请重试" };
    }
});

module.exports = tvRouter;