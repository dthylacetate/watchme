# WatchMe

WatchMe 是一个隐私优先的个人状态仪表盘，用来在自己的网页上展示“我现在大概在做什么”。它由桌面 Agent、轻量后端和网页仪表盘组成：Agent 采集当前活动，后端负责隐私处理和存储，前端展示当前状态、设备在线情况和近期时间线。

这个仓库是 WatchMe 的正式项目仓库。顶层目录现在只保留入口文件、工程配置和源码目录；需求、架构、进度和历史分析都整理到了 [`docs/`](./docs/README.md)。

## 当前状态

当前仓库已经不是空设计稿，而是一版可交付的 Windows + Server + Web 成品线：

- `Node 22 + npm` workspace
- `packages/shared`：共享 schema、类型和日期工具
- `packages/privacy`：标题处理、HMAC、浏览器敏感词过滤和测试
- `packages/db`：SQLite schema、查询封装和时间线聚合
- `apps/server`：`/api/health`、`/api/config`、`/api/report`、`/api/current`、`/api/timeline`
- `apps/web`：当前状态、设备列表、前台活动时间线、后台音乐时间线
- `agents/windows`：可打包的 Agent 管理器和后台托盘 Worker
- `refactor/scripts/server`：部署、检查、备份、管理和 soak 脚本

关键改进点是：前台活动和后台音乐已经拆成两条独立状态流，不会再出现“QQ 音乐在后台播放但时长不增长”的问题。

正式源码位于 [refactor/](./refactor/README.md)。

## 快速运行

1. 安装依赖

```powershell
npm install
```

2. 复制环境变量模板

```powershell
Copy-Item .env.example .env
```

3. 启动开发环境

```powershell
npm run dev
```

4. 构建项目

```powershell
npm run build
```

5. 生成可发布的 server release

```powershell
npm run package:server
```

6. 一键部署 server release

```powershell
.\refactor\scripts\server\deploy-server.ps1
```

7. 手动备份数据

```powershell
.\refactor\scripts\server\backup-data.ps1
```

8. 连续试跑 server

```powershell
npm run soak:server -- http://127.0.0.1:3212 dev-token 24 250
```

9. 部署后快速健康检查

```powershell
npm run check:release -- http://127.0.0.1:3212
```

目前已验证：

- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run package:server`
- `.\refactor\scripts\server\deploy-server.ps1`

## 目录结构

```text
watchme/
  README.md                # 项目入口和快速运行说明
  AGENTS.md                # 后续 Agent 接手入口
  docs/                    # 需求、架构、进度、路线图和分析附录
  refactor/                # 正式源码
  .env.example             # 本地环境变量模板
  package.json             # workspace 脚本入口
  tsconfig.json            # 根 TypeScript 配置
  vitest.config.ts         # 根测试配置
```

`docs/` 内的结构：

```text
docs/
  README.md
  PRODUCT_REQUIREMENTS.md
  PROJECT_ARCHITECTURE.md
  DEVELOPMENT_PROGRESS.md
  IMPLEMENTATION_BACKLOG.md
  REFACTORING_ROADMAP.md
  BRANCH_STRATEGY.md
  analysis/
    CURRENT_API_AND_DATA.md
    PROJECT_ANALYSIS.md
    UPSTREAM_BRANCH_ANALYSIS.md
```

## 核心模块

```text
refactor/
  apps/
    server/          # API、SQLite、静态文件托管
    web/             # 仪表盘前端
  agents/
    windows/         # Windows Agent、管理器、打包脚本
    macos/           # macOS 占位目录
  packages/
    shared/          # API schema、通用类型、日期工具
    privacy/         # 标题处理和隐私规则
    app-catalog/     # 应用识别、分类、展示名
    db/              # SQLite schema、迁移、查询
  scripts/
    build/           # 构建和 release 打包脚本
    server/          # 部署、检查、备份和管理脚本
```

## 文档入口

- [文档总览](./docs/README.md)
- [产品需求](./docs/PRODUCT_REQUIREMENTS.md)
- [项目架构](./docs/PROJECT_ARCHITECTURE.md)
- [开发进度](./docs/DEVELOPMENT_PROGRESS.md)
- [实施任务清单](./docs/IMPLEMENTATION_BACKLOG.md)
- [部署文档](./refactor/docs/deployment.md)
- [开发路线图](./docs/REFACTORING_ROADMAP.md)
- [分支策略](./docs/BRANCH_STRATEGY.md)
- [旧 API 兼容参考](./docs/analysis/CURRENT_API_AND_DATA.md)
- [旧实现分析](./docs/analysis/PROJECT_ANALYSIS.md)
- [上游分支调研](./docs/analysis/UPSTREAM_BRANCH_ANALYSIS.md)

## 开发原则

1. 新代码只在 `refactor/` 中开发。
2. 历史实现只保留为分析文档，不作为源码目录参与开发。
3. 默认保守处理隐私；展示更多信息必须显式允许。
4. 先完成稳定核心，再做额外视觉实验。
5. 开发期不以 Docker 作为主循环，优先使用直接运行和部署脚本。

## 进度追踪

README 只保留高层入口。更细的任务状态和变更记录在：

- [开发进度](./docs/DEVELOPMENT_PROGRESS.md)
- [实施任务清单](./docs/IMPLEMENTATION_BACKLOG.md)
