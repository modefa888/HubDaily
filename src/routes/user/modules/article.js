const Router = require("koa-router");
const { ObjectId } = require("mongodb");
const { authMiddleware, requireAdmin, getDb } = require("./auth");

const articleRouter = new Router();

// 文章列表（管理员）
articleRouter.get("/user/articles", authMiddleware, requireAdmin, async (ctx) => {
    const page = Math.max(1, Number(ctx.query.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(ctx.query.pageSize || 5)));
    const skip = (page - 1) * pageSize;
    
    const db = await getDb();
    // 管理员可以看到所有文章，包括未到发布时间的文章
    const total = await db.collection("articles").countDocuments();
    const articles = await db.collection("articles").find().sort({ isTop: -1, createdAt: -1 }).skip(skip).limit(pageSize).toArray();
    
    ctx.body = {
        code: 200,
        message: "获取成功",
        data: articles.map((article) => ({
            _id: article._id,
            title: article.title || "",
            status: article.status || "published",
            access: article.access || "public",
            content: article.content || "",
            publishTime: article.publishTime,
            category: article.category || "",
            tags: Array.isArray(article.tags) ? article.tags : [],
            isTop: article.isTop || false,
            viewCount: article.viewCount || 0,
            likeCount: article.likeCount || 0,
            dislikeCount: article.dislikeCount || 0,
            createdAt: article.createdAt,
            updatedAt: article.updatedAt
        })),
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
    };
});

// 顶置文章（管理员）
articleRouter.put("/user/article/:id/top", authMiddleware, requireAdmin, async (ctx) => {
    const id = String(ctx.params.id || "").trim();
    if (!ObjectId.isValid(id)) {
        ctx.body = { code: 400, message: "ID不合法" };
        return;
    }
    const { isTop } = ctx.request.body || {};
    const db = await getDb();
    await db.collection("articles").updateOne({ _id: new ObjectId(id) }, { $set: { isTop: !!isTop, updatedAt: new Date() } });
    ctx.body = { code: 200, message: "更新成功" };
});

// 创建文章（管理员）
articleRouter.post("/user/article", authMiddleware, requireAdmin, async (ctx) => {
    const { title, status, access, content, publishTime, category, tags } = ctx.request.body || {};
    const safeTitle = String(title || "").trim();
    const safeContent = String(content || "").trim();
    // 草稿状态不要求填写所有字段
    if (status !== "draft") {
        if (!safeTitle || !safeContent) {
            ctx.body = { code: 400, message: "标题或内容不能为空" };
            return;
        }
    }
    const now = new Date();
    const db = await getDb();
    const result = await db.collection("articles").insertOne({
        title: safeTitle,
        status: String(status || "published").trim() || "published",
        access: String(access || "public").trim() || "public",
        content: safeContent,
        publishTime: publishTime ? new Date(publishTime) : now,
        category: String(category || "").trim(),
        tags: Array.isArray(tags) ? tags : [],
        isTop: false,
        viewCount: 0,
        likeCount: 0,
        dislikeCount: 0,
        createdAt: now,
        updatedAt: now
    });
    ctx.body = { code: 200, message: "创建成功", data: { id: String(result.insertedId) } };
});

// 获取文章详情（管理员）
articleRouter.get("/user/article/:id", authMiddleware, requireAdmin, async (ctx) => {
    const id = String(ctx.params.id || "").trim();
    if (!ObjectId.isValid(id)) {
        ctx.body = { code: 400, message: "ID不合法" };
        return;
    }
    const db = await getDb();
    const article = await db.collection("articles").findOne({ _id: new ObjectId(id) });
    if (!article) {
        ctx.body = { code: 404, message: "文章不存在" };
        return;
    }
    ctx.body = {
        code: 200,
        message: "获取成功",
        data: {
            _id: article._id,
            title: article.title || "",
            status: article.status || "published",
            access: article.access || "public",
            content: article.content || "",
            publishTime: article.publishTime,
            category: article.category || "",
            tags: Array.isArray(article.tags) ? article.tags : [],
            isTop: article.isTop || false,
            createdAt: article.createdAt,
            updatedAt: article.updatedAt
        }
    };
});

// 更新文章（管理员）
articleRouter.put("/user/article/:id", authMiddleware, requireAdmin, async (ctx) => {
    const id = String(ctx.params.id || "").trim();
    if (!ObjectId.isValid(id)) {
        ctx.body = { code: 400, message: "ID不合法" };
        return;
    }
    const { title, status, access, content, publishTime, category, tags, isTop } = ctx.request.body || {};
    const update = { updatedAt: new Date() };
    if (title !== undefined) update.title = String(title || "").trim();
    if (status !== undefined) update.status = String(status || "published").trim() || "published";
    if (access !== undefined) update.access = String(access || "public").trim() || "public";
    if (content !== undefined) update.content = String(content || "").trim();
    if (publishTime !== undefined) update.publishTime = new Date(publishTime);
    if (category !== undefined) update.category = String(category || "").trim();
    if (tags !== undefined) update.tags = Array.isArray(tags) ? tags : [];
    if (isTop !== undefined) update.isTop = !!isTop;
    const db = await getDb();
    await db.collection("articles").updateOne({ _id: new ObjectId(id) }, { $set: update });
    ctx.body = { code: 200, message: "更新成功" };
});

// 删除文章（管理员）
articleRouter.delete("/user/article/:id", authMiddleware, requireAdmin, async (ctx) => {
    const id = String(ctx.params.id || "").trim();
    if (!ObjectId.isValid(id)) {
        ctx.body = { code: 400, message: "ID不合法" };
        return;
    }
    const db = await getDb();
    await db.collection("articles").deleteOne({ _id: new ObjectId(id) });
    ctx.body = { code: 200, message: "已删除" };
});

// 分类列表（管理员）
articleRouter.get("/user/categories", authMiddleware, requireAdmin, async (ctx) => {
    const db = await getDb();
    const categories = await db.collection("categories").find().sort({ createdAt: -1 }).toArray();
    ctx.body = {
        code: 200,
        message: "获取成功",
        data: categories.map((category) => ({
            _id: category._id,
            name: category.name || "",
            createdAt: category.createdAt,
            updatedAt: category.updatedAt
        }))
    };
});

// 创建分类（管理员）
articleRouter.post("/user/category", authMiddleware, requireAdmin, async (ctx) => {
    const { name } = ctx.request.body || {};
    const safeName = String(name || "").trim();
    if (!safeName) {
        ctx.body = { code: 400, message: "分类名称不能为空" };
        return;
    }
    const now = new Date();
    const db = await getDb();
    try {
        const result = await db.collection("categories").insertOne({
            name: safeName,
            createdAt: now,
            updatedAt: now
        });
        ctx.body = { code: 200, message: "创建成功", data: { id: String(result.insertedId) } };
    } catch (err) {
        if (err && err.code === 11000) {
            ctx.body = { code: 409, message: "分类已存在" };
            return;
        }
        ctx.body = { code: 500, message: "创建失败" };
    }
});

// 删除分类（管理员）
articleRouter.delete("/user/category/:id", authMiddleware, requireAdmin, async (ctx) => {
    const id = String(ctx.params.id || "").trim();
    if (!ObjectId.isValid(id)) {
        ctx.body = { code: 400, message: "ID不合法" };
        return;
    }
    const db = await getDb();
    await db.collection("categories").deleteOne({ _id: new ObjectId(id) });
    ctx.body = { code: 200, message: "已删除" };
});

module.exports = {
    router: articleRouter
};