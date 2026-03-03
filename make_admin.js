const { MongoClient } = require('mongodb');

(async () => {
  try {
    const client = new MongoClient('mongodb+srv://Vercel-Admin-atlas-indigo-zhangjie:jPrDMYcbPALftpg0@atlas-indigo-zhangjie.q9jqyyq.mongodb.net/?retryWrites=true&w=majority');
    await client.connect();
    console.log('MongoDB 连接成功');
    
    const db = client.db();
    
    // 检查数据库中的用户
    const users = await db.collection('users').find({}).toArray();
    console.log('数据库中的用户:', users);
    
    if (users.length > 0) {
      // 查找 admin@example.com 用户
      const adminUser = users.find(user => user.username === 'admin@example.com');
      if (adminUser) {
        await db.collection('users').updateOne(
          { _id: adminUser._id },
          { $set: { role: 'admin', apiAccess: 'all' } }
        );
        console.log('已将用户', adminUser.username, '设置为管理员');
      } else {
        // 如果找不到 admin@example.com 用户，将第一个用户设置为管理员
        const firstUser = users[0];
        await db.collection('users').updateOne(
          { _id: firstUser._id },
          { $set: { role: 'admin', apiAccess: 'all' } }
        );
        console.log('已将用户', firstUser.username, '设置为管理员');
      }
    } else {
      console.log('数据库中没有用户，请先注册一个用户');
    }
    
    await client.close();
  } catch (error) {
    console.error('错误:', error);
  }
})();