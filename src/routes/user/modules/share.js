const Router = require("koa-router");
const { ObjectId } = require("mongodb");
const { authMiddleware, requireAdmin, getDb } = require("./auth");

const shareRouter = new Router();

const parseExpireSeconds = (value) => {
    const seconds = Number(value || 0);
    if (!Number.isFinite(seconds) || seconds < 0) return 0;
    return Math.floor(seconds);
};

const toBase64Url = (buf) =>
    buf
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");

const SHARE_ID_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const buildShortShareId = (length = 10) => {
    const crypto = require("crypto");
    const bytes = crypto.randomBytes(length);
    let out = "";
    for (let i = 0; i < length; i += 1) {
        out += SHARE_ID_CHARS[bytes[i] % SHARE_ID_CHARS.length];
    }
    return out;
};

const generateShareId = async (db, attempts = 8) => {
    for (let i = 0; i < attempts; i += 1) {
        const candidate = `s_${buildShortShareId(10)}`; // s_ + 10 chars
        const exists = await db.collection("user_shares").findOne({ shareId: candidate });
        if (!exists) return candidate;
    }
    return `s_${buildShortShareId(12)}`;
};

const buildExpiresAt = (seconds, fallbackMs) => {
    const safeSeconds = parseExpireSeconds(seconds);
    if (safeSeconds > 0) {
        return new Date(Date.now() + safeSeconds * 1000);
    }
    const fallback = Number(fallbackMs || 0);
    if (Number.isFinite(fallback) && fallback > 0) {
        return new Date(fallback);
    }
    return null;
};

// 获取分享列表（登录用户）
shareRouter.get("/user/shares", authMiddleware, async (ctx) => {
    const db = await getDb();
    const userId = ctx.state.user._id;
    const shares = await db
        .collection("user_shares")
        .find({ userId })
        .sort({ createdAt: -1 })
        .toArray();
    const now = Date.now();
    const data = shares.map((item) => ({
        id: String(item._id),
        shareId: item.shareId,
        title: item.title || "",
        url: item.url || "", 
        allEpisodesUrl: item.allEpisodesUrl || item.url || "",
        pic: item.pic || "",
        source: item.source || "",
        desc: item.desc || "",
        class: item.class || "",
        actor: item.actor || "",
        year: item.year || "",
        remarks: item.remarks || "",
        expireSeconds: item.expireSeconds || 0,
        expiresAt: item.expiresAt ? item.expiresAt.getTime() : 0,
        createdAt: item.createdAt ? item.createdAt.getTime() : 0,
        updatedAt: item.updatedAt ? item.updatedAt.getTime() : 0,
        isExpired: item.expiresAt ? item.expiresAt < new Date() : false,
        viewCount: item.viewCount || 0,
    }));
    ctx.body = { code: 200, message: "获取成功", data };
});

// 获取分享列表（管理员指定用户）
shareRouter.get("/user/:id/shares", authMiddleware, requireAdmin, async (ctx) => {
    const { id } = ctx.params;
    if (!ObjectId.isValid(id)) {
        ctx.body = { code: 400, message: "用户ID不合法" };
        return;
    }
    const db = await getDb();
    const shares = await db
        .collection("user_shares")
        .find({ userId: new ObjectId(id) })
        .sort({ createdAt: -1 })
        .toArray();
    const now = Date.now();
    const data = shares.map((item) => ({
        id: String(item._id),
        shareId: item.shareId,
        title: item.title || "",
        url: item.url || "",
        allEpisodesUrl: item.allEpisodesUrl || item.url || "",
        pic: item.pic || "",
        source: item.source || "",
        desc: item.desc || "",
        class: item.class || "",
        actor: item.actor || "",
        year: item.year || "",
        remarks: item.remarks || "",
        expireSeconds: item.expireSeconds || 0,
        expiresAt: item.expiresAt ? item.expiresAt.getTime() : 0,
        createdAt: item.createdAt ? item.createdAt.getTime() : 0,
        updatedAt: item.updatedAt ? item.updatedAt.getTime() : 0,
        isExpired: item.expiresAt ? item.expiresAt < new Date() : false,
        viewCount: item.viewCount || 0,
    }));
    ctx.body = { code: 200, message: "获取成功", data };
});

// 删除分享（登录用户）
shareRouter.delete("/user/shares", authMiddleware, async (ctx) => {
    const { shareId } = ctx.request.body || {};
    const safeShareId = String(shareId || "").trim();
    if (!safeShareId) {
        ctx.body = { code: 400, message: "缺少 shareId 参数" };
        return;
    }
    const db = await getDb();
    await db.collection("user_shares").deleteOne({ shareId, userId: ctx.state.user._id });
    ctx.body = { code: 200, message: "已删除" };
});

// 删除分享（管理员指定用户）
shareRouter.delete("/user/:id/shares", authMiddleware, requireAdmin, async (ctx) => {
    const { id } = ctx.params;
    if (!ObjectId.isValid(id)) {
        ctx.body = { code: 400, message: "用户ID不合法" };
        return;
    }
    const shareId = String(ctx.request.body?.shareId || "").trim();
    if (!shareId) {
        ctx.body = { code: 400, message: "缺少 shareId 参数" };
        return;
    }
    const db = await getDb();
    await db.collection("user_shares").deleteOne({ userId: new ObjectId(id), shareId });
    ctx.body = { code: 200, message: "已删除" };
});

// 创建或更新分享（登录用户）
shareRouter.post("/user/share", authMiddleware, async (ctx) => {
    const { shareId, title, url, allEpisodesUrl, pic, source, expireSeconds, desc, class: videoClass, actor, year, remarks } = ctx.request.body || {};
    const safeUrl = String(url || "").trim();
    if (!safeUrl) {
        ctx.body = { code: 400, message: "分享地址不能为空" };
        return;
    }
    const safeTitle = String(title || "").trim();
    const safeAllEpisodesUrl = String(allEpisodesUrl || url || "").trim();
    const safePic = String(pic || "").trim();
    const safeSource = String(source || "").trim();
    const safeDesc = String(desc || "").trim();
    const safeClass = String(videoClass || "").trim();
    const safeActor = String(actor || "").trim();
    const safeYear = String(year || "").trim();
    const safeRemarks = String(remarks || "").trim();
    const safeExpireSeconds = parseExpireSeconds(expireSeconds);
    const now = new Date();
    const db = await getDb();
    const expiresAt = buildExpiresAt(safeExpireSeconds);
    
    let finalShareId = shareId;
    if (!finalShareId) {
        // 生成新的分享ID
        finalShareId = await generateShareId(db);
        // 创建新分享
        const payload = {
            shareId: finalShareId,
            userId: ctx.state.user._id,
            title: safeTitle,
            url: safeUrl,
            allEpisodesUrl: safeAllEpisodesUrl,
            pic: safePic,
            source: safeSource,
            desc: safeDesc,
            class: safeClass,
            actor: safeActor,
            year: safeYear,
            remarks: safeRemarks,
            expireSeconds: safeExpireSeconds,
            expiresAt,
            viewCount: 0,
            createdAt: now,
            updatedAt: now,
        };
        await db.collection("user_shares").insertOne(payload);
        ctx.body = {
            code: 200,
            message: "分享成功",
            data: {
                shareId: finalShareId,
                url: safeUrl,
                allEpisodesUrl: safeAllEpisodesUrl,
                title: safeTitle,
                pic: safePic,
                source: safeSource,
                desc: safeDesc,
                class: safeClass,
                actor: safeActor,
                year: safeYear,
                remarks: safeRemarks,
                expireSeconds: safeExpireSeconds,
                expiresAt: expiresAt ? expiresAt.getTime() : 0,
                updatedAt: now.getTime(),
                createdAt: now.getTime(),
            },
        };
    } else {
        // 先尝试更新现有分享
        const updateResult = await db.collection("user_shares").updateOne(
            { shareId: finalShareId, userId: ctx.state.user._id },
            {
                $set: {
                    title: safeTitle,
                    url: safeUrl,
                    allEpisodesUrl: safeAllEpisodesUrl,
                    pic: safePic,
                    source: safeSource,
                    desc: safeDesc,
                    class: safeClass,
                    actor: safeActor,
                    year: safeYear,
                    remarks: safeRemarks,
                    expireSeconds: safeExpireSeconds,
                    expiresAt,
                    updatedAt: now,
                },
            }
        );
        
        if (updateResult.matchedCount === 0) {
            // 如果分享不存在，创建新的分享
            const payload = {
                shareId: finalShareId,
                userId: ctx.state.user._id,
                title: safeTitle,
                url: safeUrl,
                allEpisodesUrl: safeAllEpisodesUrl,
                pic: safePic,
                source: safeSource,
                desc: safeDesc,
                class: safeClass,
                actor: safeActor,
                year: safeYear,
                remarks: safeRemarks,
                expireSeconds: safeExpireSeconds,
                expiresAt,
                viewCount: 0,
                createdAt: now,
                updatedAt: now,
            };
            await db.collection("user_shares").insertOne(payload);
            ctx.body = {
                code: 200,
                message: "分享成功",
                data: {
                    shareId: finalShareId,
                    url: safeUrl,
                    allEpisodesUrl: safeAllEpisodesUrl,
                    title: safeTitle,
                    pic: safePic,
                    source: safeSource,
                    desc: safeDesc,
                    class: safeClass,
                    actor: safeActor,
                    year: safeYear,
                    remarks: safeRemarks,
                    expireSeconds: safeExpireSeconds,
                    expiresAt: expiresAt ? expiresAt.getTime() : 0,
                    updatedAt: now.getTime(),
                    createdAt: now.getTime(),
                },
            };
        } else {
            // 更新成功
            ctx.body = {
                code: 200,
                message: "修改成功",
                data: {
                    shareId: finalShareId,
                    url: safeUrl,
                    allEpisodesUrl: safeAllEpisodesUrl,
                    title: safeTitle,
                    pic: safePic,
                    source: safeSource,
                    desc: safeDesc,
                    class: safeClass,
                    actor: safeActor,
                    year: safeYear,
                    remarks: safeRemarks,
                    expireSeconds: safeExpireSeconds,
                    expiresAt: expiresAt ? expiresAt.getTime() : 0,
                    updatedAt: now.getTime(),
                },
            };
        }
    }
});

// 更新分享有效期（登录用户）
shareRouter.put("/user/shares/:shareId", authMiddleware, async (ctx) => {
    const { shareId } = ctx.params;
    const { expireSeconds } = ctx.request.body || {};
    const safeShareId = String(shareId || "").trim();
    if (!safeShareId) {
        ctx.body = { code: 400, message: "缺少 shareId 参数" };
        return;
    }
    const safeExpireSeconds = parseExpireSeconds(expireSeconds);
    const now = new Date();
    const db = await getDb();
    const updateResult = await db.collection("user_shares").updateOne(
        { shareId: safeShareId, userId: ctx.state.user._id },
        {
            $set: {
                expireSeconds: safeExpireSeconds,
                expiresAt: buildExpiresAt(safeExpireSeconds),
                updatedAt: now
            }
        }
    );
    if (updateResult.matchedCount === 0) {
        ctx.body = { code: 404, message: "分享不存在" };
        return;
    }
    ctx.body = { code: 200, message: "更新成功" };
});

module.exports = {
    router: shareRouter
};