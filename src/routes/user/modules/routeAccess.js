const Router = require("koa-router");
const { authMiddleware, requireAdmin, getDb } = require("./auth");

const routeAccessRouter = new Router();

// 路由访问控制列表（管理员）
routeAccessRouter.get("/user/route-access", authMiddleware, requireAdmin, async (ctx) => {
    const db = await getDb();
    const list = await db.collection("route_access").find().sort({ updatedAt: -1 }).toArray();
    ctx.body = {
        code: 200,
        message: "获取成功",
        data: list.map((item) => ({
            id: String(item._id),
            method: String(item.method || "*").toUpperCase(),
            path: String(item.path || "").trim() || "/",
            access: String(item.access || "open"),
            note: String(item.note || ""),
            enabled: item.enabled !== false,
            createdAt: item.createdAt ? item.createdAt.getTime() : 0,
            updatedAt: item.updatedAt ? item.updatedAt.getTime() : 0,
        })),
    };
});

// 路由访问统计（管理员）
routeAccessRouter.get("/user/route-access-stats", authMiddleware, requireAdmin, async (ctx) => {
    const db = await getDb();
    const stats = await db.collection("route_access_stats").find().sort({ total: -1 }).toArray();
    ctx.body = {
        code: 200,
        message: "获取成功",
        data: stats.map((item) => ({
            path: String(item.path || "").trim(),
            total: Number(item.total || 0),
            success: Number(item.success || 0),
            failed: Number(item.failed || 0),
            createdAt: item.createdAt ? item.createdAt.getTime() : 0,
            updatedAt: item.updatedAt ? item.updatedAt.getTime() : 0,
        })),
    };
});

// 批量更新路由访问控制（管理员）
routeAccessRouter.put("/user/route-access/batch", authMiddleware, requireAdmin, async (ctx) => {
    const items = Array.isArray(ctx.request.body?.items) ? ctx.request.body.items : [];
    const normalized = items
        .map((item) => ({
            method: String(item.method || "*").trim().toUpperCase() || "*",
            path: String(item.path || "").trim() || "/",
            access: item.access !== undefined ? String(item.access || "open").trim().toLowerCase() : undefined,
            enabled: item.enabled !== undefined ? !!item.enabled : undefined,
            note: item.note !== undefined ? String(item.note || "").trim() : undefined,
        }))
        .filter((item) => !!item.path);
    if (normalized.length === 0) {
        ctx.body = { code: 400, message: "无有效配置" };
        return;
    }
    const now = new Date();
    const db = await getDb();
    const ops = normalized.map((item) => {
        const update = { updatedAt: now };
        if (item.access !== undefined) update.access = item.access;
        if (item.enabled !== undefined) update.enabled = item.enabled;
        if (item.note !== undefined) update.note = item.note;
        const onInsert = { createdAt: now };
        if (item.access === undefined) onInsert.access = "open";
        if (item.enabled === undefined) onInsert.enabled = false;
        return {
            updateOne: {
                filter: { method: item.method, path: item.path },
                update: {
                    $set: update,
                    $setOnInsert: onInsert,
                },
                upsert: true,
            },
        };
    });
    await db.collection("route_access").bulkWrite(ops, { ordered: false });
    ctx.body = { code: 200, message: "更新成功", total: normalized.length };
});

// 可用页面列表（管理员）
routeAccessRouter.get("/user/available-pages", authMiddleware, requireAdmin, async (ctx) => {
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

module.exports = {
    router: routeAccessRouter
};