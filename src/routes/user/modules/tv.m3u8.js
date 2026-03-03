const Router = require('koa-router');
const router = new Router();
const { authMiddleware, requireAdmin } = require('./auth');
const client = require('../../../utils/mongo');
const { ObjectId } = require('mongodb');

// 模拟视频时长数据（实际应用中应该从视频元数据中获取）
const VIDEO_DURATION = 600; // 默认10分钟

// 缓存的频道 m3u8 数据
let channelM3u8Cache = {};
let lastUpdateTime = {};

const DB_NAME = process.env.MONGODB_DB || undefined;

const getDb = async () => {
  try {
    await client.connect();
    return DB_NAME ? client.db(DB_NAME) : client.db();
  } catch (error) {
    console.error('MongoDB连接失败:', error);
    return null;
  }
};

// 生成频道的 m3u8 播放列表
const generateChannelM3u8 = (channel) => {
  if (!channel || !channel.videos || channel.videos.length === 0) {
    return '#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:10\n#EXT-X-ENDLIST';
  }

  let m3u8Content = '#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:10\n';
  
  // 按排序顺序添加视频
  const sortedVideos = [...channel.videos].sort((a, b) => (a.order || 1) - (b.order || 1));
  
  sortedVideos.forEach((video, index) => {
    const videoUrl = (video.m3u8 || video.url).replace(/[`]/g, '').trim();
    if (videoUrl) {
      m3u8Content += `#EXTINF:${VIDEO_DURATION},${video.title}\n${videoUrl}\n`;
    }
  });
  
  m3u8Content += '#EXT-X-ENDLIST';
  return m3u8Content;
};

// 获取频道的 m3u8 播放地址
router.get('/admin/tv/channels/:channelId/m3u8', authMiddleware, requireAdmin, async (ctx) => {
  try {
    const { channelId } = ctx.params;
    
    // 检查缓存是否有效（5分钟内）
    const now = Date.now();
    if (channelM3u8Cache[channelId] && lastUpdateTime[channelId] && (now - lastUpdateTime[channelId] < 5 * 60 * 1000)) {
      ctx.set('Content-Type', 'application/vnd.apple.mpegurl');
      ctx.body = channelM3u8Cache[channelId];
      return;
    }
    
    // 加载频道数据
    const db = await getDb();
    if (!db) {
      ctx.status = 500;
      ctx.body = { code: 500, message: '数据库连接失败' };
      return;
    }
    
    const channel = await db.collection('tv_channels').findOne({ _id: new ObjectId(channelId) });
    
    if (!channel) {
      ctx.status = 404;
      ctx.body = { code: 404, message: '频道不存在' };
      return;
    }
    
    // 生成 m3u8 内容
    const m3u8Content = generateChannelM3u8(channel);
    
    // 缓存结果
    channelM3u8Cache[channelId] = m3u8Content;
    lastUpdateTime[channelId] = now;
    
    ctx.set('Content-Type', 'application/vnd.apple.mpegurl');
    ctx.body = m3u8Content;
  } catch (error) {
    console.error('生成频道 m3u8 失败:', error);
    ctx.status = 500;
    ctx.body = { code: 500, message: '生成 m3u8 失败' };
  }
});

// 清除频道 m3u8 缓存
router.post('/admin/tv/channels/:channelId/m3u8/refresh', authMiddleware, requireAdmin, async (ctx) => {
  try {
    const { channelId } = ctx.params;
    delete channelM3u8Cache[channelId];
    delete lastUpdateTime[channelId];
    ctx.body = { code: 200, message: '缓存已清除' };
  } catch (error) {
    console.error('清除缓存失败:', error);
    ctx.status = 500;
    ctx.body = { code: 500, message: '清除缓存失败' };
  }
});

module.exports = router;