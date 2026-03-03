const fs = require("fs");
const path = require("path");
const Router = require("koa-router");

const router = new Router();

// 全部路由数据
const allRouterInfo = {
    name: "全部接口",
    subtitle: "除了特殊接口外的全部接口列表",
    total: 0,
    data: [],
};

// 根目录
router.get("/", async (ctx) => {
    ctx.redirect("/index.html");
});

function registerRoutes(folderPath, router, allRouterInfo, folderName) {
    try {
        if (fs.existsSync(folderPath)) {
            fs.readdirSync(folderPath)
                .filter((filename) => filename.endsWith(".js") && filename !== "index.js")
                .forEach((filename) => {
                    const routerPath = path.join(folderPath, filename);
                    const routerModule = require(routerPath);
                    // 自动注册路由
                    if (routerModule instanceof Router) {
                        // 写入路由数据
                        if (routerModule?.info) {
                            allRouterInfo.total++;
                            allRouterInfo.data.push({
                                ...routerModule.info,
                                folder: folderName || path.basename(folderPath),
                                file: filename,
                                stack: routerModule.stack,
                            });
                        }
                        // 引用路由
                        router.use("/api", routerModule.routes())
                    }
                });
        }
    } catch (error) {
        console.warn(`注册路由失败 (${folderPath}):`, error.message);
    }
}

// 遍历video文件夹下的所有路由模块
registerRoutes(__dirname + "/video", router, allRouterInfo, "video");

// 遍历hot文件夹下的所有路由模块
registerRoutes(__dirname + "/hot", router, allRouterInfo, "hot");

// 遍历other文件夹下的所有路由模块
registerRoutes(__dirname + "/other", router, allRouterInfo, "other");

// 遍历music文件夹下的所有路由模块
registerRoutes(__dirname + "/music", router, allRouterInfo, "music");

// 遍历bit文件夹下的所有路由模块
registerRoutes(__dirname + "/bit", router, allRouterInfo, "bit");



// 遍历live文件夹下的所有路由模块
registerRoutes(__dirname + "/live", router, allRouterInfo, "live");

// 遍历story文件夹下的所有路由模块
registerRoutes(__dirname + "/story", router, allRouterInfo, "story");

// 遍历v19文件夹下的所有路由模块
registerRoutes(__dirname + "/v19", router, allRouterInfo, "v19");

// 遍历proxy文件夹下的所有路由模块
registerRoutes(__dirname + "/proxy", router, allRouterInfo, "proxy");

// 遍历scheduleJob文件夹下的所有路由模块
registerRoutes(__dirname + "/scheduleJob", router, allRouterInfo, "scheduleJob");

// 遍历user文件夹下的所有路由模块
registerRoutes(__dirname + "/user", router, allRouterInfo, "user");

// 全部接口路由
router.get("/api/all", async (ctx) => {
    console.log("获取全部接口路由");
    if (allRouterInfo.total > 0) {
        ctx.body = {
            code: 200,
            message: "获取成功",
            ...allRouterInfo,
        };
    } else if (allRouterInfo.total === 0) {
        ctx.body = {
            code: 200,
            message: "暂无接口，请添加",
            ...allRouterInfo,
        };
    } else {
        ctx.body = {
            code: 500,
            message: "获取失败",
            ...allRouterInfo,
        };
    }
});

// 文章相关接口
const { ObjectId } = require("mongodb");
const client = require("../utils/mongo");

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

// 获取文章列表
router.get("/api/articles", async (ctx) => {
    try {
        const db = await getDb();
        if (!db) {
            ctx.body = {
                code: 200,
                message: "获取成功",
                data: [],
                total: 0,
                page: 1,
                pageSize: 10
            };
            return;
        }
        
        // 获取分页参数和分类参数
        const page = parseInt(ctx.query.page) || 1;
        const pageSize = parseInt(ctx.query.pageSize) || 10;
        const category = ctx.query.category;
        const skip = (page - 1) * pageSize;
        
        // 构建查询条件
        const query = {};
        if (category) {
            query.category = category;
        }
        // 只显示发布时间小于或等于当前时间的文章（定时发布功能）
        query.publishTime = { $lte: new Date() };
        
        // 获取文章总数
        const total = await db.collection("articles").countDocuments(query);
        
        // 获取分页文章
        const articles = await db.collection("articles").find(query)
            .sort({ isTop: -1, createdAt: -1 })
            .skip(skip)
            .limit(pageSize)
            .toArray();
        
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
            total,
            page,
            pageSize
        };
    } catch (error) {
        console.error("获取文章列表失败:", error);
        ctx.body = {
            code: 200,
            message: "获取成功",
            data: [],
            total: 0,
            page: 1,
            pageSize: 10
        };
    }
});

// 获取用户收藏文章列表
router.get("/api/article/favorites", async (ctx) => {
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
        
        // 检查用户权限
        let isLoggedIn = false;
        let userId = null;
        
        // 尝试获取用户信息
        const token = getTokenFromRequest(ctx);
        if (token) {
            try {
                const session = await db.collection("user_sessions").findOne({ token });
                if (session && session.expiresAt > new Date()) {
                    const user = await db.collection("users").findOne({ _id: session.userId });
                    if (user && !user.isDisabled) {
                        isLoggedIn = true;
                        userId = user._id;
                    }
                }
            } catch (error) {
                console.error("获取用户信息失败:", error);
            }
        }
        
        if (!isLoggedIn) {
            ctx.body = { code: 403, message: "需要登录才能进行此操作" };
            return;
        }
        
        // 获取用户收藏的文章
        const favorites = await db.collection("article_favorites").find({ userId: userId })
            .sort({ createdAt: -1 })
            .toArray();
        
        // 获取文章详情
        const articleIds = favorites.map(fav => fav.articleId);
        const articles = await db.collection("articles").find({ _id: { $in: articleIds } })
            .toArray();
        
        // 构建文章映射
        const articleMap = new Map();
        articles.forEach(article => {
            articleMap.set(String(article._id), article);
        });
        
        // 组装收藏列表
        const favoriteArticles = favorites.map(fav => {
            const article = articleMap.get(String(fav.articleId));
            if (article) {
                return {
                    _id: article._id,
                    title: article.title || "",
                    category: article.category || "",
                    viewCount: article.viewCount || 0,
                    likeCount: article.likeCount || 0,
                    publishTime: article.publishTime,
                    createdAt: fav.createdAt
                };
            }
            return null;
        }).filter(Boolean);
        
        ctx.body = {
            code: 200,
            message: "获取成功",
            data: favoriteArticles
        };
    } catch (error) {
        console.error("获取收藏列表失败:", error);
        ctx.body = {
            code: 200,
            message: "获取成功",
            data: []
        };
    }
});

// 获取用户点赞的文章
router.get("/api/article/likes", async (ctx) => {
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
        
        // 检查用户权限
        let isLoggedIn = false;
        let userId = null;
        
        // 尝试获取用户信息
        const token = getTokenFromRequest(ctx);
        if (token) {
            try {
                const session = await db.collection("user_sessions").findOne({ token });
                if (session && session.expiresAt > new Date()) {
                    const user = await db.collection("users").findOne({ _id: session.userId });
                    if (user && !user.isDisabled) {
                        isLoggedIn = true;
                        userId = user._id;
                    }
                }
            } catch (error) {
                console.error("获取用户信息失败:", error);
            }
        }
        
        if (!isLoggedIn) {
            ctx.body = { code: 403, message: "需要登录才能进行此操作" };
            return;
        }
        
        // 获取用户点赞的文章
        const likes = await db.collection("article_reactions").find({ userId: userId, type: "like" })
            .sort({ createdAt: -1 })
            .toArray();
        
        // 获取文章详情
        const articleIds = likes.map(like => like.articleId);
        const articles = await db.collection("articles").find({ _id: { $in: articleIds } })
            .toArray();
        
        // 构建文章映射
        const articleMap = new Map();
        articles.forEach(article => {
            articleMap.set(String(article._id), article);
        });
        
        // 组装点赞列表
        const likedArticles = likes.map(like => {
            const article = articleMap.get(String(like.articleId));
            if (article) {
                return {
                    _id: article._id,
                    title: article.title || "",
                    publishTime: article.publishTime,
                    createdAt: like.createdAt
                };
            }
            return null;
        }).filter(Boolean);
        
        ctx.body = {
            code: 200,
            message: "获取成功",
            data: likedArticles
        };
    } catch (error) {
        console.error("获取点赞列表失败:", error);
        ctx.body = {
            code: 200,
            message: "获取成功",
            data: []
        };
    }
});

// 获取文章详情
router.get("/api/article/:id", async (ctx) => {
    const id = String(ctx.params.id || "").trim();
    if (!ObjectId.isValid(id)) {
        ctx.body = { code: 400, message: "ID不合法" };
        return;
    }
    try {
        const db = await getDb();
        if (!db) {
            ctx.body = { code: 404, message: "文章不存在" };
            return;
        }
        
        // 增加查看数量
        await db.collection("articles").updateOne(
            { _id: new ObjectId(id) },
            { $inc: { viewCount: 1 } }
        );
        
        const article = await db.collection("articles").findOne({ _id: new ObjectId(id) });
        if (!article) {
            ctx.body = { code: 404, message: "文章不存在" };
            return;
        }
        
        // 检查用户权限
        let userRole = "guest";
        let isLoggedIn = false;
        let userId = null;
        
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
                        userId = user._id;
                    }
                }
            } catch (error) {
                console.error("获取用户信息失败:", error);
            }
        }
        
        // 检查文章权限
        const access = article.access || "public";
        if (access === "registered" && !isLoggedIn) {
            ctx.body = { code: 403, message: "需要登录才能查看此文章" };
            return;
        }
        if (access === "admin" && userRole !== "admin") {
            ctx.body = { code: 403, message: "需要权限才能查看此文章" };
            return;
        }
        
        // 检查用户是否已经点赞或倒赞
        let userReaction = null;
        let isFavorite = false;
        if (isLoggedIn && userId) {
            const reaction = await db.collection("article_reactions").findOne({
                articleId: new ObjectId(id),
                userId: userId
            });
            if (reaction) {
                userReaction = reaction.type;
            }
            
            // 检查用户是否已经收藏
            const favorite = await db.collection("article_favorites").findOne({
                articleId: new ObjectId(id),
                userId: userId
            });
            if (favorite) {
                isFavorite = true;
            }
        }
        
        // 获取上一章和下一章
        let prevArticle = null;
        let nextArticle = null;
        
        // 获取上一章（发布时间在当前文章之前的最近一篇）
        const prev = await db.collection("articles").find({
            publishTime: { $lt: article.publishTime },
            status: "published"
        }).sort({ publishTime: -1 }).limit(1).toArray();
        
        if (prev.length > 0) {
            prevArticle = {
                _id: prev[0]._id,
                title: prev[0].title || ""
            };
        }
        
        // 获取下一章（发布时间在当前文章之后的最近一篇）
        const next = await db.collection("articles").find({
            publishTime: { $gt: article.publishTime },
            status: "published"
        }).sort({ publishTime: 1 }).limit(1).toArray();
        
        if (next.length > 0) {
            nextArticle = {
                _id: next[0]._id,
                title: next[0].title || ""
            };
        }
        
        ctx.body = {
            code: 200,
            message: "获取成功",
            data: {
                _id: article._id,
                title: article.title || "",
                status: article.status || "published",
                content: article.content || "",
                publishTime: article.publishTime,
                category: article.category || "",
                tags: Array.isArray(article.tags) ? article.tags : [],
                isTop: article.isTop || false,
                viewCount: article.viewCount || 0,
                likeCount: article.likeCount || 0,
                dislikeCount: article.dislikeCount || 0,
                userReaction: userReaction,
                isFavorite: isFavorite,
                prevArticle: prevArticle,
                nextArticle: nextArticle,
                createdAt: article.createdAt,
                updatedAt: article.updatedAt
            }
        };
    } catch (error) {
        console.error("获取文章详情失败:", error);
        ctx.body = { code: 404, message: "文章不存在" };
    }
});

// 点赞文章
router.post("/api/article/:id/like", async (ctx) => {
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
        
        // 获取文章信息以检查权限
        const article = await db.collection("articles").findOne({ _id: new ObjectId(id) });
        if (!article) {
            ctx.body = { code: 404, message: "文章不存在" };
            return;
        }
        
        // 检查用户权限
        let userRole = "guest";
        let isLoggedIn = false;
        let userId = null;
        
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
                        userId = user._id;
                    }
                }
            } catch (error) {
                console.error("获取用户信息失败:", error);
            }
        }
        
        // 检查文章权限
        const access = article.access || "public";
        if (access === "registered" && !isLoggedIn) {
            ctx.body = { code: 403, message: "需要登录才能进行此操作" };
            return;
        }
        if (access === "admin" && userRole !== "admin") {
            ctx.body = { code: 403, message: "需要权限才能进行此操作" };
            return;
        }
        
        // 检查用户是否已经点赞或倒赞过
        const existingReaction = await db.collection("article_reactions").findOne({
            articleId: new ObjectId(id),
            userId: userId
        });
        
        if (existingReaction) {
            if (existingReaction.type === "like") {
                ctx.body = { code: 400, message: "您已经点赞过此文章" };
                return;
            } else if (existingReaction.type === "dislike") {
                // 如果用户之前倒赞过，现在改为点赞
                await db.collection("article_reactions").updateOne(
                    { _id: existingReaction._id },
                    { $set: { type: "like" } }
                );
                // 更新文章的点赞和倒赞数量
                await db.collection("articles").updateOne(
                    { _id: new ObjectId(id) },
                    { $inc: { likeCount: 1, dislikeCount: -1 } }
                );
            }
        } else {
            // 记录用户的点赞
            await db.collection("article_reactions").insertOne({
                articleId: new ObjectId(id),
                userId: userId,
                type: "like",
                createdAt: new Date()
            });
            // 增加点赞数量
            await db.collection("articles").updateOne(
                { _id: new ObjectId(id) },
                { $inc: { likeCount: 1 } }
            );
        }
        
        ctx.body = {
            code: 200,
            message: "点赞成功"
        };
    } catch (error) {
        console.error("点赞失败:", error);
        ctx.body = { code: 500, message: "点赞失败" };
    }
});

// 倒赞文章
router.post("/api/article/:id/dislike", async (ctx) => {
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
        
        // 获取文章信息以检查权限
        const article = await db.collection("articles").findOne({ _id: new ObjectId(id) });
        if (!article) {
            ctx.body = { code: 404, message: "文章不存在" };
            return;
        }
        
        // 检查用户权限
        let userRole = "guest";
        let isLoggedIn = false;
        let userId = null;
        
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
                        userId = user._id;
                    }
                }
            } catch (error) {
                console.error("获取用户信息失败:", error);
            }
        }
        
        // 检查文章权限
        const access = article.access || "public";
        if (access === "registered" && !isLoggedIn) {
            ctx.body = { code: 403, message: "需要登录才能进行此操作" };
            return;
        }
        if (access === "admin" && userRole !== "admin") {
            ctx.body = { code: 403, message: "需要权限才能进行此操作" };
            return;
        }
        
        // 检查用户是否已经点赞或倒赞过
        const existingReaction = await db.collection("article_reactions").findOne({
            articleId: new ObjectId(id),
            userId: userId
        });
        
        if (existingReaction) {
            if (existingReaction.type === "dislike") {
                ctx.body = { code: 400, message: "您已经倒赞过此文章" };
                return;
            } else if (existingReaction.type === "like") {
                // 如果用户之前点赞过，现在改为倒赞
                await db.collection("article_reactions").updateOne(
                    { _id: existingReaction._id },
                    { $set: { type: "dislike" } }
                );
                // 更新文章的点赞和倒赞数量
                await db.collection("articles").updateOne(
                    { _id: new ObjectId(id) },
                    { $inc: { likeCount: -1, dislikeCount: 1 } }
                );
            }
        } else {
            // 记录用户的倒赞
            await db.collection("article_reactions").insertOne({
                articleId: new ObjectId(id),
                userId: userId,
                type: "dislike",
                createdAt: new Date()
            });
            // 增加倒赞数量
            await db.collection("articles").updateOne(
                { _id: new ObjectId(id) },
                { $inc: { dislikeCount: 1 } }
            );
        }
        
        ctx.body = {
            code: 200,
            message: "倒赞成功"
        };
    } catch (error) {
        console.error("倒赞失败:", error);
        ctx.body = { code: 500, message: "倒赞失败" };
    }
});

// 收藏文章
router.post("/api/article/:id/favorite", async (ctx) => {
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
        
        // 获取文章信息以检查权限
        const article = await db.collection("articles").findOne({ _id: new ObjectId(id) });
        if (!article) {
            ctx.body = { code: 404, message: "文章不存在" };
            return;
        }
        
        // 检查用户权限
        let userRole = "guest";
        let isLoggedIn = false;
        let userId = null;
        
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
                        userId = user._id;
                    }
                }
            } catch (error) {
                console.error("获取用户信息失败:", error);
            }
        }
        
        if (!isLoggedIn) {
            ctx.body = { code: 403, message: "需要登录才能进行此操作" };
            return;
        }
        
        // 检查文章权限
        const access = article.access || "public";
        if (access === "registered" && !isLoggedIn) {
            ctx.body = { code: 403, message: "需要登录才能进行此操作" };
            return;
        }
        if (access === "admin" && userRole !== "admin") {
            ctx.body = { code: 403, message: "需要权限才能进行此操作" };
            return;
        }
        
        // 检查是否已经收藏
        const existingFavorite = await db.collection("article_favorites").findOne({
            articleId: new ObjectId(id),
            userId: userId
        });
        
        if (existingFavorite) {
            ctx.body = { code: 400, message: "您已经收藏过此文章" };
            return;
        }
        
        // 记录用户的收藏
        await db.collection("article_favorites").insertOne({
            articleId: new ObjectId(id),
            userId: userId,
            createdAt: new Date()
        });
        
        ctx.body = {
            code: 200,
            message: "收藏成功"
        };
    } catch (error) {
        console.error("收藏失败:", error);
        ctx.body = { code: 500, message: "收藏失败" };
    }
});

// 取消收藏文章
router.post("/api/article/:id/unfavorite", async (ctx) => {
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
        
        // 检查用户权限
        let userRole = "guest";
        let isLoggedIn = false;
        let userId = null;
        
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
                        userId = user._id;
                    }
                }
            } catch (error) {
                console.error("获取用户信息失败:", error);
            }
        }
        
        if (!isLoggedIn) {
            ctx.body = { code: 403, message: "需要登录才能进行此操作" };
            return;
        }
        
        // 获取文章信息以检查权限
        const article = await db.collection("articles").findOne({ _id: new ObjectId(id) });
        if (!article) {
            ctx.body = { code: 404, message: "文章不存在" };
            return;
        }
        
        // 检查文章权限
        const access = article.access || "public";
        if (access === "registered" && !isLoggedIn) {
            ctx.body = { code: 403, message: "需要登录才能进行此操作" };
            return;
        }
        if (access === "admin" && userRole !== "admin") {
            ctx.body = { code: 403, message: "需要权限才能进行此操作" };
            return;
        }
        
        // 检查是否已经收藏
        const existingFavorite = await db.collection("article_favorites").findOne({
            articleId: new ObjectId(id),
            userId: userId
        });
        
        if (!existingFavorite) {
            ctx.body = { code: 400, message: "您还没有收藏此文章" };
            return;
        }
        
        // 取消收藏
        await db.collection("article_favorites").deleteOne({
            _id: existingFavorite._id
        });
        
        ctx.body = {
            code: 200,
            message: "取消收藏成功"
        };
    } catch (error) {
        console.error("取消收藏失败:", error);
        ctx.body = { code: 500, message: "取消收藏失败" };
    }
});

// 获取分类列表
router.get("/api/categories", async (ctx) => {
    try {
        const db = await getDb();
        if (!db) {
            ctx.body = {
                code: 200,
                message: "获取成功",
                data: [],
            };
            return;
        }
        const categories = await db.collection("categories").find().sort({ createdAt: -1 }).toArray();
        ctx.body = {
            code: 200,
            message: "获取成功",
            data: categories.map((category) => ({
                _id: category._id,
                name: category.name || "",
                createdAt: category.createdAt,
                updatedAt: category.updatedAt
            })),
        };
    } catch (error) {
        console.error("获取分类列表失败:", error);
        ctx.body = {
            code: 200,
            message: "获取成功",
            data: [],
        };
    }
});

// 404 路由
router.use(async (ctx) => {
    ctx.redirect("/404.html");
});

// 导出路由和路由信息
module.exports = router;
module.exports.allRouterInfo = allRouterInfo;