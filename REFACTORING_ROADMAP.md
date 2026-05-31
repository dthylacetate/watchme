# 重构路线图

这个文件描述下一版项目建议怎么放、怎么拆、怎么一步步替换旧实现。目标不是“全部重写得更复杂”，而是把当前项目已经好的部分保留下来，同时把不可持续的地方收束成清晰边界。

## 1. 重构目标

新项目建议放在：

```text
watchme/refactor/
```

目标：

- 保留个人部署友好：单容器、SQLite、低资源占用。
- 保留隐私优先：原始窗口标题默认不入库。
- 建立共享契约：前端、后端、Agent 共用 schema。
- 建立可验证基础：每次改隐私规则、时间线和 API 都能跑测试。
- 让未来 Agent 和移动端可以自然接入。

## 2. 推荐新目录

```text
watchme/refactor/
  apps/
    server/              # API、静态托管、任务调度
    web/                 # Next 或 Vite 前端
  agents/
    windows/             # 从 upstream windows-source 重构迁入
    macos/               # 从 upstream macos-source 重构迁入，需实机验证
  packages/
    shared/              # API schema、通用类型、日期工具
    privacy/             # 隐私分级、标题处理、NSFW 策略
    app-catalog/          # 应用映射和描述数据
    db/                  # SQLite schema、迁移、查询
    ui/                  # 可选，若保留 React 组件库
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

如果希望更轻，也可以先只做：

```text
watchme/refactor/
  server/
  web/
  shared/
  docs/
```

## 3. 技术选型建议

### 后端

保守方案：继续使用 Bun 原生 HTTP + SQLite。

适合原因：

- 当前代码已经能跑在 Bun。
- 容器简单，体积小。
- 个人项目不需要复杂服务框架。

建议增强：

- 加一个轻量路由层，例如 Hono，统一中间件、错误处理和类型推导。
- 用 Zod、Valibot 或 TypeBox 管 API schema。
- 用 Drizzle 或 Kysely 管迁移和 SQL 类型，或者至少自建 migrations 表。

### 前端

两条路线都可行：

- 继续 Next static export：保留现有部署模型。
- 改 Vite + React：如果不需要 Next 的 App Router，构建和心智负担更轻。

如果重点是个人仪表盘而不是 SEO，Vite 会更适合重构版。若想保留当前站点配置注入和未来页面扩展，Next 也可以继续。

### 数据推送

短期保留 10 秒轮询，先完成结构重构。  
中期改为 SSE：

- 后端实现简单。
- 浏览器原生支持。
- 比 WebSocket 更适合单向状态更新。

## 4. 分阶段计划

### 阶段 0：冻结旧项目

- 保持原项目只读。
- 所有新文档和新项目都放进 `watchme/`。
- 记录旧项目 API 和数据表，确认哪些行为必须兼容。
- 下载并归档上游有用分支：`main`、`windows-source`、`macos-source`、两个前端 redesign 分支；跳过 Android。

产物：

- `watchme/PROJECT_ANALYSIS.md`
- `watchme/REFACTORING_ROADMAP.md`
- 旧 API 兼容清单
- 上游分支取舍清单

### 阶段 1：搭建新骨架

- 在 `watchme/refactor/` 初始化 workspace。
- 配置统一脚本：`dev`、`build`、`test`、`lint`、`typecheck`。
- 建立 shared schema。
- 建立 server health endpoint。
- 建立 web 空仪表盘页面。

验收：

- 一条命令启动前后端。
- 一条命令跑完 typecheck 和 test。
- Docker 能构建最小镜像。

### 阶段 2：迁移核心后端

迁移顺序：

1. 配置读取。
2. token 鉴权。
3. SQLite schema 和 migrations。
4. `/api/report`。
5. `/api/current`。
6. `/api/timeline`。
7. `/api/health-data`。
8. 静态文件托管。

重构重点：

- 请求体全部 schema 校验。
- 错误响应统一。
- title 处理和入库分开测试。
- 时间线 duration 计算单独成纯函数。
- 数据库查询避免在 indexed column 上直接套 `date()`。

### 阶段 3：迁移前端

迁移顺序：

1. API client。
2. dashboard state。
3. 当前状态卡。
4. 设备列表。
5. 日期选择。
6. 活动视图。
7. 健康视图。
8. 站点配置和 metadata。

重构重点：

- 使用共享 API 类型。
- 把文案和应用描述从组件中抽离。
- 把全局 CSS 拆成 theme、layout、components、animations。
- 统一中英文 UI 文案。
- 增加空状态、错误状态和加载状态快照测试。

可参考素材：

- `redesign/blossom-letter`：OKLCH 色彩、双栏信息架构、Top 应用统计、每日总结方向。
- `redesign/pixel-room`：PixelRoom 可选视图、SVG 设备房间、day/night prop 边界。

### 阶段 4：隐私策略产品化

当前隐私策略是硬编码。建议重构为：

```text
privacy/
  rules.default.json
  process-title.ts
  nsfw.ts
  tests/
```

建议策略：

- 默认未知应用：`hide_title`。
- 允许用户配置 allowlist：哪些应用可以展示标题。
- 浏览器标题默认隐藏，只对视频/音乐等明确站点展示。
- 健康数据默认可关闭公开查询。
- 所有策略变更都有测试用例。

### 阶段 4.5：迁移桌面 Agent

Windows：

- 迁入前台窗口检测、音频/全屏免 AFK、电池、音乐识别、托盘设置和 Reporter 退避。
- 把 `agent.py` 拆为 `config`、`collector`、`reporter`、`tray`、`music`。
- 给音乐标题解析和配置校验补单元测试。

macOS：

- 迁入 AppleScript 前台窗口、ioreg 空闲时间、pmset 音频判断、电池、音乐识别。
- 修正 config 模板缺少 `idle_threshold_seconds` 的问题。
- 标记为需要 macOS 实机验证；没有实机前不要承诺稳定发布。

### 阶段 5：兼容迁移

旧数据库迁移到新数据库时要考虑：

- `activities` 保留历史。
- `device_states` 可重新生成，但最好迁移最后状态。
- `health_records` 保留。
- `window_title` 旧列为空，不需要迁移敏感原文。
- `title_hash` 依赖同一个 `HASH_SECRET`，如果换密钥，历史去重不可复用。

产物：

- `scripts/migrate-old-db.ts`
- 迁移前备份说明。
- 迁移后校验命令。

## 5. API 契约建议

核心 schema：

```ts
DevicePlatform = "windows" | "macos" | "android"

ReportRequest = {
  app_id: string
  window_title?: string
  timestamp?: string
  extra?: {
    battery_percent?: number
    battery_charging?: boolean
    music?: {
      title?: string
      artist?: string
      app?: string
    }
  }
}

CurrentResponse = {
  devices: PublicDeviceState[]
  recent_activities: PublicActivity[]
  server_time: string
  viewer_count: number
}
```

原则：

- Agent 输入和公开输出分开定义。
- 数据库 row 和 API DTO 分开定义。
- 公开 DTO 不包含 `window_title` 字段，即使为空也不要出现。
- 每个公开字段都说明隐私含义。

## 6. 测试清单

最小测试集：

- `processDisplayTitle`：
  - 聊天应用标题隐藏。
  - 浏览器登录/支付/邮箱标题隐藏。
  - 视频标题可展示。
  - 未知应用按新策略隐藏或只显示应用名。
- `isNSFW`：
  - app id 命中。
  - 域名命中。
  - 子域名命中。
  - 关键词命中。
- `report`：
  - 无 token 401。
  - 无 app_id 400。
  - title 截断。
  - raw title 不入库。
  - extra 白名单。
- `timeline`：
  - 同设备相邻活动计算 duration。
  - 跨设备互不影响。
  - 大间隔截断。
  - 时区日期边界。
- `health-data`：
  - 批量插入上限。
  - 重复记录不重复写入。
  - 非法类型跳过。

## 7. 新项目验收标准

第一版重构完成不需要比旧版功能更多，但必须满足：

- 能用一个命令本地启动。
- 能构建 Docker 镜像。
- 能导入或复用旧数据库。
- 旧 Agent 继续能调用 `/api/report`。
- 公开页面能展示当前状态、设备、活动和健康数据。
- 所有隐私处理逻辑有测试。
- 文档说明哪些数据会公开、哪些不会公开。
