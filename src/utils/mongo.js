const { MongoClient } = require("mongodb");

const options = {
  appName: "devrel.vercel.integration",
  maxIdleTimeMS: 5000,
};

const client = new MongoClient(process.env.MONGODB_URI, options);

// Only attach database pool in Vercel environment
if (process.env.VERCEL) {
  try {
    const { attachDatabasePool } = require("@vercel/functions");
    attachDatabasePool(client);
  } catch (error) {
    console.warn("Vercel functions not available in this environment");
  }
}

// 连接到数据库并获取用户集合
const getUserCollection = async () => {
  try {
    await client.connect();
    const db = client.db('dailyapi');
    return db.collection('users');
  } catch (error) {
    console.error('连接数据库失败:', error);
    throw error;
  }
};

// Export a module-scoped MongoClient to ensure the client can be shared across functions.
module.exports = client;
module.exports.getUserCollection = getUserCollection;
