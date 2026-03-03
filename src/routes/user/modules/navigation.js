const Router = require("koa-router");
const { getUserCollection } = require("../../../utils/mongo");

const navigationRouter = new Router();

// 获取导航设置
navigationRouter.get("/user/navigation-settings", async (ctx) => {
    try {
        const userCollection = await getUserCollection();
        
        // 查找导航设置文档
        const settings = await userCollection.findOne({ type: "navigationSettings" });
        
        if (settings) {
            ctx.body = {
                code: 200,
                message: "获取导航设置成功",
                data: settings
            };
        } else {
            // 如果没有设置，返回默认设置
            const defaultSettings = {
                siteTitle: "SmartNav",
                siteDescription: "让上网更高效",
                theme: "light",
                copyright: "© 2024 SmartNav - 智能网站导航",
                categories: [
                    {
                        category: "搜索引擎", links: [
                            { url: "/J1", name: "91", icon: "fa-google" },
                            { url: "/video", name: "视频", icon: "fa-video-camera" },
                        ]
                    },
                    {
                        category: "解析", links: [
                            { url: "/play", name: "解析", icon: "fa-magic" },
                        ]
                    },
                    {
                        category: "吃瓜", links: [
                            { url: "/cg", name: "吃瓜", icon: "fa-newspaper-o" },
                        ]
                    }
                ]
            };
            
            // 保存默认设置
            await userCollection.insertOne({
                type: "navigationSettings",
                ...defaultSettings
            });
            
            ctx.body = {
                code: 200,
                message: "获取导航设置成功",
                data: defaultSettings
            };
        }
    } catch (error) {
        console.error("获取导航设置失败:", error);
        ctx.body = {
            code: 500,
            message: "获取导航设置失败"
        };
    }
});

// 更新导航设置
navigationRouter.put("/user/navigation-settings", async (ctx) => {
    try {
        const userCollection = await getUserCollection();
        const { siteTitle, siteDescription, theme, copyright, categories } = ctx.request.body;
        
        // 更新或插入导航设置
        const updatedSettings = await userCollection.findOneAndUpdate(
            { type: "navigationSettings" },
            {
                $set: {
                    siteTitle,
                    siteDescription,
                    theme,
                    copyright,
                    categories,
                    updatedAt: new Date()
                }
            },
            { upsert: true, returnDocument: "after" }
        );
        
        // 确保正确获取更新后的数据
        const data = updatedSettings.value || updatedSettings;
        
        ctx.body = {
            code: 200,
            message: "保存导航设置成功",
            data: data
        };
    } catch (error) {
        console.error("保存导航设置失败:", error);
        ctx.body = {
            code: 500,
            message: "保存导航设置失败"
        };
    }
});

module.exports = {
    router: navigationRouter
};