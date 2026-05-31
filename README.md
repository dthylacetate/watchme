# WatchMe

WatchMe 是一个隐私优先的个人状态仪表盘，用来在自己的网页上展示“我现在大概在做什么”。它由桌面端 Agent、轻量后端和网页仪表盘组成：Agent 采集当前活动，后端负责隐私处理和存储，前端用可读、好看的方式展示当前状态、设备在线情况和近期时间线。

这个仓库是 WatchMe 的独立项目仓库。`references/` 中保留了一些同类项目和上游实现的研究快照，只作为需求分析、兼容参考和实现灵感，不是项目源码主体。

## 项目目标

- **隐私优先**：默认不保存原始窗口标题；公开页面只展示经过策略处理后的安全描述。
- **个人部署友好**：单机、单服务、SQLite，适合 VPS、家用服务器或局域网部署。
- **多设备感知**：优先支持 Windows 和 macOS 桌面端，后续再考虑移动端。
- **轻量实时体验**：展示当前状态、设备在线/离线、今日活动和基础统计。
- **可持续开发**：共享 API 契约、可测试的隐私规则、清晰的前后端和 Agent 边界。

## 当前状态

WatchMe 已经完成第一轮可运行 MVP 骨架。当前仓库里有真实代码，不再只是设计文档。已经落地：

- `Node 22 + npm` workspace 骨架。
- `packages/shared`：Zod schema、类型和日期工具。
- `packages/privacy`：标题处理、HMAC、浏览器敏感词、测试。
- `packages/db`：Node SQLite schema、迁移和时间线构建。
- `apps/server`：`/api/health`、`/api/config`、`/api/report`、`/api/current`、`/api/timeline`。
- `apps/web`：更接近参考前端风格的当前状态、设备列表、前台活动时间线、后台音乐时间线。
- `agents/windows`：可打包托盘 Agent，前台焦点和媒体变化分开上报。
- `refactor/scripts/deploy-server.ps1` / `.sh`：一键生成 server release 目录。
- 自动数据清理：默认可配置清理 30 天前的活动和后台音乐记录。
- 数据备份脚本：可一键备份 SQLite 数据库到带时间戳的 `backups/` 目录。
- release 重新打包时会保留已有 `.env`、`data/`、`logs/` 和 `backups/`。
- 一键部署脚本在检测到有效 `.env` 后，会自动做一轮 release 健康检查。

关键改进点：参考实现里“后台听歌不计时、切歌不及时更新”的问题，这一版已经从设计上拆开处理。前台应用和后台音乐被视为两条并行状态流，后端会单独记录 `media_activities`，前端也会单独展示后台听歌时长。

正式源码位于 [refactor/](./refactor/README.md)。

## 快速运行

1. 安装依赖：

```powershell
npm install
```

2. 复制环境变量：

```powershell
Copy-Item .env.example .env
```

3. 启动开发环境：

```powershell
npm run dev
```

4. 或直接构建：

```powershell
npm run build
```

5. 生成可发布的 server release：

```powershell
npm run package:server
```

6. 一键部署 server release：

```powershell
.\refactor\scripts\deploy-server.ps1
```

7. 需要手动备份数据时：

```powershell
.\refactor\scripts\backup-data.ps1
```

8. 需要做一轮连续试跑时：

```powershell
npm run soak:server -- http://127.0.0.1:3212 dev-token 24 250
```

9. 部署后想快速做健康检查时：

```powershell
npm run check:release -- http://127.0.0.1:3212
```

目前已验证：

- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run package:server`
- `.\refactor\scripts\deploy-server.ps1`

## 目录

```text
watchme/
  README.md                         # 项目入口和当前状态
  AGENTS.md                         # Agent 开发入口
  PRODUCT_REQUIREMENTS.md           # 产品需求文档
  PROJECT_ARCHITECTURE.md           # 目标架构
  DEVELOPMENT_PROGRESS.md           # 当前开发进度
  IMPLEMENTATION_BACKLOG.md         # 可执行任务清单
  REFACTORING_ROADMAP.md            # 开发路线图
  BRANCH_STRATEGY.md                # 分支和协作策略
  CURRENT_API_AND_DATA.md           # 兼容参考：旧 API 和数据模型
  PROJECT_ANALYSIS.md               # 调研附录：旧实现分析
  UPSTREAM_BRANCH_ANALYSIS.md       # 调研附录：上游分支取舍
  .env.example                      # 本地运行示例环境变量
  refactor/                         # WatchMe 新项目源码位置
  references/upstream-branches/     # 调研快照，不作为主源码开发
```

## 核心模块规划

```text
refactor/
  apps/
    server/          # API、数据库、静态文件托管
    web/             # 仪表盘前端
  agents/
    windows/         # Windows 桌面 Agent
    macos/           # macOS 桌面 Agent
  packages/
    shared/          # API schema、通用类型、日期工具
    privacy/         # 标题处理、隐私分级、敏感内容过滤
    app-catalog/     # 应用识别、展示名、分类
    db/              # SQLite schema、迁移、查询封装
```

## MVP 范围

第一版只做最核心的闭环：

- Windows/macOS Agent 上报当前前台应用、窗口标题、电池、音乐状态和 AFK 状态。
- 后端鉴权、隐私处理、SQLite 存储、当前状态 API、时间线 API。
- 前端展示当前状态、设备列表、今日时间线、基础统计和离线状态。
- 后台音乐单独计时，不依赖它是不是当前最上层窗口。
- 直接部署运行：后端常驻服务、前端静态构建、SQLite 数据目录、反向代理。
- 隐私策略和 API schema 有测试。
- Windows Agent 有打包脚本，可生成常驻托盘的 `.exe`。
- Server 有最小化 release 目录、一键部署脚本，并会自动读取 release 目录下的 `.env`。

暂不做：

- Android 客户端。
- 多用户系统。
- 复杂权限后台。
- AI 总结默认启用。
- 大规模数据分析。

## 文档

- [Agent 开发入口](./AGENTS.md)
- [产品需求](./PRODUCT_REQUIREMENTS.md)
- [项目架构](./PROJECT_ARCHITECTURE.md)
- [开发进度](./DEVELOPMENT_PROGRESS.md)
- [实施任务清单](./IMPLEMENTATION_BACKLOG.md)
- [部署文档](./refactor/docs/deployment.md)
- [开发路线图](./REFACTORING_ROADMAP.md)
- [分支策略](./BRANCH_STRATEGY.md)
- [旧 API 兼容参考](./CURRENT_API_AND_DATA.md)
- [旧实现分析](./PROJECT_ANALYSIS.md)
- [上游分支调研](./UPSTREAM_BRANCH_ANALYSIS.md)

## 开发原则

1. 新代码只在 `refactor/` 中开发。
2. `references/` 只读，用作参考。
3. 默认保护隐私，展示更多信息必须显式允许。
4. 先完成稳定核心，再做视觉实验。
5. 每个公开字段都要能解释它的隐私含义。
6. 开发期不以 Docker 作为主循环，优先使用本地或服务器直接运行和部署脚本。

## 开发纪要

README 会持续反映当前成品状态。更细的任务和进度在：

- [开发进度](./DEVELOPMENT_PROGRESS.md)
- [实施任务清单](./IMPLEMENTATION_BACKLOG.md)
