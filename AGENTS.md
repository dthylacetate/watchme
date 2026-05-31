# Agent 开发入口

这份文件给后续接手 WatchMe 的 Agent 使用。开始开发前，先读本文件，再按顺序读取相关文档。

## 当前任务定位

WatchMe 是一个独立项目，不是对 `references/` 中任何项目的直接改造。

你要在 `refactor/` 中建设正式源码。`references/` 只用于查阅历史实现、API 兼容和设计灵感，不要在 `references/` 里开发，也不要把其中的构建产物当作新项目源码。

## 必读顺序

1. [README.md](./README.md)：项目定位和目录说明。
2. [PRODUCT_REQUIREMENTS.md](./PRODUCT_REQUIREMENTS.md)：产品需求和 MVP 范围。
3. [PROJECT_ARCHITECTURE.md](./PROJECT_ARCHITECTURE.md)：目标架构、模块边界和数据流。
4. [DEVELOPMENT_PROGRESS.md](./DEVELOPMENT_PROGRESS.md)：当前进度、已完成事项和下一步。
5. [IMPLEMENTATION_BACKLOG.md](./IMPLEMENTATION_BACKLOG.md)：可执行任务列表。

需要兼容旧数据或旧 API 时再读：

- [CURRENT_API_AND_DATA.md](./CURRENT_API_AND_DATA.md)
- [PROJECT_ANALYSIS.md](./PROJECT_ANALYSIS.md)
- [UPSTREAM_BRANCH_ANALYSIS.md](./UPSTREAM_BRANCH_ANALYSIS.md)

## 当前开发原则

- 新源码只写在 `refactor/`。
- 默认使用 `main` 分支。
- 默认隐私策略要保守：未知应用不展示窗口标题。
- 前后端和 Agent 必须共享 API schema 或使用同源生成物。
- 每个核心隐私规则都要有测试。
- 不要把 Android 纳入 MVP。
- 不要默认启用健康数据或 AI 总结。
- 不要把 Docker 当作开发主路径；优先实现直接运行、部署脚本和 systemd/Nginx 文档。

## 第一阶段建议动作

如果用户要求“开始开发”，优先做这些：

1. 在 `refactor/` 初始化 workspace。
2. 建立 `packages/shared`，定义 API schema。
3. 建立 `packages/privacy`，实现标题处理和测试。
4. 建立 `apps/server`，先实现 `/api/health`。
5. 建立 `apps/web`，先实现空状态页面。

不要一开始就迁移 UI 大文件或 Agent 大脚本。先把项目骨架、测试和共享契约立住。

## 完成工作后

每次完成开发任务后，应更新：

- [DEVELOPMENT_PROGRESS.md](./DEVELOPMENT_PROGRESS.md)
- 如任务状态有变化，更新 [IMPLEMENTATION_BACKLOG.md](./IMPLEMENTATION_BACKLOG.md)
- 如架构发生变化，更新 [PROJECT_ARCHITECTURE.md](./PROJECT_ARCHITECTURE.md)
