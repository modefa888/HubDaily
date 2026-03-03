// 直接解析文件内容来检查路由路径，避免加载模块
const fs = require('fs');

function extractRoutes(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const routes = [];
    
    // 匹配路由定义，如 authRouter.post("/user/register", ...)
    const routeRegex = /(authRouter|userRouter)\.(get|post|put|delete)\s*\(\s*"([^"]+)"/g;
    let match;
    
    while ((match = routeRegex.exec(content)) !== null) {
        routes.push(match[3]);
    }
    
    return routes;
}

const authRoutes = extractRoutes('./src/routes/user/modules/auth.js');
const userRoutes = extractRoutes('./src/routes/user/modules/user.js');

console.log('Auth routes:');
authRoutes.forEach(route => console.log('  -', route));

console.log('\nUser routes:');
userRoutes.forEach(route => console.log('  -', route));
