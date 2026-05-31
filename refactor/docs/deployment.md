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
- `dist\WatchMeAgent.zip`

目标机器上的最短路径：

1. 解压 `WatchMeAgent.zip`
2. 把 `config.example.json` 复制成 `config.json`
3. 填好 `server_url` 和 `token`
4. 运行 `WatchMeAgent.exe`，程序会常驻系统托盘
5. Agent 带单实例保护，重复启动时会忽略后来的实例

需要开机自启：

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
.\refactor\scripts\deploy-server.ps1
```

### Linux

```bash
./refactor/scripts/deploy-server.sh
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
.\refactor\scripts\backup-data.ps1
```

### Linux

```bash
./refactor/scripts/backup-data.sh
```

默认会把当前 SQLite 文件复制到 release 目录下的 `backups/`，文件名带时间戳。

## 连续试跑

在 release server 启动后，可以执行：

```powershell
npm run soak:server -- http://127.0.0.1:3999 dev-token 24 100
```

这会连续发送一组模拟前台活动和后台音乐上报，并反复检查 `/api/current` 与 `/api/timeline` 是否正常返回。

部署后快速健康检查：

```powershell
.\refactor\scripts\check-release-health.ps1 http://127.0.0.1:3999
```

`deploy-server.ps1` / `deploy-server.sh` 在检测到 `.env` 已经脱离占位值后，也会自动跑一轮同类检查。
