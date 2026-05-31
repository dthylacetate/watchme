# WatchMe macOS Agent

macOS Agent 在这一轮先保留目录和职责说明，方便后续继续推进。

目标行为和 Windows 端一致：

- 采集前台应用和窗口标题。
- 采集空闲时间、电池状态、媒体播放信息。
- 媒体变化独立触发上报，不依赖前台焦点切换。

建议后续实现路线：

1. 使用 AppleScript 获取前台应用名称和窗口标题。
2. 使用 `ioreg` 或 Quartz 读取空闲时间。
3. 使用 `pmset -g batt` 读取电池信息。
4. 使用 Apple Music / Spotify 脚本接口读取当前曲目。
