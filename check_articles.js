const { MongoClient } = require('mongodb');

(async () => {
  try {
    const client = new MongoClient('mongodb://localhost:27017');
    await client.connect();
    console.log('MongoDB 连接成功');
    
    const db = client.db('dailyapi');
    const articles = await db.collection('articles').find({}).limit(5).toArray();
    
    console.log('\n文章文档结构:');
    articles.forEach((article, index) => {
      console.log(`\n文章 ${index + 1}:`);
      console.log('ID:', article._id);
      console.log('标题:', article.title);
      console.log('查看数量:', article.viewCount);
      console.log('点赞数量:', article.likeCount);
      console.log('倒赞数量:', article.dislikeCount);
    });
    
    // 检查是否有文章缺少这些字段
    const articlesWithoutCounts = await db.collection('articles').find({
      $or: [
        { viewCount: { $exists: false } },
        { likeCount: { $exists: false } },
        { dislikeCount: { $exists: false } }
      ]
    }).count();
    
    console.log(`\n缺少计数字段的文章数量: ${articlesWithoutCounts}`);
    
    await client.close();
  } catch (error) {
    console.error('错误:', error);
  }
})();