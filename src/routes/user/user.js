const Router = require("koa-router");

const userRouter = new Router();

// 接口信息
const routerInfo = { name: "用户系统", title: "用户管理", subtitle: "注册/登录/管理" };
userRouter.info = routerInfo;

// 导入模块路由
const authModule = require("./modules/auth");
const userModule = require("./modules/user");
const articleModule = require("./modules/article");
const announcementModule = require("./modules/announcement");
const feedbackModule = require("./modules/feedback");
const officialApiModule = require("./modules/officialApi");
const parseApiModule = require("./modules/parseApi");
const routeAccessModule = require("./modules/routeAccess");
const favoriteModule = require("./modules/favorite");
const shareModule = require("./modules/share");
const captchaModule = require("./modules/captcha");
const navigationModule = require("./modules/navigation");
const tvModule = require("./modules/tv");
const tvM3u8Module = require("./modules/tv.m3u8");

// 注册模块路由 - 确保具体路由先于通配符路由
// 先注册验证码模块（公开接口）
userRouter.use(captchaModule.router.routes(), captchaModule.router.allowedMethods());
// 然后注册其他模块
userRouter.use(authModule.router.routes(), authModule.router.allowedMethods());
userRouter.use(articleModule.router.routes(), articleModule.router.allowedMethods());
userRouter.use(announcementModule.router.routes(), announcementModule.router.allowedMethods());
userRouter.use(feedbackModule.router.routes(), feedbackModule.router.allowedMethods());
userRouter.use(officialApiModule.router.routes(), officialApiModule.router.allowedMethods());
userRouter.use(parseApiModule.router.routes(), parseApiModule.router.allowedMethods());
userRouter.use(routeAccessModule.router.routes(), routeAccessModule.router.allowedMethods());
userRouter.use(favoriteModule.router.routes(), favoriteModule.router.allowedMethods());
userRouter.use(shareModule.router.routes(), shareModule.router.allowedMethods());
userRouter.use(navigationModule.router.routes(), navigationModule.router.allowedMethods());
userRouter.use(tvModule.router.routes(), tvModule.router.allowedMethods());
userRouter.use(tvM3u8Module.routes(), tvM3u8Module.allowedMethods());
// 最后注册包含通配符的路由模块
userRouter.use(userModule.router.routes(), userModule.router.allowedMethods());

module.exports = userRouter;