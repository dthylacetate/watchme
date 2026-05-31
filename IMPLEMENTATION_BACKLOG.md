# WatchMe 实施任务清单

这份清单给后续 Agent 直接执行。任务按优先级和依赖顺序排列。

状态说明：

- `todo`：未开始。
- `doing`：进行中。
- `done`：已完成。
- `blocked`：阻塞。

## P0：项目骨架

| ID | 状态 | 任务 | 验收标准 |
| --- | --- | --- | --- |
| P0-001 | todo | 初始化 `refactor/` workspace | 有根 package 配置；能运行 `dev`、`test`、`typecheck` 占位脚本。 |
| P0-002 | todo | 建立目录 `apps/server`、`apps/web`、`packages/shared`、`packages/privacy` | 目录存在，并有 README 说明职责。 |
| P0-003 | todo | 选择包管理器和运行时 | README 写明选择理由；lockfile 生成。 |
| P0-004 | todo | 配置 TypeScript | server/web/shared 能共享基础 tsconfig。 |
| P0-005 | todo | 配置测试框架 | 能跑一个示例测试。 |

## P1：共享契约

| ID | 状态 | 任务 | 验收标准 |
| --- | --- | --- | --- |
| P1-001 | todo | 定义 `DevicePlatform` schema | 支持 `windows`、`macos`。 |
| P1-002 | todo | 定义 `ReportRequest` schema | 能校验 app_id、window_title、timestamp、extra。 |
| P1-003 | todo | 定义 `CurrentResponse` schema | 不包含 `window_title`。 |
| P1-004 | todo | 定义统一错误响应 | API 错误有稳定结构。 |
| P1-005 | todo | 为 schema 写测试 | 合法/非法 payload 都覆盖。 |

## P2：隐私模块

| ID | 状态 | 任务 | 验收标准 |
| --- | --- | --- | --- |
| P2-001 | todo | 建立隐私分类规则 | chat/email/finance/system/file 默认隐藏。 |
| P2-002 | todo | 实现 `processDisplayTitle` | 输入 app + title，输出安全 display_title。 |
| P2-003 | todo | 实现浏览器标题处理 | 登录、邮箱、支付等关键词隐藏。 |
| P2-004 | todo | 实现 HMAC 标题哈希 | 相同输入稳定；不同 secret 不同。 |
| P2-005 | todo | 实现未知应用默认策略 | 未知应用只展示应用名，不展示标题。 |
| P2-006 | todo | 补隐私测试 | 覆盖主要类别和边界。 |

## P3：后端 MVP

| ID | 状态 | 任务 | 验收标准 |
| --- | --- | --- | --- |
| P3-001 | todo | 初始化 server app | `/api/health` 返回 ok。 |
| P3-002 | todo | 配置读取 | 支持 PORT、DB_PATH、HASH_SECRET、DEVICE_TOKEN_N。 |
| P3-003 | todo | 设备 token 鉴权 | 合法 token 绑定设备，非法 token 401。 |
| P3-004 | todo | SQLite schema 和 migrations | 有 migrations 表，可重复执行。 |
| P3-005 | todo | 实现 `/api/report` | 写入 device state 和 activity；不保存原始标题。 |
| P3-006 | todo | 实现 `/api/current` | 返回公开设备状态。 |
| P3-007 | todo | 实现 `/api/timeline` | 支持 date、tz、device_id。 |
| P3-008 | todo | 后端集成测试 | 覆盖 report/current/timeline。 |

## P4：Web MVP

| ID | 状态 | 任务 | 验收标准 |
| --- | --- | --- | --- |
| P4-001 | todo | 初始化 web app | 能访问空状态页面。 |
| P4-002 | todo | 实现 API client | 使用 shared 类型。 |
| P4-003 | todo | 当前状态组件 | 在线/离线/空状态可展示。 |
| P4-004 | todo | 设备列表组件 | 多设备状态可展示。 |
| P4-005 | todo | 时间线组件 | 展示当天活动和应用用量。 |
| P4-006 | todo | 响应式检查 | 375px 宽度不崩。 |

## P5：桌面 Agent

| ID | 状态 | 任务 | 验收标准 |
| --- | --- | --- | --- |
| P5-001 | todo | 建立 Windows Agent 目录 | 有配置、采集、上报模块骨架。 |
| P5-002 | todo | Windows 前台窗口采集 | 能输出 app_id 和 window_title。 |
| P5-003 | todo | Windows Reporter | 能向本地 server 上报。 |
| P5-004 | todo | 建立 macOS Agent 目录 | 有配置、采集、上报模块骨架。 |
| P5-005 | todo | macOS 前台窗口采集 | 能输出 app_id 和 window_title，需要实机验证。 |
| P5-006 | todo | macOS Reporter | 能向本地 server 上报。 |

## P6：部署

| ID | 状态 | 任务 | 验收标准 |
| --- | --- | --- | --- |
| P6-001 | todo | 直接部署脚本 | 一条命令构建前端、安装依赖、准备数据目录。 |
| P6-002 | todo | systemd service 示例 | 后端能作为常驻服务启动、重启和查看日志。 |
| P6-003 | todo | Nginx/Caddy 反代示例 | 支持 HTTPS 和 API 速率限制建议。 |
| P6-004 | todo | 部署文档 | 新机器可按文档部署。 |
| P6-005 | todo | 数据备份说明 | SQLite 数据位置和备份方式明确。 |
