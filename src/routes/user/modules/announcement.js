const Router = require("koa-router");
const { ObjectId } = require("mongodb");
const { authMiddleware, requireAdmin, getDb } = require("./auth");

const announcementRouter = new Router();

// 公告列表（所有用户可用）
announcementRouter.get("/announcements", async (ctx) => {
    const db = await getDb();
    const now = new Date();
    const announcements = await db.collection("announcements").find().sort({ createdAt: -1 }).toArray();
    const data = announcements.map(ann => {
        const startTime = ann.startTime ? new Date(ann.startTime) : null;
        const endTime = ann.endTime ? new Date(ann.endTime) : null;
        const isActive = startTime && endTime && now >= startTime && now <= endTime;
        return {
            _id: ann._id,
            title: ann.title || "",
            type: ann.type || "info",
            content: ann.content || "",
            startTime: ann.startTime,
            endTime: ann.endTime,
            pages: Array.isArray(ann.pages) ? ann.pages : [],
            isActive,
            createdAt: ann.createdAt,
            updatedAt: ann.updatedAt
        };
    });
    ctx.body = { code: 200, message: "获取成功", data };
});

// 公告列表（管理员）
announcementRouter.get("/user/announcements", authMiddleware, requireAdmin, async (ctx) => {
    const db = await getDb();
    const announcements = await db.collection("announcements").find().sort({ createdAt: -1 }).toArray();
    ctx.body = {
        code: 200,
        message: "获取成功",
        data: announcements.map(ann => ({
            _id: ann._id,
            title: ann.title || "",
            type: ann.type || "info",
            content: ann.content || "",
            startTime: ann.startTime,
            endTime: ann.endTime,
            pages: Array.isArray(ann.pages) ? ann.pages : [],
            createdAt: ann.createdAt,
            updatedAt: ann.updatedAt
        }))
    };
});

// 创建公告（管理员）
announcementRouter.post("/user/announcement", authMiddleware, requireAdmin, async (ctx) => {
    const { title, type, content, startTime, endTime, pages } = ctx.request.body || {};
    const safeTitle = String(title || "").trim();
    const safeContent = String(content || "").trim();
    if (!safeTitle || !safeContent) {
        ctx.body = { code: 400, message: "标题或内容不能为空" };
        return;
    }
    const now = new Date();
    const db = await getDb();
    const result = await db.collection("announcements").insertOne({
        title: safeTitle,
        type: String(type || "info").trim() || "info",
        content: safeContent,
        startTime: startTime ? new Date(startTime) : now,
        endTime: endTime ? new Date(endTime) : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        pages: Array.isArray(pages) ? pages : [],
        createdAt: now,
        updatedAt: now
    });
    ctx.body = { code: 200, message: "创建成功", data: { id: String(result.insertedId) } };
});

// 更新公告（管理员）
announcementRouter.put("/user/announcement/:id", authMiddleware, requireAdmin, async (ctx) => {
    const id = String(ctx.params.id || "").trim();
    if (!ObjectId.isValid(id)) {
        ctx.body = { code: 400, message: "ID不合法" };
        return;
    }
    const { title, type, content, startTime, endTime, pages } = ctx.request.body || {};
    const update = { updatedAt: new Date() };
    if (title !== undefined) update.title = String(title || "").trim();
    if (type !== undefined) update.type = String(type || "info").trim() || "info";
    if (content !== undefined) update.content = String(content || "").trim();
    if (startTime !== undefined) update.startTime = new Date(startTime);
    if (endTime !== undefined) update.endTime = new Date(endTime);
    if (pages !== undefined) update.pages = Array.isArray(pages) ? pages : [];
    const db = await getDb();
    await db.collection("announcements").updateOne({ _id: new ObjectId(id) }, { $set: update });
    ctx.body = { code: 200, message: "更新成功" };
});

// 删除公告（管理员）
announcementRouter.delete("/user/announcement/:id", authMiddleware, requireAdmin, async (ctx) => {
    const id = String(ctx.params.id || "").trim();
    if (!ObjectId.isValid(id)) {
        ctx.body = { code: 400, message: "ID不合法" };
        return;
    }
    const db = await getDb();
    await db.collection("announcements").deleteOne({ _id: new ObjectId(id) });
    ctx.body = { code: 200, message: "已删除" };
});

// 获取单个公告（所有用户可用）
announcementRouter.get("/user/announcement/:id", async (ctx) => {
    const id = String(ctx.params.id || "").trim();
    if (!ObjectId.isValid(id)) {
        ctx.body = { code: 400, message: "ID不合法" };
        return;
    }
    const db = await getDb();
    const announcement = await db.collection("announcements").findOne({ _id: new ObjectId(id) });
    if (!announcement) {
        ctx.body = { code: 404, message: "公告不存在" };
        return;
    }
    const now = new Date();
    const startTime = announcement.startTime ? new Date(announcement.startTime) : null;
    const endTime = announcement.endTime ? new Date(announcement.endTime) : null;
    const isActive = startTime && endTime && now >= startTime && now <= endTime;
    const data = {
        _id: announcement._id,
        title: announcement.title || "",
        type: announcement.type || "info",
        content: announcement.content || "",
        startTime: announcement.startTime,
        endTime: announcement.endTime,
        pages: Array.isArray(announcement.pages) ? announcement.pages : [],
        isActive,
        createdAt: announcement.createdAt,
        updatedAt: announcement.updatedAt
    };
    ctx.body = { code: 200, message: "获取成功", data };
});

module.exports = {
    router: announcementRouter
};