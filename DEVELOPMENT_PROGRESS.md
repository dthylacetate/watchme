# WatchMe 开发进度

更新时间：2026-05-31

## 当前阶段

阶段 0：产品定稿与开发准备。

当前还没有正式应用源码。下一步是在 `refactor/` 中初始化新项目骨架。

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

## 当前文档状态

| 文档 | 状态 | 说明 |
| --- | --- | --- |
| `README.md` | 已更新 | 独立项目入口。 |
| `PRODUCT_REQUIREMENTS.md` | 已创建 | MVP 需求范围。 |
| `PROJECT_ARCHITECTURE.md` | 已创建 | 目标架构和模块边界。 |
| `REFACTORING_ROADMAP.md` | 已更新 | 独立项目路线图。 |
| `BRANCH_STRATEGY.md` | 已更新 | 单主线开发策略。 |
| `AGENTS.md` | 已创建 | 后续 Agent 接手入口。 |
| `IMPLEMENTATION_BACKLOG.md` | 已创建 | 下一步任务清单。 |

## 待开始

第一批开发任务：

1. 初始化 `refactor/` workspace。
2. 建立 `packages/shared`。
3. 定义 API schema。
4. 建立 `packages/privacy`。
5. 为隐私规则写测试。
6. 建立 `apps/server` 的 `/api/health`。
7. 建立 `apps/web` 空状态页面。

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
- `references/` 只作为调研资料。
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

## 下一次 Agent 接手建议

读取顺序：

1. `AGENTS.md`
2. `PRODUCT_REQUIREMENTS.md`
3. `PROJECT_ARCHITECTURE.md`
4. `IMPLEMENTATION_BACKLOG.md`

然后从 Backlog 的 P0-001 开始。
