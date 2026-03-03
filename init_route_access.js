// 默认路由访问控制规则
const defaultRules = [
    // 公开接口
    { path: '/', method: '*', access: 'open', enabled: true, note: '首页' },
    { path: '/all', method: 'GET', access: 'open', enabled: true, note: '全部接口列表' },
    { path: '/user/login', method: 'POST', access: 'open', enabled: true, note: '用户登录' },
    { path: '/user/register', method: 'POST', access: 'open', enabled: true, note: '用户注册' },
    { path: '/api/articles', method: 'GET', access: 'open', enabled: true, note: '文章列表' },
    { path: '/api/article/:id', method: 'GET', access: 'open', enabled: true, note: '文章详情' },
    { path: '/api/categories', method: 'GET', access: 'open', enabled: true, note: '分类列表' },
    
    // 需要登录的接口
    { path: '/user/profile', method: 'GET', access: 'user', enabled: true, note: '用户信息' },
    { path: '/user/logout', method: 'POST', access: 'user', enabled: true, note: '用户登出' },
    { path: '/user/favorites', method: 'GET', access: 'user', enabled: true, note: '用户收藏' },
    { path: '/user/favorites', method: 'POST', access: 'user', enabled: true, note: '添加收藏' },
    { path: '/user/favorites', method: 'DELETE', access: 'user', enabled: true, note: '删除收藏' },
    { path: '/user/favorites/all', method: 'DELETE', access: 'user', enabled: true, note: '清空收藏' },
    { path: '/user/shares', method: 'GET', access: 'user', enabled: true, note: '用户分享' },
    { path: '/user/feedbacks', method: 'POST', access: 'user', enabled: true, note: '用户反馈' },
    { path: '/user/feedbacks', method: 'GET', access: 'admin', enabled: true, note: '用户反馈列表' },
    { path: '/user/feedbacks/:id', method: 'DELETE', access: 'admin', enabled: true, note: '删除用户反馈' },
    { path: '/user/feedbacks/self', method: 'GET', access: 'user', enabled: true, note: '获取自己的反馈' },
    { path: '/user/feedbacks/:id/reply', method: 'POST', access: 'user', enabled: true, note: '回复反馈' },
    { path: '/api/article/:id/like', method: 'POST', access: 'user', enabled: true, note: '点赞文章' },
    { path: '/api/article/:id/dislike', method: 'POST', access: 'user', enabled: true, note: '倒赞文章' },
    
    // 需要管理员权限的接口
    { path: '/user/list', method: 'GET', access: 'admin', enabled: true, note: '用户列表' },
    { path: '/user/pages', method: 'GET', access: 'admin', enabled: true, note: '页面列表' },
    { path: '/user/online', method: 'GET', access: 'admin', enabled: true, note: '在线用户' },
    { path: '/user/official-apis', method: 'GET', access: 'admin', enabled: true, note: '官方推荐接口列表' },
    { path: '/user/official-apis', method: 'POST', access: 'admin', enabled: true, note: '新增官方推荐接口' },
    { path: '/user/official-apis/sort', method: 'PUT', access: 'admin', enabled: true, note: '批量排序更新' },
    { path: '/user/official-apis/batch', method: 'PUT', access: 'admin', enabled: true, note: '批量启用/停用' },
    { path: '/user/official-apis/:id', method: 'PUT', access: 'admin', enabled: true, note: '更新官方推荐接口' },
    { path: '/user/official-apis/:id', method: 'DELETE', access: 'admin', enabled: true, note: '删除官方推荐接口' },
    { path: '/user/parse-apis', method: 'GET', access: 'admin', enabled: true, note: '解析接口列表' },
    { path: '/user/parse-apis', method: 'POST', access: 'admin', enabled: true, note: '新增解析接口' },
    { path: '/user/parse-apis/sort', method: 'PUT', access: 'admin', enabled: true, note: '批量排序更新' },
    { path: '/user/parse-apis/batch', method: 'PUT', access: 'admin', enabled: true, note: '批量启用/停用' },
    { path: '/user/parse-apis/:id', method: 'PUT', access: 'admin', enabled: true, note: '更新解析接口' },
    { path: '/user/parse-apis/:id', method: 'DELETE', access: 'admin', enabled: true, note: '删除解析接口' },
    { path: '/user/route-access', method: 'GET', access: 'admin', enabled: true, note: '路由访问控制列表' },
    { path: '/user/route-access-stats', method: 'GET', access: 'admin', enabled: true, note: '路由访问统计' },
    { path: '/user/route-access/batch', method: 'PUT', access: 'admin', enabled: true, note: '批量更新路由访问控制' },
];

(async () => {
    try {
        // 使用固定的 MongoDB 连接字符串
        const mongoUri = 'mongodb+srv://Vercel-Admin-atlas-indigo-zhangjie:jPrDMYcbPALftpg0@atlas-indigo-zhangjie.q9jqyyq.mongodb.net/?retryWrites=true&w=majority';
        
        // 重新创建客户端以使用正确的连接字符串
        const { MongoClient } = require('mongodb');
        const client = new MongoClient(mongoUri, {
            appName: "devrel.vercel.integration",
            maxIdleTimeMS: 5000,
        });
        
        await client.connect();
        const db = client.db();
        
        console.log('正在初始化路由访问控制规则...');
        
        // 批量更新或插入规则
        const now = new Date();
        const ops = defaultRules.map(rule => ({
            updateOne: {
                filter: { method: rule.method, path: rule.path },
                update: {
                    $set: {
                        access: rule.access,
                        enabled: rule.enabled,
                        note: rule.note,
                        updatedAt: now
                    },
                    $setOnInsert: {
                        createdAt: now
                    }
                },
                upsert: true
            }
        }));
        
        if (ops.length > 0) {
            const result = await db.collection('route_access').bulkWrite(ops);
            console.log(`成功初始化路由访问控制规则: 更新 ${result.modifiedCount} 条，新增 ${result.upsertedCount} 条`);
        }
        
        // 检查并更新用户角色
        console.log('\n正在检查用户角色...');
        const users = await db.collection('users').find().toArray();
        for (const user of users) {
            if (!user.role) {
                await db.collection('users').updateOne(
                    { _id: user._id },
                    { $set: { role: 'user' } }
                );
                console.log(`更新用户 ${user.username} 的角色为 user`);
            }
        }
        
        console.log('\n路由访问控制初始化完成！');
        
    } catch (error) {
        console.error('初始化路由访问控制失败:', error);
    } finally {
        if (client) {
            await client.close();
        }
    }
})();
