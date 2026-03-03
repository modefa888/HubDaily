const client = require('./utils/mongo');

async function checkStats() {
    try {
        await client.connect();
        const db = client.db();
        const stats = await db.collection('route_access_stats').find().toArray();
        console.log('路由访问统计数据:');
        console.log(JSON.stringify(stats, null, 2));
        await client.close();
    } catch (error) {
        console.error('检查统计数据失败:', error);
        await client.close();
    }
}

checkStats();