# HubDaily
HubDaily 是一个基于 Node.js 的综合性 API 聚合服务中心，集成热点资讯、视频、直播、音乐等多源数据接口，提供统一、便捷的 API 访问方案。

## 项目功能

### 核心功能
- **热点资讯**：集成知乎、微博、B站、抖音、百度等多个平台的热点数据
- **视频服务**：提供视频解析和播放功能
- **直播系统**：支持多频道直播管理和观看
- **用户系统**：包含注册、登录、个人中心等功能
- **文章系统**：支持文章发布、管理和互动
- **聊天室**：实时聊天功能
- **CG 内容**：CG 相关资源访问
- **其他工具**：包括解析服务、J1 功能等

## 示例站点
- [HubDaily - http://localhost:8800](http://localhost:8800)

## 总览

> 🟢 状态正常
> 🟠 可能失效
> ❌ 无法使用

| **站点**     | **类别** | **调用名称**          | **状态** |
| ------------ | -------- | --------------------- | -------- |
| 哔哩哔哩     | 热门榜   | bilibili              | 🟢       |
| 微博         | 热搜榜   | weibo                 | 🟢       |
| 知乎         | 热榜     | zhihu                 | 🟢       |
| 百度         | 热搜榜   | baidu                 | 🟢       |
| 抖音         | 热点榜   | douyin / douyin_new   | 🟢       |
| 抖音         | 热歌榜   | douyin_music          | 🟢       |
| 豆瓣         | 新片榜   | douban_new            | 🟢       |
| 豆瓣讨论小组 | 讨论精选 | douban_group          | 🟢       |
| 百度贴吧     | 热议榜   | tieba                 | 🟢       |
| 少数派       | 热榜     | sspai                 | 🟢       |
| IT 之家      | 热榜     | ithome                | 🟠       |
| 澎湃新闻     | 热榜     | thepaper              | 🟢       |
| 今日头条     | 热榜     | toutiao               | 🟢       |
| 36 氪        | 热榜     | 36kr                  | 🟢       |
| 稀土掘金     | 热榜     | juejin                | 🟢       |
| 腾讯新闻     | 热点榜   | newsqq                | 🟢       |
| 网易新闻     | 热点榜   | netease               | 🟢       |
| 英雄联盟     | 更新公告 | lol                   | 🟢       |
| 原神         | 最新消息 | genshin               | 🟢       |
| 微信读书     | 飙升榜   | weread                | 🟢       |
| 快手         | 热榜     | kuaishou              | 🟢       |
| 网易云音乐   | 排行榜   | netease_music_toplist | 🟢       |
| QQ音乐       | 排行榜   | qq_music_toplist      | 🟢       |
| NGA          | 热帖     | ngabbs                | 🟢       |
| Github       | Trending | github                | 🟢       |
| V2EX         | 热榜     | v2ex                  | 🟠       |
| 历史上的今天 | 指定日期 | calendar              | 🟢       |

## 快速开始

### 安装依赖
```bash
npm install
```

### 运行项目
```bash
npm run run
```

### 访问地址
- **主页**：http://localhost:8800
- **直播页面**：http://localhost:8800/tv/
- **用户中心**：http://localhost:8800/user/profile
- **接口文档**：http://localhost:8800/api/all

## 项目结构
- `src/` - 源代码目录
  - `routes/` - API 路由
  - `utils/` - 工具函数
  - `middlewares/` - 中间件
- `public/` - 静态资源
  - `tv/` - 直播页面
  - `user/` - 用户相关页面
  - `chat/` - 聊天室页面
  - `cg/` - CG 相关页面
- `scripts/` - 脚本工具
- `shell/` - 部署脚本

## 技术栈
- Node.js + Koa
- MongoDB
- 前端：HTML5 + Tailwind CSS + JavaScript

## 部署

### 一键安装（Linux）
```shell
# Alpine Linux
bash <(wget -qO- https://raw.githubusercontent.com/modefa888/HubDaily/main/shell/hot_plus.sh)

# 其他版本
bash <(wget -qO- https://raw.githubusercontent.com/modefa888/HubDaily/main/shell/hotapi_yijian.sh)
```

### 环境变量
复制 `.env.example` 文件为 `.env` 并配置相关参数：
- `PORT` - 服务端口
- `MONGODB_URI` - MongoDB 连接字符串
- `EMAIL_USER` - 邮箱地址
- `EMAIL_PASS` - 邮箱授权码

## 贡献
欢迎提交 Issue 和 Pull Request 来改进这个项目。

## 许可证
ISC License
