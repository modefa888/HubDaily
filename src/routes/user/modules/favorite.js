const Router = require("koa-router");
const { ObjectId } = require("mongodb");
const { authMiddleware, requireAdmin, getDb } = require("./auth");

const favoriteRouter = new Router();

// 获取喜欢列表（登录用户）
favoriteRouter.get("/user/favorites", authMiddleware, async (ctx) => {
    const db = await getDb();
    const favorites = await db
        .collection("user_favorites")
        .find({ userId: ctx.state.user._id })
        .sort({ createdAt: -1 })
        .toArray();
    ctx.body = {
        code: 200,
        message: "获取成功",
        data: favorites.map((item) => ({
            title: item.title,
            url: item.url,
            pic: item.pic,
            source: item.source,
            timestamp: item.createdAt ? item.createdAt.getTime() : Date.now(),
        })),
    };
});

// 获取喜欢列表（管理员指定用户）
favoriteRouter.get("/user/:id/favorites", authMiddleware, requireAdmin, async (ctx) => {
    const { id } = ctx.params;
    if (!ObjectId.isValid(id)) {
        ctx.body = { code: 400, message: "用户ID不合法" };
        return;
    }
    const db = await getDb();
    const favorites = await db
        .collection("user_favorites")
        .find({ userId: new ObjectId(id) })
        .sort({ createdAt: -1 })
        .toArray();
    ctx.body = {
        code: 200,
        message: "获取成功",
        data: favorites.map((item) => ({
            title: item.title,
            url: item.url,
            pic: item.pic,
            source: item.source,
            timestamp: item.createdAt ? item.createdAt.getTime() : Date.now(),
        })),
    };
});

// 删除喜欢（管理员指定用户）
favoriteRouter.delete("/user/:id/favorites", authMiddleware, requireAdmin, async (ctx) => {
    const { id } = ctx.params;
    if (!ObjectId.isValid(id)) {
        ctx.body = { code: 400, message: "用户ID不合法" };
        return;
    }
    const url = String(ctx.request.body?.url || "").trim();
    if (!url) {
        ctx.body = { code: 400, message: "缺少 url 参数" };
        return;
    }
    const db = await getDb();
    await db.collection("user_favorites").deleteOne({ userId: new ObjectId(id), url });
    ctx.body = { code: 200, message: "已删除" };
});

// 添加喜欢（登录用户）
favoriteRouter.post("/user/favorites", authMiddleware, async (ctx) => {
    const { title, url, pic, source } = ctx.request.body || {};
    const safeUrl = String(url || "").trim();
    if (!safeUrl) {
        ctx.body = { code: 400, message: "视频地址不能为空" };
        return;
    }
    const db = await getDb();
    const now = new Date();
    await db.collection("user_favorites").updateOne(
        { userId: ctx.state.user._id, url: safeUrl },
        {
            $set: {
                title: String(title || "").trim(),
                pic: String(pic || "").trim(),
                source: String(source || "").trim(),
                updatedAt: now,
            },
            $setOnInsert: {
                createdAt: now,
            },
        },
        { upsert: true }
    );
    ctx.body = { code: 200, message: "已加入喜欢" };
});

// 取消喜欢（登录用户）
favoriteRouter.delete("/user/favorites", authMiddleware, async (ctx) => {
    const { url } = ctx.request.body || {};
    const safeUrl = String(url || "").trim();
    if (!safeUrl) {
        ctx.body = { code: 400, message: "视频地址不能为空" };
        return;
    }
    const db = await getDb();
    await db.collection("user_favorites").deleteOne({ userId: ctx.state.user._id, url: safeUrl });
    ctx.body = { code: 200, message: "已取消喜欢" };
});

// 清空喜欢（登录用户）
favoriteRouter.delete("/user/favorites/all", authMiddleware, async (ctx) => {
    const db = await getDb();
    await db.collection("user_favorites").deleteMany({ userId: ctx.state.user._id });
    ctx.body = { code: 200, message: "喜欢已清空" };
});

module.exports = {
    router: favoriteRouter
};