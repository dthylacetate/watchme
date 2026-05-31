# WatchMe Windows Agent

这个 Agent 负责上报 Windows 当前前台应用、窗口标题、电池和媒体信息。

和参考实现的关键差异：

- 前台焦点变化和媒体变化分开追踪。
- 切歌会立刻触发一次上报，不再依赖前台窗口是否切换。
- 后端会把 `extra.music` 作为独立的后台媒体时间线写入，所以听歌时长不会再丢失。
- 现在会常驻系统托盘，可暂停、重载配置、打开配置文件和日志目录。
- 有单实例保护，重复双击或开机自启撞上手动运行时会忽略新实例。
- 日志会自动滚动，默认保留当前日志和 5 个历史日志文件。
- 启动时会先检查 `config.json` 和 `/api/health`，地址或 token 明显有问题时会尽早报错，并弹出桌面提示。

## 开发运行

1. 创建虚拟环境并安装依赖：

```powershell
py -3.12 -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2. 把 `config.example.json` 复制成 `config.json`，填入后端地址和 token。
3. 运行：

```powershell
python agent.py
```

启动后程序会进入系统托盘。托盘菜单支持：

- 暂停 / 恢复上报
- 重载 `config.json`
- 打开 `config.json`
- 打开日志目录
- 打开 Agent 所在目录
- 退出

## 打包为可执行文件

```powershell
.\build.ps1
```

输出产物：

- `dist\WatchMeAgent\WatchMeAgent.exe`
- `dist\WatchMeAgent\config.example.json`
- `dist\WatchMeAgent\install-agent.ps1`
- `dist\WatchMeAgent.zip`

建议的交付方式：

1. 把 `WatchMeAgent.zip` 发到目标机器。
2. 解压后直接执行：

```powershell
.\install-agent.ps1
```

3. 如果 `config.json` 里还是占位值，脚本会自动打开它；填好后确认托盘出现并能正常上报。
4. 只想单独注册开机自启时执行：

```powershell
.\install-startup.ps1
```

5. 需要停用或清理时可以执行：

```powershell
.\uninstall-agent.ps1
```

只想移除开机自启任务时：

```powershell
.\uninstall-startup.ps1
```

`install-agent.ps1` 默认会：

- 在缺少 `config.json` 时自动从 `config.example.json` 创建。
- 注册开机自启任务。
- 启动托盘 Agent。
- 如果发现还是占位 token，会自动打开 `config.json` 方便修改。

## 已知限制

- 媒体读取依赖 Windows Global System Media Transport Controls，部分播放器可能不暴露完整元数据。
- 托盘菜单本身不展示详细时间线；它只负责运行控制和故障处理。
