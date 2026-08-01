const Router = require("koa-router");
const fs = require("fs");
const path = require("path");
const { ObjectId } = require("mongodb");
const { authMiddleware, requireAdmin, getDb } = require("./auth");

const smartArchiveRouter = new Router();

const escapeRegex = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const COLLECTION = "smart_archives";

// 油猴脚本文件路径（public/智能存档助手.js）
const SCRIPT_FILE_PATH = path.join(__dirname, "..", "..", "..", "..", "public", "智能存档助手.js");

// 简单 Token 校验（用于油猴脚本上传，可在 .env 配置 SMART_ARCHIVE_TOKEN）
const ARCHIVE_TOKEN = process.env.SMART_ARCHIVE_TOKEN || "";
const verifyArchiveToken = (ctx) => {
    if (!ARCHIVE_TOKEN) return true; // 未配置则不强制校验
    const headerToken = String(ctx.get("x-archive-token") || "").trim();
    if (headerToken) return headerToken === ARCHIVE_TOKEN;
    const authHeader = String(ctx.get("authorization") || "").trim();
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    return match ? match[1].trim() === ARCHIVE_TOKEN : false;
};

// 1. 检查页面是否已存档（油猴脚本使用）
smartArchiveRouter.get("/smart_archive/check_existence", async (ctx) => {
    const pageHref = String(ctx.query.pageHref || "").trim();
    if (!pageHref) {
        ctx.body = { code: 400, message: "缺少 pageHref 参数" };
        return;
    }
    if (!verifyArchiveToken(ctx)) {
        ctx.body = { code: 401, message: "未授权" };
        return;
    }
    try {
        const db = await getDb();
        if (!db) {
            ctx.body = { code: 200, exists: false };
            return;
        }
        const record = await db.collection(COLLECTION).findOne({ pageHref });
        ctx.body = {
            code: 200,
            exists: !!record,
            rating: record?.rating || 0,
            id: record?._id || null,
        };
    } catch (error) {
        console.error("检查存档存在性失败:", error);
        ctx.body = { code: 500, message: "服务器错误" };
    }
});

// 2. 保存/更新存档数据（油猴脚本上传）
smartArchiveRouter.post("/smart_archive/save_data", async (ctx) => {
    if (!verifyArchiveToken(ctx)) {
        ctx.body = { code: 401, message: "未授权" };
        return;
    }
    const body = ctx.request.body || {};
    const pageHref = String(body.pageHref || "").trim();
    if (!pageHref) {
        ctx.body = { code: 400, message: "缺少 pageHref" };
        return;
    }
    const pageTitle = String(body.pageTitle || "").trim();
    const coverImage = String(body.coverImage || "").trim();
    const remark = String(body.remark || "无备注").trim();
    const m3u8Urls = Array.isArray(body.m3u8Urls) ? body.m3u8Urls.filter((u) => String(u || "").trim()) : [];
    const timestamp = body.timestamp ? new Date(body.timestamp) : new Date();
    const now = new Date();

    try {
        const db = await getDb();
        if (!db) {
            ctx.body = { code: 500, message: "数据库连接失败" };
            return;
        }
        // 通过 pageHref 判断是否已存在，存在则更新，不存在则插入
        const existing = await db.collection(COLLECTION).findOne({ pageHref });
        const payload = {
            pageHref,
            pageTitle,
            coverImage,
            m3u8Urls,
            remark,
            sourceTimestamp: timestamp,
            updatedAt: now,
        };
        if (existing) {
            await db.collection(COLLECTION).updateOne(
                { _id: existing._id },
                { $set: payload }
            );
            ctx.body = {
                code: 200,
                message: "更新成功",
                data: { id: existing._id, updated: true },
            };
        } else {
            payload.createdAt = now;
            const result = await db.collection(COLLECTION).insertOne(payload);
            ctx.body = {
                code: 200,
                message: "保存成功",
                data: { id: result.insertedId, updated: false },
            };
        }
    } catch (error) {
        console.error("保存存档失败:", error);
        ctx.body = { code: 500, message: "保存失败" };
    }
});

// 3. 根据 pageHref 删除存档（油猴脚本使用）
smartArchiveRouter.post("/smart_archive/delete_by_href", async (ctx) => {
    if (!verifyArchiveToken(ctx)) {
        ctx.body = { code: 401, message: "未授权" };
        return;
    }
    const body = ctx.request.body || {};
    let pageHref = String(body.pageHref || "").trim();
    // 兼容脚本传入 encodeURIComponent 编码后的值
    try {
        pageHref = decodeURIComponent(pageHref);
    } catch (_) {}
    if (!pageHref) {
        ctx.body = { code: 400, message: "缺少 pageHref" };
        return;
    }
    try {
        const db = await getDb();
        if (!db) {
            ctx.body = { code: 500, message: "数据库连接失败" };
            return;
        }
        const result = await db.collection(COLLECTION).deleteMany({ pageHref });
        ctx.body = {
            code: 200,
            message: "删除成功",
            deletedCount: result.deletedCount || 0,
        };
    } catch (error) {
        console.error("删除存档失败:", error);
        ctx.body = { code: 500, message: "删除失败" };
    }
});

// 4. 更新评分（油猴脚本使用）
smartArchiveRouter.post("/smart_archive/update_rating", async (ctx) => {
    if (!verifyArchiveToken(ctx)) {
        ctx.body = { code: 401, message: "未授权" };
        return;
    }
    const body = ctx.request.body || {};
    const pageHref = String(body.pageHref || "").trim();
    const rating = Math.max(0, Math.min(5, parseInt(body.rating) || 0));
    if (!pageHref) {
        ctx.body = { code: 400, message: "缺少 pageHref" };
        return;
    }
    try {
        const db = await getDb();
        if (!db) {
            ctx.body = { code: 500, message: "数据库连接失败" };
            return;
        }
        const existing = await db.collection(COLLECTION).findOne({ pageHref });
        if (!existing) {
            // 如果不存在，则自动创建一条仅含评分的记录
            const now = new Date();
            const result = await db.collection(COLLECTION).insertOne({
                pageHref,
                pageTitle: "",
                coverImage: "",
                m3u8Urls: [],
                remark: "自动创建（评分）",
                rating,
                sourceTimestamp: now,
                createdAt: now,
                updatedAt: now,
            });
            ctx.body = {
                code: 200,
                message: "评分已记录（新建）",
                data: { id: result.insertedId, rating },
            };
            return;
        }
        await db.collection(COLLECTION).updateOne(
            { _id: existing._id },
            { $set: { rating, updatedAt: new Date() } }
        );
        ctx.body = {
            code: 200,
            message: "评分已更新",
            data: { id: existing._id, rating },
        };
    } catch (error) {
        console.error("更新评分失败:", error);
        ctx.body = { code: 500, message: "更新评分失败" };
    }
});

// ========== 以下为管理后台使用（需要管理员权限） ==========

// 5. 获取存档列表（管理员）
smartArchiveRouter.get("/smart_archive/list", authMiddleware, requireAdmin, async (ctx) => {
    const page = Math.max(1, Number(ctx.query.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(ctx.query.pageSize || 20)));
    const skip = (page - 1) * pageSize;
    const keyword = String(ctx.query.keyword || "").trim();
    const minRating = Number(ctx.query.minRating || 0);
    const sortBy = String(ctx.query.sortBy || "updatedAt");
    const sortOrder = ctx.query.sortOrder === "asc" ? 1 : -1;
    const hasM3u8 = ctx.query.hasM3u8;

    const filter = {};
    if (keyword) {
        const reg = new RegExp(escapeRegex(keyword), "i");
        filter.$or = [
            { pageHref: reg },
            { pageTitle: reg },
            { remark: reg },
            { m3u8Urls: reg },
        ];
    }
    if (minRating > 0) {
        filter.rating = { $gte: minRating };
    }
    if (hasM3u8 === "yes") {
        filter.m3u8Urls = { $ne: [], $not: { $size: 0 } };
    } else if (hasM3u8 === "no") {
        filter.$or = [
            { m3u8Urls: { $size: 0 } },
            { m3u8Urls: { $exists: false } },
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
        const sortOption = { [sortBy]: sortOrder };
        const total = await db.collection(COLLECTION).countDocuments(filter);
        const list = await db
            .collection(COLLECTION)
            .find(filter)
            .sort(sortOption)
            .skip(skip)
            .limit(pageSize)
            .toArray();
        ctx.body = {
            code: 200,
            message: "获取成功",
            data: list.map((item) => ({
                _id: item._id,
                pageHref: item.pageHref || "",
                pageTitle: item.pageTitle || "",
                coverImage: item.coverImage || "",
                m3u8Urls: Array.isArray(item.m3u8Urls) ? item.m3u8Urls : [],
                remark: item.remark || "",
                rating: item.rating || 0,
                sourceTimestamp: item.sourceTimestamp,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
            })),
            page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize),
        };
    } catch (error) {
        console.error("获取存档列表失败:", error);
        ctx.body = { code: 500, message: "获取失败" };
    }
});

// 6. 获取油猴脚本内容（管理员）—— 必须在 :id 路由之前注册，否则 "script" 会被当作 id
smartArchiveRouter.get("/smart_archive/script", authMiddleware, requireAdmin, async (ctx) => {
    try {
        if (!fs.existsSync(SCRIPT_FILE_PATH)) {
            ctx.body = { code: 404, message: "脚本文件不存在", data: { content: "" } };
            return;
        }
        const content = fs.readFileSync(SCRIPT_FILE_PATH, "utf-8");
        ctx.body = {
            code: 200,
            message: "获取成功",
            data: {
                content,
                updatedAt: fs.statSync(SCRIPT_FILE_PATH).mtime,
            },
        };
    } catch (error) {
        console.error("读取脚本失败:", error);
        ctx.body = { code: 500, message: "读取脚本失败" };
    }
});

// 7. 更新油猴脚本内容（管理员）
smartArchiveRouter.put("/smart_archive/script", authMiddleware, requireAdmin, async (ctx) => {
    const { content } = ctx.request.body || {};
    if (typeof content !== "string") {
        ctx.body = { code: 400, message: "缺少脚本内容" };
        return;
    }
    try {
        // 确保目录存在
        const dir = path.dirname(SCRIPT_FILE_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(SCRIPT_FILE_PATH, content, "utf-8");
        ctx.body = {
            code: 200,
            message: "保存成功",
            data: { updatedAt: fs.statSync(SCRIPT_FILE_PATH).mtime },
        };
    } catch (error) {
        console.error("保存脚本失败:", error);
        ctx.body = { code: 500, message: "保存脚本失败" };
    }
});

// 8. 公开下载油猴脚本（无需登录，直接返回文件内容）
smartArchiveRouter.get("/smart_archive/download_script", async (ctx) => {
    try {
        if (!fs.existsSync(SCRIPT_FILE_PATH)) {
            ctx.status = 404;
            ctx.body = { code: 404, message: "脚本文件不存在" };
            return;
        }
        const content = fs.readFileSync(SCRIPT_FILE_PATH, "utf-8");
        ctx.set("Content-Type", "application/javascript; charset=utf-8");
        ctx.set("Content-Disposition", `attachment; filename="smart-archive.user.js"`);
        ctx.body = content;
    } catch (error) {
        console.error("下载脚本失败:", error);
        ctx.status = 500;
        ctx.body = { code: 500, message: "下载脚本失败" };
    }
});

// 9. 获取单条存档详情（管理员）
smartArchiveRouter.get("/smart_archive/:id", authMiddleware, requireAdmin, async (ctx) => {
    const id = String(ctx.params.id || "").trim();
    if (!ObjectId.isValid(id)) {
        ctx.body = { code: 400, message: "ID不合法" };
        return;
    }
    try {
        const db = await getDb();
        if (!db) {
            ctx.body = { code: 404, message: "存档不存在" };
            return;
        }
        const record = await db.collection(COLLECTION).findOne({ _id: new ObjectId(id) });
        if (!record) {
            ctx.body = { code: 404, message: "存档不存在" };
            return;
        }
        ctx.body = {
            code: 200,
            message: "获取成功",
            data: {
                _id: record._id,
                pageHref: record.pageHref || "",
                pageTitle: record.pageTitle || "",
                coverImage: record.coverImage || "",
                m3u8Urls: Array.isArray(record.m3u8Urls) ? record.m3u8Urls : [],
                remark: record.remark || "",
                rating: record.rating || 0,
                sourceTimestamp: record.sourceTimestamp,
                createdAt: record.createdAt,
                updatedAt: record.updatedAt,
            },
        };
    } catch (error) {
        console.error("获取存档详情失败:", error);
        ctx.body = { code: 500, message: "获取失败" };
    }
});

// 7. 更新存档（管理员）
smartArchiveRouter.put("/smart_archive/:id", authMiddleware, requireAdmin, async (ctx) => {
    const id = String(ctx.params.id || "").trim();
    if (!ObjectId.isValid(id)) {
        ctx.body = { code: 400, message: "ID不合法" };
        return;
    }
    const body = ctx.request.body || {};
    const updateFields = {};
    if (body.pageHref !== undefined) updateFields.pageHref = String(body.pageHref || "").trim();
    if (body.pageTitle !== undefined) updateFields.pageTitle = String(body.pageTitle || "").trim();
    if (body.coverImage !== undefined) updateFields.coverImage = String(body.coverImage || "").trim();
    if (body.remark !== undefined) updateFields.remark = String(body.remark || "").trim();
    if (body.rating !== undefined) {
        updateFields.rating = Math.max(0, Math.min(5, parseInt(body.rating) || 0));
    }
    if (body.m3u8Urls !== undefined) {
        updateFields.m3u8Urls = Array.isArray(body.m3u8Urls)
            ? body.m3u8Urls.map((u) => String(u || "").trim()).filter(Boolean)
            : [];
    }
    if (Object.keys(updateFields).length === 0) {
        ctx.body = { code: 400, message: "没有需要更新的字段" };
        return;
    }
    updateFields.updatedAt = new Date();
    try {
        const db = await getDb();
        if (!db) {
            ctx.body = { code: 500, message: "数据库连接失败" };
            return;
        }
        const result = await db.collection(COLLECTION).updateOne(
            { _id: new ObjectId(id) },
            { $set: updateFields }
        );
        if (result.matchedCount === 0) {
            ctx.body = { code: 404, message: "存档不存在" };
            return;
        }
        ctx.body = { code: 200, message: "更新成功", data: { id } };
    } catch (error) {
        console.error("更新存档失败:", error);
        ctx.body = { code: 500, message: "更新失败" };
    }
});

// 8. 删除存档（管理员）
smartArchiveRouter.delete("/smart_archive/:id", authMiddleware, requireAdmin, async (ctx) => {
    const id = String(ctx.params.id || "").trim();
    if (!ObjectId.isValid(id)) {
        ctx.body = { code: 400, message: "ID不合法" };
        return;
    }
    try {
        const db = await getDb();
        if (!db) {
            ctx.body = { code: 500, message: "数据库连接失败" };
            return;
        }
        const result = await db.collection(COLLECTION).deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) {
            ctx.body = { code: 404, message: "存档不存在" };
            return;
        }
        ctx.body = { code: 200, message: "删除成功" };
    } catch (error) {
        console.error("删除存档失败:", error);
        ctx.body = { code: 500, message: "删除失败" };
    }
});

// 9. 批量删除存档（管理员）
smartArchiveRouter.post("/smart_archive/batch_delete", authMiddleware, requireAdmin, async (ctx) => {
    const ids = Array.isArray(ctx.request.body?.ids) ? ctx.request.body.ids : [];
    const objectIds = ids
        .map((id) => String(id || "").trim())
        .filter((id) => ObjectId.isValid(id))
        .map((id) => new ObjectId(id));
    if (objectIds.length === 0) {
        ctx.body = { code: 400, message: "未提供有效的ID" };
        return;
    }
    try {
        const db = await getDb();
        if (!db) {
            ctx.body = { code: 500, message: "数据库连接失败" };
            return;
        }
        const result = await db.collection(COLLECTION).deleteMany({
            _id: { $in: objectIds },
        });
        ctx.body = {
            code: 200,
            message: "批量删除成功",
            deletedCount: result.deletedCount || 0,
        };
    } catch (error) {
        console.error("批量删除存档失败:", error);
        ctx.body = { code: 500, message: "批量删除失败" };
    }
});

// 10. 统计信息（管理员）
smartArchiveRouter.get("/smart_archive/stats/summary", authMiddleware, requireAdmin, async (ctx) => {
    try {
        const db = await getDb();
        if (!db) {
            ctx.body = {
                code: 200,
                data: { total: 0, withM3u8: 0, withCover: 0, averageRating: 0, ratingDistribution: [] },
            };
            return;
        }
        const total = await db.collection(COLLECTION).countDocuments({});
        const withM3u8 = await db.collection(COLLECTION).countDocuments({
            m3u8Urls: { $ne: [], $not: { $size: 0 } },
        });
        const withCover = await db.collection(COLLECTION).countDocuments({
            coverImage: { $ne: "" },
        });
        const ratingAgg = await db.collection(COLLECTION).aggregate([
            { $group: { _id: null, avg: { $avg: "$rating" } } },
        ]).toArray();
        const averageRating = ratingAgg[0]?.avg || 0;
        const ratingDistribution = await db.collection(COLLECTION).aggregate([
            { $group: { _id: "$rating", count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
        ]).toArray();
        ctx.body = {
            code: 200,
            data: {
                total,
                withM3u8,
                withCover,
                averageRating: Number(averageRating.toFixed(2)),
                ratingDistribution: ratingDistribution.map((r) => ({
                    rating: r._id || 0,
                    count: r.count,
                })),
            },
        };
    } catch (error) {
        console.error("获取统计信息失败:", error);
        ctx.body = { code: 500, message: "获取统计信息失败" };
    }
});

module.exports = { router: smartArchiveRouter };
