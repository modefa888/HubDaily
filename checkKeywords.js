const { MongoClient } = require('mongodb');

(async () => {
  try {
    const client = new MongoClient('mongodb://localhost:27017');
    await client.connect();
    const db = client.db('dailyapi');
    
    // 检查搜索关键字数据
    const keywords = await db.collection('search_keywords').find().toArray();
    console.log('搜索关键字数据:', keywords);
    
    // 检查搜索关键字统计
    const stats = await db.collection('search_keywords').aggregate([
      { $group: { _id: "$keyword", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]).toArray();
    console.log('搜索关键字统计:', stats);
    
    await client.close();
  } catch (error) {
    console.error('Error:', error);
  }
})();
