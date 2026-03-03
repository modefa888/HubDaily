const Router = require("koa-router");
const svgCaptcha = require("svg-captcha");

const captchaRouter = new Router();

// 生成图形验证码
captchaRouter.get("/user/captcha", async (ctx) => {
    try {
        // 生成验证码
        const captcha = svgCaptcha.create({
            size: 6, // 验证码长度
            noise: 3, // 干扰线条数量
            color: true, // 彩色验证码
            background: "#f0f0f0", // 背景色
            width: 120, // 宽度
            height: 40 // 高度
        });
        
        // 将验证码文本存储在 session 中
        if (ctx.session) {
            ctx.session.captcha = captcha.text.toLowerCase();
        }
        
        // 设置响应头
        ctx.type = "image/svg+xml";
        ctx.body = captcha.data;
    } catch (error) {
        console.error("生成验证码失败:", error);
        ctx.status = 500;
        ctx.body = { code: 500, message: "生成验证码失败" };
    }
});

// 验证图形验证码
captchaRouter.post("/user/verify-captcha", async (ctx) => {
    const { captcha } = ctx.request.body || {};
    const safeCaptcha = String(captcha || "").trim().toLowerCase();
    
    if (!safeCaptcha) {
        ctx.body = { code: 400, message: "验证码不能为空" };
        return;
    }
    
    try {
        if (!ctx.session || !ctx.session.captcha) {
            ctx.body = { code: 400, message: "验证码已过期" };
            return;
        }
        
        if (safeCaptcha !== ctx.session.captcha) {
            ctx.body = { code: 400, message: "验证码错误" };
            return;
        }
        
        // 验证码验证成功后清除，防止重复使用
        delete ctx.session.captcha;
        
        ctx.body = { code: 200, message: "验证码验证成功" };
    } catch (error) {
        console.error("验证验证码失败:", error);
        ctx.status = 500;
        ctx.body = { code: 500, message: "验证验证码失败" };
    }
});

module.exports = {
    router: captchaRouter
};
