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

WatchMe 目前处于需求整理和架构设计阶段。已经完成：

- 产品需求草案。
- 参考 API 和数据模型梳理。
- Windows/macOS Agent 研究。
- 前端视觉方向研究。
- 独立 Git 仓库初始化。

新的正式源码会放在 [refactor/](./refactor/) 下逐步建设。

## 目录

```text
watchme/
  README.md                         # 项目入口
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
  refactor/                         # WatchMe 新项目源码位置
  references/upstream-branches/      # 调研快照，不作为主源码开发
```

## 核心模块规划

```text
refactor/
  apps/
    server/          # API、数据库、静态文件托管、后台任务
    web/             # 仪表盘前端
  agents/
    windows/         # Windows 桌面 Agent
    macos/           # macOS 桌面 Agent
  packages/
    shared/          # API schema、通用类型、日期工具
    privacy/         # 标题处理、隐私分级、敏感内容过滤
    app-catalog/     # 应用识别、展示名、描述模板
    db/              # SQLite schema、迁移、查询封装
```

## MVP 范围

第一版只做最核心的闭环：

- Windows/macOS Agent 上报当前前台应用、窗口标题、电池、音乐状态和 AFK 状态。
- 后端鉴权、隐私处理、SQLite 存储、当前状态 API、时间线 API。
- 前端展示当前状态、设备列表、今日时间线、基础统计和离线状态。
- 直接部署运行：后端常驻服务、前端静态构建、SQLite 数据目录、反向代理。
- 隐私策略和 API schema 有测试。

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
