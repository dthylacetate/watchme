# WatchMe 源码目录

这里是 WatchMe 新项目的正式源码位置。

当前目录已经完成第一轮 MVP 骨架：

```text
apps/
  server/            # Hono + Node SQLite API
  web/               # Next.js 静态导出仪表盘
agents/
  windows/           # Windows 心跳 / 电池 / 媒体 Agent
  macos/             # macOS 目录和实现说明
packages/
  shared/            # Zod schema / 日期工具
  privacy/           # 标题处理 / HMAC / 规则测试
  app-catalog/       # 应用名称和分类映射
  db/                # SQLite schema / 时间线构建
docs/
  ...                # 后续补充部署和架构文档
```

实现依据：

- [产品需求](../PRODUCT_REQUIREMENTS.md)
- [开发路线图](../REFACTORING_ROADMAP.md)
- [分支策略](../BRANCH_STRATEGY.md)

根目录中的分析文档记录了历史调研结论，但本目录没有任何上游源码镜像。

当前已经可用的能力：

- 共享 API schema、隐私规则和测试
- `/api/health`、`/api/config`、`/api/report`、`/api/current`、`/api/timeline`
- 前台活动时间线和后台音乐时间线
- 静态导出前端构建
- Windows Agent 基础上报脚本
