// scripts/drop-share-ttl.js
require("dotenv").config();
const client = require("../utils/mongo");

const DB_NAME = process.env.MONGODB_DB || undefined;

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI 未设置");
    process.exit(1);
  }

  await client.connect();
  const db = DB_NAME ? client.db(DB_NAME) : client.db();
  const collection = db.collection("user_shares");

  const indexes = await collection.indexes();
  const ttlIndex = indexes.find(
    (idx) =>
      idx.key && idx.key.expiresAt === 1 && typeof idx.expireAfterSeconds === "number"
  );

  if (!ttlIndex) {
    console.log("未找到 expiresAt 的 TTL 索引");
    return;
  }

  await collection.dropIndex(ttlIndex.name);
  console.log(`已删除 TTL 索引: ${ttlIndex.name}`);
}

main()
  .catch((err) => {
    console.error("执行失败:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await client.close();
    } catch (e) {}
  });
