const Router = require("koa-router");
const { ObjectId } = require("mongodb");
const { authMiddleware, requireAdmin, getDb } = require("./auth");
const { DEFAULT_PARSE_APIS } = require("../../../utils/parseApis");

const parseApiRouter = new Router();

// 解析接口列表（管理员）
parseApiRouter.get("/user/parse-apis", authMiddleware, requireAdmin, async (ctx) => {
    const db = await getDb();
    let list = await db.collection("parse_apis").find().sort({ sort: 1, createdAt: -1 }).toArray();
    if (!list || list.length === 0) {
        const now = new Date();
        const payload = DEFAULT_PARSE_APIS.map((api, index) => ({
            name: api.name,
            url: api.url,
            enabled: true,
            sort: index + 1,
            createdAt: now,
            updatedAt: now,
        }));
        if (payload.length > 0) {
            await db.collection("parse_apis").insertMany(payload, { ordered: false });
        }
        list = await db.collection("parse_apis").find().sort({ sort: 1, createdAt: -1 }).toArray();
    }
    ctx.body = {
        code: 200,
        message: "获取成功",
        data: list.map((item) => ({
            id: String(item._id),
            name: item.name,
            url: item.url,
            enabled: !!item.enabled,
            sort: Number(item.sort || 0),
            createdAt: item.createdAt ? item.createdAt.getTime() : 0,
            updatedAt: item.updatedAt ? item.updatedAt.getTime() : 0,
        })),
    };
});

// 新增解析接口（管理员）
parseApiRouter.post("/user/parse-apis", authMiddleware, requireAdmin, async (ctx) => {
    const { name, url, enabled, sort } = ctx.request.body || {};
    const safeName = String(name || "").trim();
    const safeUrl = String(url || "").trim();
    if (!safeName || !safeUrl) {
        ctx.body = { code: 400, message: "名称或URL不能为空" };
        return;
    }
    const now = new Date();
    const db = await getDb();
    try {
        const result = await db.collection("parse_apis").insertOne({
            name: safeName,
            url: safeUrl,
            enabled: enabled !== false,
            sort: Number(sort || 0),
            createdAt: now,
            updatedAt: now,
        });
        ctx.body = { code: 200, message: "新增成功", data: { id: String(result.insertedId) } };
    } catch (err) {
        if (err && err.code === 11000) {
            ctx.body = { code: 409, message: "URL已存在" };
            return;
        }
        ctx.body = { code: 500, message: "新增失败" };
    }
});

// 批量排序更新（管理员）
parseApiRouter.put("/user/parse-apis/sort", authMiddleware, requireAdmin, async (ctx) => {
    const items = Array.isArray(ctx.request.body?.items) ? ctx.request.body.items : [];
    const updates = items
        .map((item) => ({
            id: String(item.id || "").trim(),
            sort: Number(item.sort || 0),
        }))
        .filter((item) => ObjectId.isValid(item.id));
    if (updates.length === 0) {
        ctx.body = { code: 400, message: "无有效排序数据" };
        return;
    }
    const db = await getDb();
    const ops = updates.map((item) => ({
        updateOne: {
            filter: { _id: new ObjectId(item.id) },
            update: { $set: { sort: item.sort, updatedAt: new Date() } },
        },
    }));
    await db.collection("parse_apis").bulkWrite(ops, { ordered: false });
    ctx.body = { code: 200, message: "排序已更新", total: updates.length };
});

// 批量启用/停用（管理员）
parseApiRouter.put("/user/parse-apis/batch", authMiddleware, requireAdmin, async (ctx) => {
    const ids = Array.isArray(ctx.request.body?.ids) ? ctx.request.body.ids : [];
    const enabled = ctx.request.body?.enabled;
    if (enabled === undefined) {
        ctx.body = { code: 400, message: "缺少 enabled 参数" };
        return;
    }
    const validIds = ids.filter((id) => ObjectId.isValid(String(id || "")));
    if (validIds.length === 0) {
        ctx.body = { code: 400, message: "无有效ID" };
        return;
    }
    const db = await getDb();
    const objectIds = validIds.map((id) => new ObjectId(id));
    const result = await db.collection("parse_apis").updateMany(
        { _id: { $in: objectIds } },
        { $set: { enabled: !!enabled, updatedAt: new Date() } },
    );
    ctx.body = { code: 200, message: "更新成功", total: result.modifiedCount };
});

// 更新解析接口（管理员）
parseApiRouter.put("/user/parse-apis/:id", authMiddleware, requireAdmin, async (ctx) => {
    const id = String(ctx.params.id || "").trim();
    if (!ObjectId.isValid(id)) {
        ctx.body = { code: 400, message: "ID不合法" };
        return;
    }
    const { name, url, enabled, sort } = ctx.request.body || {};
    const update = { updatedAt: new Date() };
    if (name !== undefined) update.name = String(name || "").trim();
    if (url !== undefined) update.url = String(url || "").trim();
    if (enabled !== undefined) update.enabled = !!enabled;
    if (sort !== undefined) update.sort = Number(sort || 0);
    const db = await getDb();
    try {
        await db.collection("parse_apis").updateOne({ _id: new ObjectId(id) }, { $set: update });
        ctx.body = { code: 200, message: "更新成功" };
    } catch (err) {
        if (err && err.code === 11000) {
            ctx.body = { code: 409, message: "URL已存在" };
            return;
        }
        ctx.body = { code: 500, message: "更新失败" };
    }
});

// 删除解析接口（管理员）
parseApiRouter.delete("/user/parse-apis/:id", authMiddleware, requireAdmin, async (ctx) => {
    const id = String(ctx.params.id || "").trim();
    if (!ObjectId.isValid(id)) {
        ctx.body = { code: 400, message: "ID不合法" };
        return;
    }
    const db = await getDb();
    await db.collection("parse_apis").deleteOne({ _id: new ObjectId(id) });
    ctx.body = { code: 200, message: "已删除" };
});

// 解析接口列表（普通用户可用）
parseApiRouter.get("/parse-apis", async (ctx) => {
    const db = await getDb();
    let list = await db.collection("parse_apis").find().sort({ sort: 1, createdAt: -1 }).toArray();
    if (!list || list.length === 0) {
        const now = new Date();
        const payload = DEFAULT_PARSE_APIS.map((api, index) => ({
            name: api.name,
            url: api.url,
            enabled: true,
            sort: index + 1,
            createdAt: now,
            updatedAt: now,
        }));
        if (payload.length > 0) {
            await db.collection("parse_apis").insertMany(payload, { ordered: false });
        }
        list = await db.collection("parse_apis").find().sort({ sort: 1, createdAt: -1 }).toArray();
    }
    const data = list
        .filter((item) => item && item.enabled)
        .map((item) => ({
            name: item.name,
            url: item.url,
        }));
    ctx.body = { code: 200, message: "获取成功", data };
});

module.exports = {
    router: parseApiRouter
};