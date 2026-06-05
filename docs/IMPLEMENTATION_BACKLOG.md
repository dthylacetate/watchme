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
| P0-001 | done | 初始化 `refactor/` workspace | 有根 package 配置；能运行 `dev`、`test`、`typecheck` 占位脚本。 |
| P0-002 | done | 建立目录 `apps/server`、`apps/web`、`packages/shared`、`packages/privacy` | 目录存在，并有 README 说明职责。 |
| P0-003 | done | 选择包管理器和运行时 | README 写明选择理由；lockfile 生成。 |
| P0-004 | done | 配置 TypeScript | server/web/shared 能共享基础 tsconfig。 |
| P0-005 | done | 配置测试框架 | 能跑一个示例测试。 |

## P1：共享契约

| ID | 状态 | 任务 | 验收标准 |
| --- | --- | --- | --- |
| P1-001 | done | 定义 `DevicePlatform` schema | 支持 `windows`、`macos`。 |
| P1-002 | done | 定义 `ReportRequest` schema | 能校验 app_id、window_title、timestamp、extra。 |
| P1-003 | done | 定义 `CurrentResponse` schema | 不包含 `window_title`。 |
| P1-004 | done | 定义统一错误响应 | API 错误有稳定结构。 |
| P1-005 | done | 为 schema 写测试 | 合法/非法 payload 都覆盖。 |

## P2：隐私模块

| ID | 状态 | 任务 | 验收标准 |
| --- | --- | --- | --- |
| P2-001 | done | 建立隐私分类规则 | chat/email/finance/system/file 默认隐藏。 |
| P2-002 | done | 实现 `processDisplayTitle` | 输入 app + title，输出安全 display_title。 |
| P2-003 | done | 实现浏览器标题处理 | 登录、邮箱、支付等关键词隐藏。 |
| P2-004 | done | 实现 HMAC 标题哈希 | 相同输入稳定；不同 secret 不同。 |
| P2-005 | done | 实现未知应用默认策略 | 未知应用只展示应用名，不展示标题。 |
| P2-006 | done | 补隐私测试 | 覆盖主要类别和边界。 |

## P3：后端 MVP

| ID | 状态 | 任务 | 验收标准 |
| --- | --- | --- | --- |
| P3-001 | done | 初始化 server app | `/api/health` 返回 ok。 |
| P3-002 | done | 配置读取 | 支持 PORT、DB_PATH、HASH_SECRET、DEVICE_TOKEN_N。 |
| P3-003 | done | 设备 token 鉴权 | 合法 token 绑定设备，非法 token 401。 |
| P3-004 | done | SQLite schema 和 migrations | 有 migrations 表，可重复执行。 |
| P3-005 | done | 实现 `/api/report` | 写入 device state 和 activity；不保存原始标题。 |
| P3-006 | done | 实现 `/api/current` | 返回公开设备状态。 |
| P3-007 | done | 实现 `/api/timeline` | 支持 date、tz、device_id。 |
| P3-008 | done | 后端集成测试 | 覆盖 report/current/timeline。 |
| P3-009 | done | 后台音乐独立时间线 | 即使焦点不在播放器上，切歌和听歌时长也会继续更新。 |
| P3-010 | done | 数据清理任务和保留策略 | 可配置清理 30 天前的活动。 |
| P3-011 | done | 已打开应用用量统计 | 后台仍打开的应用会继续累计，音乐播放器不混入应用摘要。 |

## P4：Web MVP

| ID | 状态 | 任务 | 验收标准 |
| --- | --- | --- | --- |
| P4-001 | done | 初始化 web app | 能访问空状态页面。 |
| P4-002 | done | 实现 API client | 使用 shared 类型。 |
| P4-003 | done | 当前状态组件 | 在线/离线/空状态可展示。 |
| P4-004 | done | 设备列表组件 | 多设备状态可展示。 |
| P4-005 | done | 时间线组件 | 展示当天活动和应用用量。 |
| P4-006 | done | 响应式检查 | 375px 宽度不崩。 |
| P4-007 | done | 浏览器验收 | 本地真实浏览器检查布局、空态和错误态。 |
| P4-008 | done | 前端视觉回贴参考稿 | 头部、状态区、设备卡片和时间线风格更接近参考前端。 |
| P4-009 | done | 前端访客计数和状态文案优化 | viewer id 可区分访客；应用描述按类别输出更自然的短句。 |

## P5：桌面 Agent

| ID | 状态 | 任务 | 验收标准 |
| --- | --- | --- | --- |
| P5-001 | done | 建立 Windows Agent 目录 | 有配置、采集、上报模块骨架。 |
| P5-002 | done | Windows 前台窗口采集 | 能输出 app_id 和 window_title。 |
| P5-003 | done | Windows Reporter | 能向本地 server 上报。 |
| P5-004 | done | 建立 macOS Agent 目录 | 有配置、采集、上报模块骨架。 |
| P5-005 | doing | macOS 前台窗口采集 | 代码已实现 AppleScript 采集；仍需要实机 Accessibility 权限验证。 |
| P5-006 | done | macOS Reporter | 本地 HTTP 测试覆盖 health、device auth 和 report 上报闭环。 |
| P5-007 | done | Windows 媒体变化独立触发上报 | 切歌不依赖前台窗口切换。 |
| P5-008 | done | Windows 托盘和安装体验 | 有托盘菜单、配置入口和安装说明。 |
| P5-009 | done | Windows Agent 打包脚本 | 可生成 `.exe`、`zip` 和自启安装脚本。 |
| P5-010 | done | Windows Agent 停用和卸载脚本 | 可移除自启任务、停止进程，并按需清理日志或配置。 |
| P5-011 | done | Windows Agent 一键安装入口 | 解压后可直接执行脚本完成配置模板、自启注册和首次启动。 |
| P5-012 | done | Windows Agent 图形管理器 | 有可见界面统一处理配置、连接测试、启动停止和开机自启。 |
| P5-013 | done | macOS 安装和自启动体验 | 已提供图形管理器、launchd 自启动安装 / 卸载脚本和 `.app` 打包脚本。 |
| P5-014 | doing | macOS 媒体播放器实机适配 | Spotify、Apple Music、QQ 音乐、网易云音乐已接入；QQ / 网易云仍需实机确认脚本接口和窗口标题格式。 |
| P5-015 | todo | macOS 长时间稳定性试跑 | 打包后至少连续运行 24 小时，观察日志、权限、launchd 重启和上报稳定性。 |

## P6：部署

| ID | 状态 | 任务 | 验收标准 |
| --- | --- | --- | --- |
| P6-001 | done | 直接部署脚本 | 一条命令构建前端、安装依赖、准备数据目录。 |
| P6-002 | done | systemd service 示例 | 后端能作为常驻服务启动、重启和查看日志。 |
| P6-003 | done | Nginx/Caddy 反代示例 | 支持 HTTPS 和 API 速率限制建议。 |
| P6-004 | done | 部署文档 | 新机器可按文档部署。 |
| P6-005 | done | 数据备份说明 | SQLite 数据位置和备份方式明确。 |
| P6-006 | done | release 健康检查脚本 | 启动后可一键检查 health/config/current/timeline。 |
| P6-007 | done | Server Windows 图形管理器 | 可视化修改 `.env`、启动停止、健康检查和备份。 |
| P6-008 | done | Server 命令行交互管理器 | Linux / 通用环境可通过纯命令行交互管理 release。 |
