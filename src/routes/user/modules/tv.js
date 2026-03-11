const Router = require("koa-router");
const client = require("../../../utils/mongo");
const { authMiddleware, requireAdmin } = require("./auth");
const { ObjectId } = require("mongodb");

const router = new Router();

const DB_NAME = process.env.MONGODB_DB || undefined;

const getDb = async () => {
  try {
    await client.connect();
    return DB_NAME ? client.db(DB_NAME) : client.db();
  } catch (error) {
    console.error("MongoDB连接失败:", error);
    return null;
  }
};

// 电视管理相关接口

// 获取频道列表（管理员）
router.get("/admin/tv/channels", authMiddleware, requireAdmin, async (ctx) => {
  try {
    const db = await getDb();
    if (!db) {
      ctx.body = {
        code: 500,
        message: "数据库连接失败"
      };
      return;
    }
    const channels = await db.collection("tv_channels").find({}).sort({ order: 1 }).toArray();
    ctx.body = {
      code: 200,
      message: "获取频道列表成功",
      data: channels
    };
  } catch (error) {
    console.error("获取频道列表失败:", error);
    ctx.body = {
      code: 500,
      message: "获取频道列表失败"
    };
  }
});

// 获取单个频道（管理员）
router.get("/admin/tv/channels/:id", authMiddleware, requireAdmin, async (ctx) => {
  try {
    const db = await getDb();
    if (!db) {
      ctx.body = {
        code: 500,
        message: "数据库连接失败"
      };
      return;
    }
    const { id } = ctx.params;
    const channel = await db.collection("tv_channels").findOne(
      { _id: new ObjectId(id) }
    );
    if (!channel) {
      ctx.body = {
        code: 404,
        message: "频道不存在"
      };
      return;
    }
    ctx.body = {
      code: 200,
      message: "获取频道成功",
      data: channel
    };
  } catch (error) {
    console.error("获取频道失败:", error);
    ctx.body = {
      code: 500,
      message: "获取频道失败"
    };
  }
});

// 获取频道视频列表（管理员）
router.get("/admin/tv/channels/:channelId/videos", authMiddleware, requireAdmin, async (ctx) => {
  try {
    const db = await getDb();
    if (!db) {
      ctx.body = {
        code: 500,
        message: "数据库连接失败"
      };
      return;
    }
    const { channelId } = ctx.params;
    const channel = await db.collection("tv_channels").findOne(
      { _id: new ObjectId(channelId) }
    );
    if (!channel) {
      ctx.body = {
        code: 404,
        message: "频道不存在"
      };
      return;
    }
    ctx.body = {
      code: 200,
      message: "获取视频列表成功",
      data: channel.videos || []
    };
  } catch (error) {
    console.error("获取视频列表失败:", error);
    ctx.body = {
      code: 500,
      message: "获取视频列表失败"
    };
  }
});

// 添加频道（管理员）
router.post("/admin/tv/channels", authMiddleware, requireAdmin, async (ctx) => {
  try {
    const db = await getDb();
    if (!db) {
      ctx.body = {
        code: 500,
        message: "数据库连接失败"
      };
      return;
    }
    const { name, order = 1, description = "", m3u8 = "" } = ctx.request.body;
    
    if (!name) {
      ctx.body = {
        code: 400,
        message: "频道名称不能为空"
      };
      return;
    }
    
    const newChannel = {
      name,
      order,
      description,
      m3u8,
      videos: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.collection("tv_channels").insertOne(newChannel);
    
    ctx.body = {
      code: 200,
      message: "添加频道成功",
      data: {
        ...newChannel,
        _id: result.insertedId
      }
    };
  } catch (error) {
    console.error("添加频道失败:", error);
    ctx.body = {
      code: 500,
      message: "添加频道失败"
    };
  }
});

// 更新频道（管理员）
router.put("/admin/tv/channels/:id", authMiddleware, requireAdmin, async (ctx) => {
  try {
    const db = await getDb();
    if (!db) {
      ctx.body = {
        code: 500,
        message: "数据库连接失败"
      };
      return;
    }
    const { id } = ctx.params;
    const { name, order, description, m3u8 } = ctx.request.body;
    
    const updateData = {
      updatedAt: new Date()
    };
    
    if (name !== undefined) updateData.name = name;
    if (order !== undefined) updateData.order = order;
    if (description !== undefined) updateData.description = description;
    if (m3u8 !== undefined) updateData.m3u8 = m3u8;
    
    const result = await db.collection("tv_channels").updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      ctx.body = {
        code: 404,
        message: "频道不存在"
      };
      return;
    }
    
    ctx.body = {
      code: 200,
      message: "更新频道成功"
    };
  } catch (error) {
    console.error("更新频道失败:", error);
    ctx.body = {
      code: 500,
      message: "更新频道失败"
    };
  }
});

// 删除频道（管理员）
router.delete("/admin/tv/channels/:id", authMiddleware, requireAdmin, async (ctx) => {
  try {
    const db = await getDb();
    if (!db) {
      ctx.body = {
        code: 500,
        message: "数据库连接失败"
      };
      return;
    }
    const { id } = ctx.params;
    
    const result = await db.collection("tv_channels").deleteOne(
      { _id: new ObjectId(id) }
    );
    
    if (result.deletedCount === 0) {
      ctx.body = {
        code: 404,
        message: "频道不存在"
      };
      return;
    }
    
    ctx.body = {
      code: 200,
      message: "删除频道成功"
    };
  } catch (error) {
    console.error("删除频道失败:", error);
    ctx.body = {
      code: 500,
      message: "删除频道失败"
    };
  }
});

// 添加视频到频道（管理员）
router.post("/admin/tv/channels/:channelId/videos", authMiddleware, requireAdmin, async (ctx) => {
  try {
    const db = await getDb();
    if (!db) {
      ctx.body = {
        code: 500,
        message: "数据库连接失败"
      };
      return;
    }
    const { channelId } = ctx.params;
    const { title, order = 1, url = "", m3u8 = "", image = "" } = ctx.request.body;
    
    if (!title || (!url && !m3u8)) {
      ctx.body = {
        code: 400,
        message: "视频标题和链接不能为空"
      };
      return;
    }
    
    const newVideo = {
      _id: new ObjectId(),
      title,
      order,
      url,
      m3u8,
      image,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.collection("tv_channels").updateOne(
      { _id: new ObjectId(channelId) },
      { $push: { videos: newVideo } }
    );
    
    if (result.matchedCount === 0) {
      ctx.body = {
        code: 404,
        message: "频道不存在"
      };
      return;
    }
    
    ctx.body = {
      code: 200,
      message: "添加视频成功",
      data: newVideo
    };
  } catch (error) {
    console.error("添加视频失败:", error);
    ctx.body = {
      code: 500,
      message: "添加视频失败"
    };
  }
});

// 更新频道视频（管理员）
router.put("/admin/tv/channels/:channelId/videos/:videoId", authMiddleware, requireAdmin, async (ctx) => {
  try {
    const db = await getDb();
    if (!db) {
      ctx.body = {
        code: 500,
        message: "数据库连接失败"
      };
      return;
    }
    const { channelId, videoId } = ctx.params;
    const { title, order, url, m3u8, image } = ctx.request.body;
    
    const updateData = {
      "videos.$.updatedAt": new Date()
    };
    
    if (title !== undefined) updateData["videos.$.title"] = title;
    if (order !== undefined) updateData["videos.$.order"] = order;
    if (url !== undefined) updateData["videos.$.url"] = url;
    if (m3u8 !== undefined) updateData["videos.$.m3u8"] = m3u8;
    if (image !== undefined) updateData["videos.$.image"] = image;
    
    const result = await db.collection("tv_channels").updateOne(
      { 
        _id: new ObjectId(channelId),
        "videos._id": new ObjectId(videoId)
      },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      ctx.body = {
        code: 404,
        message: "频道或视频不存在"
      };
      return;
    }
    
    ctx.body = {
      code: 200,
      message: "更新视频成功"
    };
  } catch (error) {
    console.error("更新视频失败:", error);
    ctx.body = {
      code: 500,
      message: "更新视频失败"
    };
  }
});

// 删除频道视频（管理员）
router.delete("/admin/tv/channels/:channelId/videos/:videoId", authMiddleware, requireAdmin, async (ctx) => {
  try {
    const db = await getDb();
    if (!db) {
      ctx.body = {
        code: 500,
        message: "数据库连接失败"
      };
      return;
    }
    const { channelId, videoId } = ctx.params;
    
    const result = await db.collection("tv_channels").updateOne(
      { _id: new ObjectId(channelId) },
      { $pull: { videos: { _id: new ObjectId(videoId) } } }
    );
    
    if (result.matchedCount === 0) {
      ctx.body = {
        code: 404,
        message: "频道不存在"
      };
      return;
    }
    
    ctx.body = {
      code: 200,
      message: "删除视频成功"
    };
  } catch (error) {
    console.error("删除视频失败:", error);
    ctx.body = {
      code: 500,
      message: "删除视频失败"
    };
  }
});

// 获取频道列表（公开接口，用于前端展示）
router.get("/tv/channels", async (ctx) => {
  try {
    const db = await getDb();
    if (!db) {
      ctx.body = {
        code: 500,
        message: "数据库连接失败"
      };
      return;
    }
    const channels = await db.collection("tv_channels").find({}).sort({ order: 1 }).toArray();
    ctx.body = {
      code: 200,
      message: "获取频道列表成功",
      data: channels
    };
  } catch (error) {
    console.error("获取频道列表失败:", error);
    ctx.body = {
      code: 500,
      message: "获取频道列表失败"
    };
  }
});

module.exports = { router };