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

### Linux 端口访问完整部署

这一节适合不绑定域名，直接用 `http://服务器公网IP:3000` 访问的部署方式。

以下示例把项目放在 `/opt/watchme`，端口使用 `3000`。如果你的目录或端口不同，替换对应路径和端口即可。

1. 安装基础工具和 Node 22

```bash
sudo apt update
sudo apt install -y git curl
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 22
nvm use 22
node -v
npm -v
```

后端使用 `node:sqlite`，所以需要 Node 22 或更新版本。

2. 克隆仓库

```bash
cd /opt
sudo git clone git@github.com:dthylacetate/watchme.git
sudo chown -R "$USER":"$USER" /opt/watchme
cd /opt/watchme
```

如果服务器没有配置 GitHub SSH key，也可以先用 HTTPS：

```bash
git clone https://github.com/dthylacetate/watchme.git
```

3. 生成 server release

```bash
cd /opt/watchme
chmod +x refactor/scripts/server/deploy-server.sh
./refactor/scripts/server/deploy-server.sh
```

release 目录会生成在：

```text
/opt/watchme/refactor/.release/server
```

4. 配置 `.env`

```bash
nano /opt/watchme/refactor/.release/server/.env
```

最少需要改成类似这样：

```env
PORT=3000
DB_PATH=./data/watchme.db
STATIC_DIR=./public
HASH_SECRET=<用 openssl rand -hex 32 生成的随机字符串>
OFFLINE_AFTER_SECONDS=120
RETENTION_DAYS=30
CLEANUP_INTERVAL_MINUTES=60
DISPLAY_NAME=WatchMe
SITE_TITLE=WatchMe Now
SITE_DESC=What is WatchMe doing right now?
SITE_FAVICON=/favicon.ico
DEVICE_TOKEN_1=windows-token:my-windows:My Windows PC:windows
DEVICE_TOKEN_2=mac-token:my-mac:My MacBook:macos
```

生成 `HASH_SECRET`：

```bash
openssl rand -hex 32
```

`DEVICE_TOKEN_N` 格式是：

```text
<agent-token>:<device-id>:<display-name>:<platform>
```

Windows Agent Manager 里只填最前面的 `<agent-token>`，例如上面的 `windows-token`。`platform` 目前支持 `windows` 和 `macos`。

5. 手动启动做一次检查

```bash
npm --prefix /opt/watchme/refactor/.release/server run start
```

另开一个 SSH 窗口检查：

```bash
curl http://127.0.0.1:3000/api/health
```

如果返回 `status: ok`，按 `Ctrl+C` 停掉手动启动的 server，继续配置 systemd。

6. 写入 systemd 服务

先确认 npm 路径：

```bash
which npm
```

创建服务文件：

```bash
sudo nano /etc/systemd/system/watchme.service
```

写入下面内容。如果 `which npm` 输出不是 `/usr/bin/npm`，把 `ExecStart` 的路径改成你的实际 npm 路径。

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

启动并设为开机自启：

```bash
sudo systemctl daemon-reload
sudo systemctl enable watchme
sudo systemctl start watchme
sudo systemctl status watchme
```

查看实时日志：

```bash
journalctl -u watchme -f
```

7. 放行端口

如果服务器使用 `ufw`：

```bash
sudo ufw allow 3000/tcp
sudo ufw status
```

如果是云服务器，还需要在云厂商安全组里放行：

```text
TCP 3000
来源 0.0.0.0/0
```

8. 访问和 Agent 配置

浏览器访问：

```text
http://服务器公网IP:3000
```

Windows Agent Manager 填：

```text
Server URL: http://服务器公网IP:3000
Agent Token: windows-token
```

然后依次点击：

```text
Save Config
Test Connection
Start Agent
```

如果修改了 server `.env` 里的 `DEVICE_TOKEN_*`，需要重启 server 后 Agent 的 `Test Connection` 才会认到新 token：

```bash
sudo systemctl restart watchme
```

### Linux 服务器更新代码并重新部署

后续项目有新提交后，在服务器上执行：

```bash
cd /opt/watchme
git pull
./refactor/scripts/server/deploy-server.sh
sudo systemctl restart watchme
sudo systemctl status watchme
```

部署脚本会保留 release 里的：

```text
.env
data/
logs/
backups/
```

所以正常更新不会覆盖你的 token、数据库和日志。

更新后可以检查：

```bash
curl http://127.0.0.1:3000/api/health
curl "http://127.0.0.1:3000/api/current"
```

如果改过端口，把 `3000` 换成你的 `PORT`。

常用维护命令：

```bash
sudo systemctl restart watchme
sudo systemctl stop watchme
sudo systemctl start watchme
sudo systemctl status watchme
journalctl -u watchme -f
```

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
OFFLINE_AFTER_SECONDS=120
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
