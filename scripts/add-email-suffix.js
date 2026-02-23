require("dotenv").config();
const client = require("../utils/mongo");

const DB_NAME = process.env.MONGODB_DB || undefined;
const SUFFIX = "@yizhifa.cyou";

const hasAt = (value) => String(value || "").includes("@");

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI 未设置");
    process.exit(1);
  }

  await client.connect();
  const db = client.db(DB_NAME);
  const users = db.collection("users");

  const rawUsers = await users.find({ username: { $not: /@/ } }).toArray();
  const candidates = rawUsers
    .map((u) => ({
      _id: u._id,
      username: String(u.username || "").trim(),
      next: String(u.username || "").trim() + SUFFIX,
    }))
    .filter((u) => u.username && !hasAt(u.username));

  if (candidates.length === 0) {
    console.log("没有需要更新的账号");
    return;
  }

  const nextNames = candidates.map((u) => u.next);
  const existing = await users
    .find({ username: { $in: nextNames } }, { projection: { username: 1 } })
    .toArray();
  const existingSet = new Set(existing.map((u) => String(u.username || "")));

  const toUpdate = candidates.filter((u) => !existingSet.has(u.next));
  const conflicts = candidates.filter((u) => existingSet.has(u.next));

  if (toUpdate.length === 0) {
    console.log("全部存在冲突，未更新任何账号");
    if (conflicts.length) {
      console.log(`冲突数量: ${conflicts.length}`);
    }
    return;
  }

  const ops = toUpdate.map((u) => ({
    updateOne: {
      filter: { _id: u._id },
      update: {
        $set: {
          username: u.next,
          updatedAt: new Date(),
        },
      },
    },
  }));

  const result = await users.bulkWrite(ops, { ordered: false });
  console.log(`已更新: ${result.modifiedCount}`);
  if (conflicts.length) {
    console.log(`冲突跳过: ${conflicts.length}`);
  }
}

main()
  .catch((err) => {
    console.error("执行失败:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await client.close();
    } catch (e) {
      // ignore
    }
  });
