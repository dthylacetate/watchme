# WatchMe Deployment

## 目标交付形态

- Agent：打包后的可执行文件。
- Server：一键脚本生成可运行 release 目录。

## Windows Agent

在仓库里执行：

```powershell
Set-Location refactor\agents\windows
.\build.ps1
```

产物：

- `dist\WatchMeAgent\WatchMeAgent.exe`
- `dist\WatchMeAgent\WatchMeAgentWorker.exe`
- `dist\WatchMeAgent.zip`

目标机器上的最短路径：

1. 解压 `WatchMeAgent.zip`
2. 直接运行 `WatchMeAgent.exe`
3. 在管理器里填写：
   - `Server URL`：例如 `http://127.0.0.1:3000` 或 `https://watchme.example.com`
   - `Agent Token`：只填 token 前缀，例如 `desk-token`
4. 点 `Save Config`
5. 点 `Test Connection`
6. 点 `Start Agent`
7. 确认托盘中出现 WatchMe Agent Worker

如果你刚修改过 server 侧 `.env` 中的 `DEVICE_TOKEN_*`，先重启 server，再点 `Test Connection`。因为 server 只会在启动时读取这些 token 映射。

需要单独注册开机自启：

```powershell
.\install-startup.ps1
```

停用 Agent 并做基础清理：

```powershell
.\uninstall-agent.ps1
```

只移除开机自启任务：

```powershell
.\uninstall-startup.ps1
```

## Server 一键部署

### Windows

```powershell
.\refactor\scripts\server\deploy-server.ps1
```

### Linux

```bash
./refactor/scripts/server/deploy-server.sh
```

脚本会完成：

1. 安装仓库依赖
2. 构建前端和后端
3. 生成最小化 release 目录
4. 在 release 目录安装生产依赖
5. 创建 `data/` 和 `logs/`
6. 如果不存在 `.env`，自动从 `.env.example` 复制
7. 重新部署时保留已有 `.env`、`data/`、`logs/` 和 `backups/`
8. 如果 `.env` 已经填好有效配置，会自动做一轮临时启动健康检查

默认 release 目录：

```text
refactor/.release/server
```

启动：

```bash
npm --prefix refactor/.release/server run start
```

Server 会自动读取当前 release 目录下的 `.env`。

第一次部署至少要改这两项：

```env
HASH_SECRET=replace-me-with-a-long-random-string
DEVICE_TOKEN_1=desk-token:my-desktop:My Desktop:windows
```

说明：

- `HASH_SECRET`：随便生成一条足够长的随机字符串
- `DEVICE_TOKEN_1`：给某个 Agent 用的设备令牌定义
- Agent 管理器里填的 `Agent Token`，就是这里最前面的 `desk-token`

### Windows 上怎么管理 Server

release 目录里现在自带两个管理入口：

- `manage-server-ui.cmd` / `manage-server-ui.ps1`：Windows 图形界面管理器
- `manage-server.mjs`：纯命令行交互管理器

Windows 推荐直接双击：

```text
manage-server-ui.cmd
```

它可以直接完成：

- 修改 `PORT`
- 修改 `HASH_SECRET`
- 修改 `DEVICE_TOKEN_1` 对应的 Agent token / device id / device name
- 启动 / 停止 Server
- 健康检查
- 打开日志目录
- 备份数据库

Linux 不提供 UI，直接使用：

```bash
node manage-server.mjs
```

## systemd 示例

```ini
[Unit]
Description=WatchMe Server
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/watchme/refactor/.release/server
EnvironmentFile=/opt/watchme/refactor/.release/server/.env
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

## Nginx 示例

```nginx
server {
  listen 80;
  server_name watchme.example.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

## 说明

- 当前 release 目录依赖 Node 22，因为后端使用了 `node:sqlite`。
- 生产环境建议把 `DB_PATH` 指向 release 目录下的 `data/watchme.db`。
- 可以通过 `RETENTION_DAYS` 和 `CLEANUP_INTERVAL_MINUTES` 控制旧活动自动清理。

## 数据备份

### Windows

```powershell
.\refactor\scripts\server\backup-data.ps1
```

### Linux

```bash
./refactor/scripts/server/backup-data.sh
```

默认会把当前 SQLite 文件复制到 release 目录下的 `backups/`，文件名带时间戳。

## 连续试跑

在 release server 启动后，可以执行：

```powershell
npm run soak:server -- http://127.0.0.1:3999 dev-token 24 100
```

这会连续发送一组模拟前台活动和后台音乐上报，并反复检查 `/api/current` 和 `/api/timeline` 是否正常返回。

部署后快速健康检查：

```powershell
.\refactor\scripts\server\check-release-health.ps1 http://127.0.0.1:3999
```

`deploy-server.ps1` / `deploy-server.sh` 在检测到 `.env` 已经脱离占位值后，也会自动跑一轮同类检查。
