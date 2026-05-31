# WatchMe Windows Agent

Windows 这一侧现在分成两部分：

- `WatchMeAgent.exe`：可见的管理器，负责填写 `server_url` / `token`、测试连接、启动 / 停止后台 Agent、开关开机自启。
- `WatchMeAgentWorker.exe`：真正常驻托盘并持续上报状态的后台进程。

## 开发运行

1. 创建虚拟环境并安装依赖：

```powershell
py -3.12 -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2. 如果只想跑后台 Worker：

```powershell
python agent.py
```

3. 如果想直接打开管理器界面：

```powershell
python manager.py
```

## 打包输出

```powershell
.\build.ps1
```

输出目录：

- `dist\WatchMeAgent\WatchMeAgent.exe`
- `dist\WatchMeAgent\WatchMeAgentWorker.exe`
- `dist\WatchMeAgent\config.example.json`
- `dist\WatchMeAgent\install-agent.ps1`
- `dist\WatchMeAgent.zip`

## 给自己部署时怎么用

1. 解压 `WatchMeAgent.zip`
2. 双击运行 `WatchMeAgent.exe`
3. 在窗口里填写：
   - `Server URL`：你的服务端地址，比如 `http://127.0.0.1:3000` 或 `https://watchme.example.com`
   - `Agent Token`：只填 token 本身，比如 `desk-token`
4. 点 `Save Config`
5. 点 `Test Connection`
6. 点 `Start Agent`
7. 需要开机自启时，再点 `Enable Startup`

也可以执行：

```powershell
.\install-agent.ps1
```

这个脚本会帮你准备 `config.json` 并打开管理器。

## Server 端 token 怎么对应

在服务端 `.env` 里要配置完整的 `DEVICE_TOKEN_1` 行，例如：

```env
DEVICE_TOKEN_1=desk-token:my-desktop:My Desktop:windows
```

这里：

- `desk-token` 是你在 Agent 管理器里填写的 `Agent Token`
- `my-desktop` 是设备 ID
- `My Desktop` 是前端显示名
- `windows` 是设备平台

Agent 管理器窗口里也会实时给你显示这条 `.env` 示例。

## 管理器能做什么

- 保存 `config.json`
- 测试服务端连通性
- 启动后台 Worker
- 停止后台 Worker
- 注册 / 移除开机自启
- 打开日志目录
- 打开 Agent 所在目录

## 卸载 / 清理

停用并清理：

```powershell
.\uninstall-agent.ps1
```

只移除开机自启：

```powershell
.\uninstall-startup.ps1
```

## 已知限制

- `Test Connection` 现在会同时验证服务端可达性和 Bearer token 鉴权；如果改了 server 端 `.env` 里的 `DEVICE_TOKEN_*`，记得先重启 server 再测试。
- 媒体读取依赖 Windows Global System Media Transport Controls，部分播放器可能不暴露完整元数据。
