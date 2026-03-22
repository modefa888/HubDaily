require("dotenv").config();
const Koa = require("koa");
const bodyParser = require("koa-bodyparser");
const cors = require("koa2-cors");
const serve = require("koa-static");
const views = require("koa-views");
const session = require("koa-session");
// koa-session 导出的是对象，实际函数在 default 属性中
const sessionMiddleware = session.default;
const routeAccess = require("./middlewares/routeAccess");

const app = new Koa();
const net = require("net");
const router = require("./routes");
const http = require("http");

// 配置信息
let domain = process.env.ALLOWED_DOMAIN || "*";
let port = process.env.PORT || 8800;

// 解析请求体
app.use(bodyParser());

// 配置会话中间件
app.keys = [process.env.SESSION_SECRET || 'dailyapi-secret-key'];
const sessionConfig = {
    key: 'dailyapi:sess',
    maxAge: 86400000, // 1天
    autoCommit: true,
    overwrite: true,
    httpOnly: true,
    signed: true,
    rolling: false,
    renew: false,
};
app.use(sessionMiddleware(sessionConfig, app));

// 跨域
app.use(
    cors({
        origin: domain,
        credentials: true, // 允许携带凭证
    }),
);

// CORS
app.use(async (ctx, next) => {
    ctx.set("Access-Control-Allow-Origin", domain);
    ctx.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    ctx.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    ctx.set("Access-Control-Allow-Credentials", "true");
    // 处理预检请求
    if (ctx.method === "OPTIONS") {
        ctx.status = 200;
    } else {
        if (domain === "*") {
            await next();
        } else {
            if (ctx.headers.origin === domain || ctx.headers.referer === domain) {
                await next();
            } else {
                ctx.status = 403;
                ctx.body = {
                    code: 403,
                    message: "请通过正确的域名访问",
                };
            }
        }
    }
});

// 静态文件目录
app.use(serve(__dirname + "/../public"));

// 路由访问控制
app.use(routeAccess);

// 使用路由中间件
app.use(router.routes());
app.use(router.allowedMethods());

// 模板引擎配置
app.use(views(__dirname + "/../public", {
  map: {
    html: "html"
  }
}));

// 设置404页面的路由处理程序
app.use(async (ctx) => {
  // 检查是否是API请求
  if (ctx.path.startsWith('/api')) {
    ctx.status = 404;
    ctx.body = {
      code: 404,
      message: 'Not Found'
    };
  } else {
    // 对于普通页面请求，重定向到404.html
    ctx.redirect("/404.html");
  }
});

const isVercel = !!process.env.VERCEL;

// Vercel Serverless 入口
if (isVercel) {
    module.exports = app.callback();
} else {
    // 启动应用程序并监听端口（本地开发）
    const startApp = (port) => {
        const server = http.createServer(app.callback());
        const { initChatWSS } = require("./utils/chatServer");
        initChatWSS(server);
        server.listen(port, () => {
            console.info(`成功在 ${port} 端口上运行`);
            console.info(`地址：http://127.0.0.1:${port}`)
        });
    };

    // 检测端口是否被占用
    const checkPort = (port) => {
        return new Promise((resolve, reject) => {
            const server = net
                .createServer()
                .once("error", (err) => {
                    if (err.code === "EADDRINUSE") {
                        console.info(`端口 ${port} 已被占用, 正在尝试其他端口...`);
                        server.close();
                        resolve(false);
                    } else {
                        reject(err);
                    }
                })
                .once("listening", () => {
                    server.close();
                    resolve(true);
                })
                .listen(port);
        });
    };

    // 尝试启动应用程序
    const tryStartApp = async (port) => {
        let isPortAvailable = await checkPort(port);
        while (!isPortAvailable) {
            port++;
            isPortAvailable = await checkPort(port);
        }
        startApp(port);
    };

    tryStartApp(port);
}