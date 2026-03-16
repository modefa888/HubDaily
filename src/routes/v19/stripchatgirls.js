const Router = require("koa-router");
const stripchatgirlsRouter = new Router();

const axiosClient = require("../../utils/axiosClient");
const { get, set } = require("../../utils/cacheData");

/* ================== 基础信息 ================== */

const routerInfo = {
    name: "stripchatgirls",
    title: "stripchatgirls",
    subtitle: "Models API",
    category: ""
};

const cgHost = "https://zh.stripchatgirls.com/";
const cacheKey = "stripchatgirls";
let updateTime = new Date().toISOString();

/* ================== Models API 代理 ================== */

stripchatgirlsRouter.get("/stripchatgirls/models", async (ctx) => {
    const { 
        removeShows = false, 
        recInFeatured = false, 
        limit = 60, 
        offset = 0, 
        primaryTag = "girls", 
        filterGroupTags = '["tagLanguageChinese"]', 
        sortBy = "stripRanking", 
        parentTag = "tagLanguageChinese", 
        userRole = "user", 
        nic = true, 
        byw = false, 
        rcmGrp = "A", 
        rbCnGr = true, 
        iem = true, 
        decMb = true, 
        ctryTop = true, 
        mlfv = false, 
        rectf = false, 
        uniq = Date.now() 
    } = ctx.query;

    const apiUrl = `https://zh.stripchatgirls.com/api/front/models`;
    const params = {
        removeShows,
        recInFeatured,
        limit,
        offset,
        primaryTag,
        filterGroupTags,
        sortBy,
        parentTag,
        userRole,
        nic,
        byw,
        rcmGrp,
        rbCnGr,
        iem,
        decMb,
        ctryTop,
        mlfv,
        rectf,
        uniq
    };

    const key = `${cacheKey}_models_${limit}_${offset}_${sortBy}`;

    try {
        let data = await get(key);
        const from = data ? "cache" : "server";

        if (!data) {
            const res = await axiosClient({
                url: apiUrl,
                params,
                useProxy: true,
                headers: {
                    Referer: cgHost,
                    "Content-Type": "application/json"
                }
            });
            data = res.data;
            updateTime = new Date().toISOString();
            await set(key, data);
        }

        ctx.body = {
            code: 200,
            message: "获取成功",
            ...routerInfo,
            from,
            updateTime,
            data
        };
    } catch (error) {
        console.error(`[stripchatgirls][MODELS_API_ERROR]`, error);
        ctx.status = 403;
        ctx.body = { code: 403, message: "目标站点访问受限（请检查代理）" };
    }
});

stripchatgirlsRouter.info = routerInfo;
module.exports = stripchatgirlsRouter;
