# WatchMe Source Tree

这里是 WatchMe 的正式源码目录。

当前主要分成这些部分：

```text
apps/
  server/            # Hono + Node SQLite API
  web/               # Next.js 仪表盘
agents/
  windows/           # Windows Agent、管理器和打包脚本
  macos/             # macOS Agent、管理器、自启动和打包脚本
packages/
  shared/            # Zod schema、共享类型、日期工具
  privacy/           # 标题处理、HMAC、隐私规则测试
  app-catalog/       # 应用识别和分类
  db/                # SQLite schema、迁移、查询封装
docs/
  deployment.md      # 部署说明
scripts/
  build/             # 构建和 release 目录准备脚本
  server/            # 服务端部署、检查、备份和管理脚本
```

相关文档：

- [产品需求](../docs/PRODUCT_REQUIREMENTS.md)
- [项目架构](../docs/PROJECT_ARCHITECTURE.md)
- [开发进度](../docs/DEVELOPMENT_PROGRESS.md)
- [实施任务清单](../docs/IMPLEMENTATION_BACKLOG.md)

当前已经可用的能力：

- 共享 API schema、隐私规则和测试
- `/api/health`、`/api/config`、`/api/report`、`/api/current`、`/api/timeline`
- 前台活动时间线和后台音乐时间线
- Server release 打包、健康检查、备份和管理工具
- Windows Agent 管理器、后台托盘 Worker 和打包脚本
- macOS Agent Worker、图形管理器、launchd 自启动脚本、`.app` 打包脚本、前台 / idle / 电池 / Spotify / Apple Music 采集和 Reporter 测试

这个目录里不保留任何上游源码镜像；历史调研只保留在根目录 `docs/analysis/` 文档里。
