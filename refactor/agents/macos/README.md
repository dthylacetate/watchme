# WatchMe macOS Agent

macOS Agent 现在已经有第一版 Worker 实现，目标行为和 Windows 端一致：采集当前活动，按共享 API 契约上报给 WatchMe Server，隐私判断仍由服务端统一处理。

## 当前能力

- 读取 `config.json`，缺失时从 `config.example.json` 复制模板。
- 校验 `server_url`、`token`、上报间隔、心跳间隔和 idle 阈值。
- 通过 AppleScript 获取前台应用名称和窗口标题。
- 通过 AppleScript 枚举当前可见应用，写入 `extra.open_apps`。
- 通过 `ioreg -c IOHIDSystem` 获取键鼠空闲时间。
- 通过 `pmset -g batt` 获取电池百分比和充电状态。
- 通过 `pmset -g assertions` 和全屏窗口检测降低看视频 / 听音乐时的误判 idle 风险。
- 通过 AppleScript 读取 Spotify、Apple Music、QQ 音乐和网易云音乐当前播放曲目。
- QQ 音乐 / 网易云音乐如果不暴露脚本接口，会尝试从可见窗口标题做保守识别。
- 媒体变化会独立触发上报，不依赖前台窗口切换。
- 音乐播放器会从 `extra.open_apps` 中过滤，避免混入前台应用用量；播放状态走服务端已有 Background Music 时间线。
- 通过 `/api/health` 和 `/api/device` 做启动阶段连通性与 token 自检。
- Reporter 带指数退避；本地 loopback 地址会绕过系统代理。
- 支持菜单栏入口：暂停 / 恢复、重载配置、打开配置、打开日志、退出。
- 使用文件锁做单实例保护。
- 提供图形管理器：保存配置、测试连接、启动 / 停止 Worker、注册 / 移除开机自启。
- 提供 launchd 自启动安装和卸载脚本。
- 提供 PyInstaller `.app` 打包脚本。

## 开发运行

1. 创建虚拟环境并安装依赖：

```bash
cd refactor/agents/macos
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
```

2. 复制并编辑配置：

```bash
cp config.example.json config.json
open config.json
```

3. 启动 Agent：

```bash
python3 agent.py
```

如果 `pystray` 在当前环境不可用，Agent 会退回 console 运行模式。

如果想使用图形管理器：

```bash
python3 manager.py
```

## Server 端 token 怎么对应

在服务端 `.env` 里配置完整的 `DEVICE_TOKEN_1` 行，例如：

```env
DEVICE_TOKEN_1=mac-token:my-macbook:My MacBook:macos
```

这里：

- `mac-token` 是 `config.json` 里的 `token`
- `my-macbook` 是设备 ID
- `My MacBook` 是前端显示名
- `macos` 是设备平台

Agent 只调用当前服务端已经存在的 `/api/health`、`/api/device` 和 `/api/report`，不需要服务端代码更新。

## 开机自启

当前用户 launchd 自启动：

```bash
./install-startup.sh
```

取消自启动：

```bash
./uninstall-startup.sh
```

脚本会写入或删除：

```text
~/Library/LaunchAgents/com.watchme.agent.plist
```

## 打包

```bash
./build.sh
```

输出：

```text
dist/WatchMeAgent/WatchMeAgentWorker.app
dist/WatchMeAgent/WatchMeAgent.app       # 如果构建环境可打包 tkinter
dist/WatchMeAgent/WatchMeAgent.command   # tkinter 不可打包时的管理器启动入口
dist/WatchMeAgent/agent.py
dist/WatchMeAgent/manager.py
dist/WatchMeAgent/config.example.json
dist/WatchMeAgent/requirements.txt
dist/WatchMeAgent/install-agent.sh
dist/WatchMeAgent/install-startup.sh
dist/WatchMeAgent/uninstall-startup.sh
dist/WatchMeAgent.zip
```

## macOS 权限

前台窗口标题、可见应用列表和全屏状态读取依赖 macOS 辅助功能权限。首次运行后，如系统弹出权限请求，请在：

```text
System Settings -> Privacy & Security -> Accessibility
```

允许运行该 Agent 的 Terminal、Python 或打包后的应用。

## 测试

```bash
python3 -m unittest test_agent_config.py test_manager_helpers.py
```

测试覆盖配置校验、URL 归一化、idle / 电池 / 音频输出解析、音乐行解析、Reporter 对 `/api/health`、`/api/device` 和 `/api/report` 的本地 HTTP 上报闭环，以及管理器 helper。

## 已知限制

- AppleScript 和 Accessibility 权限在不同 macOS 版本上可能有差异，仍需要至少一台真实 macOS 设备长时间试跑。
- Spotify、Apple Music、QQ 音乐、网易云音乐已接入；QQ / 网易云是否能返回完整艺术家字段取决于对应 macOS 应用暴露的脚本接口，窗口标题 fallback 只能保守识别。
- 打包产物未做签名和公证，首次运行可能需要在 macOS 隐私与安全设置里手动允许。
