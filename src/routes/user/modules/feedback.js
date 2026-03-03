const Router = require("koa-router");
const { ObjectId } = require("mongodb");
const { authMiddleware, requireAdmin, getDb } = require("./auth");

const feedbackRouter = new Router();

const escapeRegex = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// 提交用户反馈（登录用户）
feedbackRouter.post("/user/feedbacks", authMiddleware, async (ctx) => {
    const { type, message, email, page } = ctx.request.body || {};
    const safeMessage = String(message || "").trim();
    if (!safeMessage) {
        ctx.body = { code: 400, message: "内容不能为空" };
        return;
    }
    const safeType = String(type || "反馈").trim() || "反馈";
    const safeEmail = String(email || "").trim();
    const safePage = String(page || "").trim();
    const now = new Date();
    const user = ctx.state.user || {};
    const userNickname = String(user.nickname || user.username || "").trim();
    const payload = {
        userId: user._id,
        username: String(user.username || "").trim(),
        userNickname: userNickname,
        nickname: userNickname, // Use user's account nickname exclusively
        email: safeEmail,
        type: safeType,
        message: safeMessage,
        page: safePage,
        userAgent: ctx.headers["user-agent"] || "",
        replies: [],
        createdAt: now,
        updatedAt: now,
    };
    const db = await getDb();
    const result = await db.collection("user_feedback").insertOne(payload);
    ctx.body = { code: 200, message: "提交成功", data: { id: result.insertedId } };
});

// 用户反馈列表（管理员）
feedbackRouter.get("/user/feedbacks", authMiddleware, requireAdmin, async (ctx) => {
    const page = Math.max(1, Number(ctx.query.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(ctx.query.pageSize || 20)));
    const skip = (page - 1) * pageSize;
    const keyword = String(ctx.query.keyword || "").trim();
    const filter = {};
    if (keyword) {
        const reg = new RegExp(escapeRegex(keyword), "i");
        filter.$or = [
            { message: reg },
            { username: reg },
            { nickname: reg },
            { userNickname: reg },
            { email: reg },
            { type: reg },
        ];
    }
    try {
        const db = await getDb();
        if (!db) {
            ctx.body = {
                code: 200,
                message: "获取成功",
                data: [],
                page,
                pageSize,
                total: 0,
                totalPages: 0,
            };
            return;
        }
        const total = await db.collection("user_feedback").countDocuments(filter);
        const list = await db
            .collection("user_feedback")
            .find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(pageSize)
            .toArray();
        ctx.body = {
            code: 200,
            message: "获取成功",
            data: list.map((item) => ({
                id: item._id,
                userId: item.userId ? String(item.userId) : "",
                username: item.username || "",
                userNickname: item.userNickname || "",
                nickname: item.nickname || "",
                email: item.email || "",
                type: item.type || "",
                message: item.message || "",
                page: item.page || "",
                userAgent: item.userAgent || "",
                replies: Array.isArray(item.replies)
                    ? item.replies.map((reply) => ({
                        id: reply.id || "",
                        role: reply.role || "",
                        userId: reply.userId ? String(reply.userId) : "",
                        nickname: reply.nickname || "",
                        message: reply.message || "",
                        createdAt: reply.createdAt ? reply.createdAt.getTime() : 0,
                    }))
                    : [],
                createdAt: item.createdAt ? item.createdAt.getTime() : 0,
                updatedAt: item.updatedAt ? item.updatedAt.getTime() : 0,
            })),
            page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize),
        };
    } catch (error) {
        console.error("获取用户反馈列表失败:", error);
        ctx.body = {
            code: 200,
            message: "获取成功",
            data: [],
            page,
            pageSize,
            total: 0,
            totalPages: 0,
        };
    }
});

// 删除用户反馈（管理员）
feedbackRouter.delete("/user/feedbacks/:id", authMiddleware, requireAdmin, async (ctx) => {
    const { id } = ctx.params;
    if (!ObjectId.isValid(id)) {
        ctx.body = { code: 400, message: "反馈ID不合法" };
        return;
    }
    const db = await getDb();
    await db.collection("user_feedback").deleteOne({ _id: new ObjectId(id) });
    ctx.body = { code: 200, message: "已删除" };
});

// 获取自己的反馈（登录用户）
feedbackRouter.get("/user/feedbacks/self", authMiddleware, async (ctx) => {
    const page = Math.max(1, Number(ctx.query.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(ctx.query.pageSize || 20)));
    const skip = (page - 1) * pageSize;
    const db = await getDb();
    const filter = { userId: ctx.state.user._id };
    const total = await db.collection("user_feedback").countDocuments(filter);
    const list = await db
        .collection("user_feedback")
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .toArray();
    const user = ctx.state.user || {};
    const userNickname = String(user.nickname || user.username || "用户").trim();
    ctx.body = {
        code: 200,
        message: "获取成功",
        data: list.map((item) => ({
                id: item._id,
                email: item.email || "",
                nickname: userNickname,
                userNickname: userNickname,
                type: item.type || "",
                message: item.message || "",
                page: item.page || "",
                replies: Array.isArray(item.replies)
                    ? item.replies.map((reply) => ({
                        id: reply.id || "",
                        role: reply.role || "",
                        userId: reply.userId ? String(reply.userId) : "",
                        nickname: reply.nickname || "",
                        message: reply.message || "",
                        createdAt: reply.createdAt ? reply.createdAt.getTime() : 0,
                    }))
                    : [],
                createdAt: item.createdAt ? item.createdAt.getTime() : 0,
                updatedAt: item.updatedAt ? item.updatedAt.getTime() : 0,
            })),
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
    };
});

// 回复反馈（登录用户/管理员）
feedbackRouter.post("/user/feedbacks/:id/reply", authMiddleware, async (ctx) => {
    const { id } = ctx.params;
    if (!ObjectId.isValid(id)) {
        ctx.body = { code: 400, message: "反馈ID不合法" };
        return;
    }
    const { message } = ctx.request.body || {};
    const safeMessage = String(message || "").trim();
    if (!safeMessage) {
        ctx.body = { code: 400, message: "回复内容不能为空" };
        return;
    }
    const db = await getDb();
    const feedback = await db.collection("user_feedback").findOne({ _id: new ObjectId(id) });
    if (!feedback) {
        ctx.body = { code: 404, message: "反馈不存在" };
        return;
    }
    const user = ctx.state.user || {};
    const isAdmin = user.role === "admin";
    if (!isAdmin && String(feedback.userId) !== String(user._id)) {
        ctx.body = { code: 403, message: "无权限回复" };
        return;
    }
    if (!isAdmin && String(feedback.userId) === String(user._id)) {
        const replies = Array.isArray(feedback.replies) ? feedback.replies : [];
        const hasAdminReply = replies.some((reply) => reply && reply.role === "admin");
        if (!hasAdminReply) {
            ctx.body = { code: 403, message: "不能回复自己的消息" };
            return;
        }
    }
    const now = new Date();
    const reply = {
        id: require("crypto").randomBytes(8).toString("hex"),
        role: isAdmin ? "admin" : "user",
        userId: user._id,
        nickname: String(user.nickname || user.username || "").trim(),
        message: safeMessage,
        createdAt: now,
    };
    await db.collection("user_feedback").updateOne(
        { _id: feedback._id },
        {
            $push: { replies: reply },
            $set: { updatedAt: now },
        }
    );
    ctx.body = { code: 200, message: "回复成功" };
});

module.exports = {
    router: feedbackRouter
};