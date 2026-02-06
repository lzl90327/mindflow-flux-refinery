# MindFlow-Flux Refinery

**MindFlow-Flux 知识提炼服务** - 异步深度分析 Worker

## 📖 简介

MindFlow-Flux Refinery 是 MindFlow-Flux 生态系统的深度分析服务，负责消费 Redis 队列中的文章分析任务，执行深度 AI 分析，并更新飞书多维表格。

### 核心功能

- 📚 **核心要点提取** - 自动提炼文章的 3-5 个核心观点（200-300字）
- 🏷️ **智能标签生成** - 基于内容生成 2-4 个相关标签
- 📊 **内容分类** - 自动分类（技术/产品/管理/思考/生活）
- 💎 **金句摘录** - 提取 2-3 句最具洞察力的句子
- 🔗 **关联文档推荐** - 推荐 2-3 个延伸阅读方向

## 🏗️ 架构

```
MindFlow-Flux 生态系统

┌─────────────────────────────┐
│  article-collector-feishu   │  飞书机器人
│  (消息接收 + 快速处理)        │
└──────────────┬──────────────┘
               │
               │ 发布任务
               ▼
         ┌──────────┐
         │  Redis   │  任务队列
         │  Stream  │
         └─────┬────┘
               │
               │ 消费任务
               ▼
    ┌──────────────────────┐
    │  mindflow-refinery   │  深度分析服务
    │  (本项目)            │
    └──────────┬───────────┘
               │
               │ 更新结果
               ▼
         ┌──────────┐
         │ Bitable  │  多维表格
         └──────────┘
```

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入必要的配置：

```env
# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379

# 飞书配置
FEISHU_APP_ID=your_app_id
FEISHU_APP_SECRET=your_app_secret

# 多维表格配置
BITABLE_APP_TOKEN=your_bitable_app_token
BITABLE_TABLE_ID=your_table_id

# DeepSeek API 配置
DEEPSEEK_API_KEY=your_deepseek_api_key

# Worker 配置
WORKER_CONCURRENCY=3
POLL_INTERVAL=5000
```

### 3. 编译 TypeScript

```bash
npm run build
```

### 4. 启动服务

**开发环境：**

```bash
npm run dev
```

**生产环境：**

```bash
# 使用 PM2
npm start

# 或直接运行
node dist/index.js
```

## 📦 项目结构

```
mindflow-flux-refinery/
├── src/
│   ├── analyzers/           # AI 分析器
│   │   └── article-analyzer.ts
│   ├── services/            # 服务层
│   │   ├── redis-queue.ts   # Redis 队列服务
│   │   └── lark-client.ts   # 飞书 API 客户端
│   ├── utils/               # 工具类
│   │   ├── logger.ts        # 日志工具
│   │   └── bitable-updater.ts # Bitable 更新器
│   ├── types/               # 类型定义
│   │   └── index.ts
│   ├── config.ts            # 配置管理
│   └── index.ts             # Worker 入口
├── dist/                    # 编译输出
├── logs/                    # 日志文件
├── package.json
├── tsconfig.json
└── README.md
```

## 🔧 配置说明

### Redis 队列

- **Stream Key**: `mindflow:tasks`
- **Consumer Group**: `mindflow-refinery-group`
- **任务格式**:

```json
{
  "type": "article_analysis",
  "data": {
    "url": "https://example.com/article",
    "title": "文章标题",
    "content": "文章内容...",
    "author": "作者",
    "publishTime": "2024-01-01",
    "recordId": "rec123456",
    "messageId": "msg123456"
  },
  "timestamp": 1704067200000
}
```

### Bitable 字段映射

深度分析结果会更新以下字段：

- `处理状态`: `pending` → `completed` / `failed`
- `核心要点`: 3-5 个核心观点（200-300字）
- `智能标签`: 数组形式的标签列表
- `内容分类`: 单一分类名称
- `金句摘录`: 2-3 句精彩金句
- `关联文档`: 推荐的延伸阅读方向

## 📊 监控与日志

### 日志级别

- `error`: 错误信息
- `warn`: 警告信息
- `info`: 常规信息（默认）
- `debug`: 调试信息

### 日志文件

- `logs/refinery.log` - 所有日志
- `logs/refinery-error.log` - 仅错误日志

### PM2 监控

```bash
# 查看状态
pm2 status

# 查看日志
pm2 logs mindflow-refinery

# 查看监控面板
pm2 monit
```

## 🔄 部署

### 使用 PM2 部署

```bash
# 启动
pm2 start dist/index.js --name mindflow-refinery

# 重启
pm2 restart mindflow-refinery

# 停止
pm2 stop mindflow-refinery

# 查看日志
pm2 logs mindflow-refinery
```

### Docker 部署（可选）

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY dist ./dist

CMD ["node", "dist/index.js"]
```

## 🤝 与其他服务集成

### 1. 飞书机器人（article-collector-feishu）

飞书机器人在快速处理后，发布深度分析任务到 Redis：

```typescript
import { redisQueue, TaskType } from './services/redis-queue';

// 发布任务
await redisQueue.publishTask({
  type: TaskType.ARTICLE_ANALYSIS,
  data: {
    url: articleUrl,
    title: article.title,
    content: article.content,
    author: article.author,
    publishTime: article.publishTime,
    recordId: bitableRecordId,
    messageId: feishuMessageId,
  },
});
```

### 2. Redis Stream

确保 Redis 服务正常运行：

```bash
# 测试连接
redis-cli ping

# 查看队列长度
redis-cli xlen mindflow:tasks

# 查看消费者组
redis-cli xinfo groups mindflow:tasks
```

## 🐛 故障排查

### Redis 连接失败

1. 检查 Redis 服务是否运行
2. 验证 `REDIS_HOST` 和 `REDIS_PORT` 配置
3. 检查网络连接和防火墙设置

### DeepSeek API 调用失败

1. 验证 `DEEPSEEK_API_KEY` 是否正确
2. 检查 API 额度是否充足
3. 查看错误日志获取详细信息

### Bitable 更新失败

1. 确认飞书 App 权限（`bitable:app`）
2. 验证 `BITABLE_APP_TOKEN` 和 `BITABLE_TABLE_ID`
3. 检查字段名是否与 Bitable 中的字段匹配

## 📝 开发

### 添加新的分析功能

1. 在 `src/analyzers/article-analyzer.ts` 中添加新方法
2. 更新 `DeepAnalysisResult` 类型定义
3. 在 `src/utils/bitable-updater.ts` 中更新字段映射

### 测试

```bash
# 运行测试（待实现）
npm test
```

## 📄 许可证

MIT

## 🔗 相关项目

- **article-collector-feishu** - 飞书机器人主服务
- **mindflow-core** - 核心业务逻辑库（规划中）

---

**MindFlow-Flux** - 让思维流动起来 🌊
