const client = require('./src/utils/mongo');

(async () => {
  try {
    await client.connect();
    const db = client.db();
    
    // 检查用户集合是否存在
    const collections = await db.listCollections({ name: 'users' }).toArray();
    if (collections.length === 0) {
      console.log('用户集合不存在，将创建默认管理员用户');
      
      // 创建默认管理员用户
      const crypto = require('crypto');
      const hashPassword = (password, salt = null) => {
        const realSalt = salt || crypto.randomBytes(16).toString('hex');
        const iterations = 120000;
        const keylen = 32;
        const digest = 'sha256';
        const hash = crypto.pbkdf2Sync(password, realSalt, iterations, keylen, digest).toString('hex');
        return { salt: realSalt, iterations, keylen, digest, hash };
      };
      
      const { salt, iterations, keylen, digest, hash } = hashPassword('admin123');
      const adminUser = {
        username: 'admin@example.com',
        nickname: '管理员',
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
        updatedAt: new Date(),
      };
      
      await db.collection('users').insertOne(adminUser);
      console.log('默认管理员用户创建成功: admin@example.com / admin123');
    } else {
      // 检查现有用户
      const users = await db.collection('users').find().toArray();
      console.log('现有用户:', users.length);
      users.forEach(user => console.log('  -', user.username, '(', user.role, ')'));
      
      // 检查是否有管理员用户
      const adminUsers = users.filter(user => user.role === 'admin');
      if (adminUsers.length === 0) {
        console.log('没有管理员用户，将创建默认管理员用户');
        
        // 创建默认管理员用户
        const crypto = require('crypto');
        const hashPassword = (password, salt = null) => {
          const realSalt = salt || crypto.randomBytes(16).toString('hex');
          const iterations = 120000;
          const keylen = 32;
          const digest = 'sha256';
          const hash = crypto.pbkdf2Sync(password, realSalt, iterations, keylen, digest).toString('hex');
          return { salt: realSalt, iterations, keylen, digest, hash };
        };
        
        const { salt, iterations, keylen, digest, hash } = hashPassword('admin123');
        const adminUser = {
          username: 'admin@example.com',
          nickname: '管理员',
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
          updatedAt: new Date(),
        };
        
        await db.collection('users').insertOne(adminUser);
        console.log('默认管理员用户创建成功: admin@example.com / admin123');
      }
    }
    
    // 检查角色集合是否存在
    const rolesCollections = await db.listCollections({ name: 'roles' }).toArray();
    if (rolesCollections.length === 0) {
      console.log('角色集合不存在，将创建默认角色');
      
      // 创建默认角色
      const defaultRoles = [
        { name: 'admin', description: '管理员角色', permissions: [], createdAt: new Date(), updatedAt: new Date() },
        { name: 'user', description: '普通用户角色', permissions: [], createdAt: new Date(), updatedAt: new Date() }
      ];
      
      await db.collection('roles').insertMany(defaultRoles);
      console.log('默认角色创建成功');
    } else {
      // 检查默认角色是否存在
      const existingRoles = await db.collection('roles').find().toArray();
      const existingRoleNames = new Set(existingRoles.map(role => role.name));
      
      const defaultRoles = [
        { name: 'admin', description: '管理员角色', permissions: [] },
        { name: 'user', description: '普通用户角色', permissions: [] }
      ];
      
      for (const role of defaultRoles) {
        if (!existingRoleNames.has(role.name)) {
          await db.collection('roles').insertOne({
            ...role,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          console.log(`创建默认角色: ${role.name}`);
        }
      }
    }
    
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await client.close();
  }
})();
