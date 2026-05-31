# WatchMe 开发进度

更新时间：2026-05-31

## 当前阶段

阶段 1.5：核心 MVP 已可运行，进入补强和部署阶段。

当前按最新决定，macOS Agent 暂缓，先把 Windows / Server / Web 收尾打磨完。

1. 做一轮连续试跑，确认托盘 Agent 和 release 部署稳定。
2. 根据试跑结果继续补细节。

## 已完成

- 创建独立仓库 `watchme`。
- 配置远端：`git@github.com:dthylacetate/watchme.git`。
- 推送 `main` 分支。
- 明确 WatchMe 是独立项目。
- 写入产品需求文档。
- 写入目标架构文档。
- 写入开发路线图。
- 写入分支策略。
- 下载并归档参考分支快照。
- 分析 Windows/macOS Agent 参考实现。
- 分析两个前端设计参考分支。
- 初始化 `refactor/` workspace。
- 选定 `Node 22 + npm + Next + Hono + node:sqlite` 技术栈。
- 建立 `shared` / `privacy` / `db` / `app-catalog` 模块。
- 建立并通过 schema / privacy / server 集成测试。
- 实现后端 MVP 路由。
- 实现更贴近参考样例风格的前端页面。
- 实现静态导出前端页面。
- 建立 Windows Agent 基础脚本和打包脚本。
- 增加 Windows 开机自启安装脚本。
- 增加 server release 生成脚本。
- 增加 Windows / Linux 一键部署脚本。
- 补 systemd 和 Nginx 部署文档。
- 增加可配置的数据清理任务和保留策略，并补数据库测试。
- 增加 Windows / Linux 数据备份脚本和备份说明。
- 完成 Windows Agent 托盘 UI、配置入口和打包验证。
- 完成前端桌面 / 移动端浏览器验收并修正响应式细节。
- 修复 server release 启动时不会自动读取 `.env` 的问题，并补环境加载测试。
- 增加 release 重建时保留 `.env`、`data/`、`logs/` 和 `backups/` 的机制，并补脚本测试。
- 增加 Windows Agent 单实例保护，避免托盘版重复启动。
- 增加可重复执行的 server soak 脚本，方便做连续试跑。
- 将 Windows Agent 日志改为滚动日志，降低长时间运行时的日志膨胀风险。
- 增加 Windows Agent 停用 / 卸载脚本。
- 增加 release 启动后的健康检查脚本。
- 让部署脚本在有效配置下自动执行一轮临时启动健康检查。
- 增加 Windows Agent 启动阶段的配置和服务端连通性自检。
- 增加 Windows Agent 一键安装脚本，并让启动失败通过桌面弹窗尽早暴露。
- 增加 Windows Agent 图形管理器，集中处理 URL / token 配置、启动停止和开机自启。
- 增加 Server Windows 图形管理器和命令行交互管理器，集中处理 `.env`、启动停止和健康检查。
- 整理 `refactor/scripts/` 目录，拆分为 `build/` 和 `server/` 两组脚本。
- 整理仓库根目录文档，把需求、架构、进度、路线图和分析附录统一迁移到 `docs/`。
- 修复 Windows Agent 本地直连 server 时的健康检查兼容性：本地 URL 统一归一化并绕过系统代理，502 报错会带回响应内容。
- 增加 `/api/device` 鉴权检查接口，并让 Windows Agent Manager 的 `Test Connection` 同时验证 URL 和 token。
- 完成 `npm run typecheck`、`npm run test`、`npm run build`。
- 完成 `npm run package:server` 和 `refactor/scripts/server/deploy-server.ps1` 实跑验证。
- 将后台音乐从前台活动统计中拆出独立时间线，修复“挂着 QQ 音乐但焦点不在它时不计时”的核心问题。

## 当前文档状态

| 文档 | 状态 | 说明 |
| --- | --- | --- |
| `README.md` | 已更新 | 反映当前成品状态和运行方式。 |
| `docs/PRODUCT_REQUIREMENTS.md` | 已创建 | MVP 需求范围。 |
| `docs/PROJECT_ARCHITECTURE.md` | 已更新 | 增加后台音乐独立时间线。 |
| `docs/REFACTORING_ROADMAP.md` | 已更新 | 独立项目路线图。 |
| `docs/BRANCH_STRATEGY.md` | 已更新 | 单主线开发策略。 |
| `AGENTS.md` | 已创建 | 后续 Agent 接手入口。 |
| `docs/IMPLEMENTATION_BACKLOG.md` | 已更新 | 反映当前完成状态。 |
| `refactor/README.md` | 已更新 | 反映真实源码结构。 |
| `refactor/docs/deployment.md` | 已创建 | 可执行文件与一键部署说明。 |

## 正在推进

第二批开发任务：

1. 连续运行稳定性试跑。
2. 根据试跑结果继续打磨托盘、部署和 UI 细节。

## 暂不做

- Android Agent。
- 多用户账号。
- AI 总结默认功能。
- 健康数据默认展示。
- 复杂统计页。
- Pixel Room 主视图。

## 决策记录

### 2026-05-31：WatchMe 作为独立项目推进

决定：

- README 和需求文档从独立项目视角书写。
- 历史调研已收敛为分析文档，不再把上游快照目录保留在仓库里。
- 正式代码只进入 `refactor/`。

理由：

- 避免新项目被旧实现的目录结构和历史包袱牵着走。
- 方便后续 Agent 直接读取文档开始开发。

### 2026-05-31：暂用单主线 `main`

决定：

- 当前阶段只用 `main` 分支。

理由：

- 还处于需求和骨架阶段。
- 分支过多会增加维护成本。

### 2026-05-31：MVP 不包含 Android

决定：

- MVP 只支持 Windows/macOS Agent。

理由：

- 用户当前明确不需要 Android。
- 桌面端闭环已足够支撑第一版产品。

### 2026-05-31：开发期不使用 Docker 主循环

决定：

- WatchMe 开发和主要部署方式优先使用直接运行、部署脚本、systemd 和反向代理。
- Docker 只作为可选交付方式，不作为当前 MVP 的开发主路径。

理由：

- 直接部署更适合频繁迭代和快速调试。
- 项目目标是个人服务，不需要一开始就把开发体验放进容器。

### 2026-05-31：后台音乐独立成时间线

决定：

- 把前台焦点活动和后台音乐播放拆成两条状态流。
- 后端新增 `media_activities` 持久化和 `media_summary` / `media_segments` 输出。

理由：

- 参考实现只用前台窗口心跳推断时长，导致挂着 QQ 音乐但焦点一直停在 QQ / 浏览器时，歌曲状态和听歌时长都不可靠。
- “我在做什么”和“我在听什么”本来就是两个并行信号，分开建模更自然，也更利于后续做 richer UI。

### 2026-05-31：交付形态改为 Agent 可执行文件 + Server 一键部署

决定：

- Windows Agent 默认走可执行文件交付。
- Server 默认走 release 目录 + 一键脚本部署。

理由：

- 用户更需要可直接分发和启动的 Agent，而不是源码环境。
- Server 侧更适合脚本化部署，避免每次部署都重新手工拼目录和依赖。

## 下一次 Agent 接手建议

读取顺序：

1. `../AGENTS.md`
2. `../README.md`
3. `PROJECT_ARCHITECTURE.md`
4. `IMPLEMENTATION_BACKLOG.md`

然后从 Backlog 的 P5 和 P6 开始。
