# WatchMe 开发路线图

这份路线图描述 WatchMe 作为独立项目的建设顺序。目标不是复刻任何现有实现，而是从需求出发，做一个边界清晰、隐私可靠、容易个人部署的状态仪表盘。

## 1. 总体目标

WatchMe 第一阶段要完成一个稳定闭环：

```text
Windows/macOS Agent -> WatchMe Server -> SQLite -> WatchMe Web
```

核心判断：

- 桌面 Agent 是数据入口。
- 隐私策略是产品核心。
- Web 仪表盘是公开展示面。
- SQLite 和单容器部署是 MVP 的默认选择。

## 2. 目标目录

```text
refactor/
  apps/
    server/              # API、数据库、静态文件托管、后台任务
    web/                 # 仪表盘前端
  agents/
    windows/             # Windows 桌面 Agent
    macos/               # macOS 桌面 Agent
  packages/
    shared/              # API schema、通用类型、日期工具
    privacy/             # 隐私规则、标题处理、敏感内容过滤
    app-catalog/          # 应用识别、展示名、描述模板
    db/                  # SQLite schema、迁移、查询封装
    ui/                  # 可选 UI 组件库
  docs/
    architecture.md
    api.md
    privacy.md
    deployment.md
  scripts/
    dev.ps1
    dev.sh
    migrate.ts
```

## 3. 技术方向

后端：

- Bun 或 Node 均可，优先选择项目启动和部署更顺手的方案。
- API 层建议使用 Hono 或类似轻量框架。
- Schema 使用 Zod、Valibot 或 TypeBox。
- SQLite 作为默认存储。
- 数据迁移必须有版本记录。

前端：

- Vite + React 或 Next static export 都可。
- 如果不需要 SSR，Vite 更轻。
- UI 先做清晰可用，再做主题化和特殊视图。

Agent：

- Python 是 MVP 的现实选择，方便调用系统 API 和打包。
- Windows/macOS 分别维护平台采集逻辑，不强行抽象。
- 上报 payload 与后端共享 schema。

实时策略：

- MVP 使用 5-10 秒轮询。
- 稳定后可升级 SSE。

## 4. 阶段计划

### 阶段 0：产品定稿

目标：明确 WatchMe 自己的产品边界。

任务：

- 完成 `PRODUCT_REQUIREMENTS.md`。
- 确定 MVP 不包含 Android、多用户、AI 默认总结、健康数据默认展示。
- 明确公开字段和隐私规则。
- 确定单分支工作方式。

验收：

- README 打开后呈现独立项目。
- references 被标记为调研资料。
- 所有新源码位置明确为 `refactor/`。

### 阶段 1：项目骨架

目标：建立可运行的空项目。

任务：

- 初始化 workspace。
- 建立 `apps/server`、`apps/web`、`packages/shared`。
- 配置 `dev`、`build`、`test`、`typecheck`。
- 添加基础 CI 脚本或本地验证脚本。
- 建立 Dockerfile 雏形。

验收：

- 一条命令启动 server 和 web。
- 一条命令跑完 typecheck 和测试。
- Docker 能构建最小镜像。

### 阶段 2：共享契约

目标：先定义数据边界，再写业务。

任务：

- 定义 `DevicePlatform`。
- 定义 `ReportRequest`。
- 定义 `PublicDeviceState`。
- 定义 `TimelineResponse`。
- 定义 `ExtraPayload`。
- 定义统一错误响应。

验收：

- 前端、后端、Agent 都引用同一份 schema 或生成物。
- schema 测试覆盖合法和非法 payload。

### 阶段 3：隐私核心

目标：把隐私逻辑作为独立模块完成。

任务：

- 建立应用分类规则。
- 建立标题处理函数。
- 建立浏览器标题敏感词规则。
- 建立 HMAC 标题哈希工具。
- 建立 NSFW 或敏感内容过滤。
- 建立 allowlist 配置结构。

默认策略：

- 聊天、邮箱、金融、系统、文件：隐藏标题。
- 浏览器：默认谨慎，敏感关键词隐藏。
- IDE、视频、音乐、游戏：允许展示处理后的安全标题。
- 未知应用：只展示应用名。

验收：

- 隐私测试覆盖主要类别。
- 原始窗口标题不会出现在公开 DTO 中。

### 阶段 4：后端 MVP

目标：完成可接收上报、可查询状态的后端。

任务：

- 配置读取。
- token 鉴权。
- SQLite schema。
- migrations 表。
- `/api/report`。
- `/api/current`。
- `/api/timeline`。
- `/api/config`。
- `/api/health`。
- 离线检测任务。
- 数据清理任务。

验收：

- 无 token 上报返回 401。
- 合法上报写入设备状态和活动记录。
- 原始标题不入库。
- 时间线能按本地日期查询。
- 当前状态 API 不包含敏感字段。

### 阶段 5：Web MVP

目标：完成第一版可用仪表盘。

任务：

- API client。
- 当前状态卡。
- 设备列表。
- 日期选择。
- 今日活动视图。
- 应用用量汇总。
- 空状态、错误状态、加载状态。
- 基础主题变量。

验收：

- 无设备时页面可读。
- 设备在线时能显示当前公开状态。
- 设备离线时有清楚状态。
- 移动端宽度不崩。

### 阶段 6：Windows Agent

目标：完成 Windows 上报闭环。

任务：

- 配置读取和校验。
- 前台窗口采集。
- AFK 检测。
- 音频/全屏免 AFK。
- 电池信息。
- 音乐信息。
- Reporter 退避重试。
- 托盘菜单。
- 打包脚本。

验收：

- 能向本地后端上报。
- 断网后不会高频重试。
- 音乐/全屏场景不误判 AFK。
- 配置错误有明确提示。

### 阶段 7：macOS Agent

目标：完成 macOS 上报闭环。

任务：

- 配置读取和校验。
- AppleScript 前台应用采集。
- ioreg 空闲时间采集。
- pmset 音频判断。
- 全屏判断。
- 电池信息。
- 音乐信息。
- 菜单栏状态。
- launchd 文档。

验收：

- 至少一台 macOS 实机验证。
- 权限缺失时给出明确提示。
- 配置模板字段完整。

### 阶段 8：部署和迁移

目标：让项目能被长期运行。

任务：

- Docker 单容器。
- docker-compose 示例。
- Nginx 反代示例。
- 环境变量文档。
- 数据库备份和迁移说明。
- 从旧格式导入或兼容 `/api/report` 的说明。

验收：

- 新机器按文档可部署。
- 旧 Agent 核心上报格式可兼容，或迁移步骤明确。
- 数据卷重建容器不丢数据。

## 5. 后续功能池

稳定后再考虑：

- SSE 实时更新。
- Pixel Room 可选视图。
- 每日总结。
- 更丰富的统计页。
- 数据导出。
- 健康数据独立开关。
- 多主题。

## 6. 参考资料使用规则

`references/` 中的内容只作为研究材料：

- 可以阅读。
- 可以摘取设计思路。
- 可以对照 API 兼容。
- 不直接在其中开发。
- 不直接把构建产物搬入新源码。

正式实现以 `PRODUCT_REQUIREMENTS.md` 和本路线图为准。

