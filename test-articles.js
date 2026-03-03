const { MongoClient, ObjectId } = require('mongodb');

async function testArticlesEndpoint() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    const db = client.db();
    
    // 检查是否有用户
    const users = await db.collection('users').find().toArray();
    console.log('现有用户:', users.length);
    
    if (users.length > 0) {
      const user = users[0];
      console.log('使用用户:', user.username, '角色:', user.role);
      
      // 创建一个测试会话
      const token = 'test-token-' + Date.now();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      
      await db.collection('user_sessions').insertOne({
        userId: user._id,
        token,
        expiresAt,
        createdAt: new Date(),
        lastSeenAt: new Date()
      });
      
      console.log('创建测试会话，token:', token);
      
      // 测试文章列表接口
      const axios = require('axios');
      try {
        const response = await axios.get('http://127.0.0.1:8801/api/user/articles?page=1&pageSize=5', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        console.log('文章列表接口响应:', response.data);
      } catch (error) {
        console.error('测试失败:', error.response ? error.response.data : error.message);
      }
    } else {
      console.log('没有用户，创建一个管理员用户');
      // 创建管理员用户
      const crypto = require('crypto');
      const salt = crypto.randomBytes(16).toString('hex');
      const iterations = 120000;
      const keylen = 32;
      const digest = 'sha256';
      const hash = crypto.pbkdf2Sync('password123', salt, iterations, keylen, digest).toString('hex');
      
      const newUser = {
        username: 'admin@example.com',
        nickname: 'Admin',
        role: 'admin',
        apiAccess: 'all',
        isDisabled: false,
        disabledReason: '',
        salt,
        iterations,
        keylen,
        digest,
        hash,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = await db.collection('users').insertOne(newUser);
      console.log('创建管理员用户成功:', result.insertedId);
    }
  } catch (error) {
    console.error('测试过程中出错:', error);
  } finally {
    await client.close();
  }
}

testArticlesEndpoint();