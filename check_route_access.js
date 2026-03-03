const client = require('./src/utils/mongo');

(async () => {
    try {
        await client.connect();
        const db = client.db();
        
        // 检查路由访问控制规则
        const routeAccessRules = await db.collection('route_access').find().toArray();
        console.log('当前路由访问控制规则:');
        routeAccessRules.forEach(rule => {
            console.log(`- 路径: ${rule.path}, 方法: ${rule.method || '*'}, 权限: ${rule.access || 'open'}, 启用: ${rule.enabled !== false}`);
        });
        
        // 检查用户角色
        const users = await db.collection('users').find().toArray();
        console.log('\n当前用户:');
        users.forEach(user => {
            console.log(`- 用户名: ${user.username}, 角色: ${user.role || 'user'}, 状态: ${user.isDisabled ? '禁用' : '启用'}`);
        });
        
        // 检查路由访问统计
        const stats = await db.collection('route_access_stats').find().sort({ total: -1 }).limit(10).toArray();
        console.log('\n访问量最高的10个接口:');
        stats.forEach(stat => {
            console.log(`- 路径: ${stat.path}, 总访问: ${stat.total}, 成功: ${stat.success}, 失败: ${stat.failed}`);
        });
        
    } catch (error) {
        console.error('检查路由访问控制失败:', error);
    } finally {
        await client.close();
    }
})();
