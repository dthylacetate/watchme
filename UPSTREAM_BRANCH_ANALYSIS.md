# 上游分支分析

原仓库：[Monika-Dream/live-dashboard](https://github.com/Monika-Dream/live-dashboard/tree/main)  
拉取时间：2026-05-31  
下载位置：`watchme/references/upstream-branches/`

## 1. 远端分支清单

| 分支 | SHA | 是否下载 | 判断 |
| --- | --- | --- | --- |
| `main` | `1ca9615929a521cde88e64d2317dd0fbade24fc7` | 是 | 当前前端 + 后端核心，需要作为基线。 |
| `windows-source` | `fa9bf43a030de75442f9927d77cdc8c509108c80` | 是 | Windows Agent 源码，重构需要。 |
| `macos-source` | `718f8009b30c1ec922298dd1b7cc1d1d04a16d2b` | 是 | macOS Agent 源码，重构需要。 |
| `redesign/blossom-letter` | `4bfe318ce5a62c9aec397d61d2c4b6cca96b210a` | 是 | 前端重设计 + AI 日总结思路，有参考价值。 |
| `redesign/pixel-room` | `7a0fd4e6d8beebf8066059b52de118643f7316f1` | 是 | 像素房间视图 + 设计文档，有参考价值。 |
| `android-source` | `0f0953ebb8025d41cf7bbaa7db5a9526153dae12` | 否 | 用户明确不需要 Android 部分。 |

下载方式：使用临时 clone 后 `git archive -o` 导出源码快照，避免 `watchme/` 内出现嵌套 Git 仓库。

## 2. 下载结果

| 本地目录 | 文件数 | 内容 |
| --- | ---: | --- |
| `references/upstream-branches/main` | 52 | 当前 Dashboard 核心：后端、前端、Docker、Nginx、文档。 |
| `references/upstream-branches/windows-source` | 8 | 独立 Windows Agent 源码。 |
| `references/upstream-branches/macos-source` | 6 | 独立 macOS Agent 源码。 |
| `references/upstream-branches/redesign__blossom-letter` | 54 | 前后端重设计分支，含 Windows/macOS Agent 副本。 |
| `references/upstream-branches/redesign__pixel-room` | 70 | Pixel Room 分支，含设计计划、spec、Agent 副本和部分构建产物。 |

注意：`redesign/pixel-room` 分支里包含 `packages/backend/public/` 静态构建产物；`redesign/blossom-letter` 分支里包含 `packages/frontend/tsconfig.tsbuildinfo`。这些不建议作为新项目源码直接继承，只作为上游快照保留。

## 3. Windows Agent 分析

位置：`references/upstream-branches/windows-source/agents/windows/`

核心能力：

- 通过 Win32 API 获取前台窗口应用和标题。
- 通过 `psutil` 获取电池状态。
- 通过 `pycaw` 检测系统音频，避免听歌/看视频时误判 AFK。
- 通过前台窗口尺寸判断全屏，避免全屏播放或演示时误判 AFK。
- 系统托盘常驻，支持查看状态、开关日志、设置对话框、开关自启动、安全退出。
- 支持注册表开机自启，并兼容移除旧版任务计划。
- 支持多播放器音乐解析：Spotify、QQ 音乐、网易云、foobar2000、酷狗、酷我、AIMP 等。
- 上报 `/api/report`，请求中包含 `app_id`、`window_title`、可选 `extra.battery_*` 和 `extra.music`。
- Reporter 带指数退避，避免服务端不可用时高频重试。

依赖：

```text
requests>=2.28
psutil>=5.9
pystray>=0.19
Pillow>=10.0
pycaw>=20231023
```

可复用价值：高。

建议保留：

- 前台窗口检测。
- 音频/全屏免 AFK 逻辑。
- 电池和音乐 extra schema。
- Reporter 退避逻辑。
- 托盘设置对话框的用户体验。

建议整理：

- 把平台采集、配置、上报、托盘 UI 拆成模块。
- 给配置校验和请求 payload 加类型或 dataclass。
- 增加 dry-run/debug 模式，方便联调新后端。
- 把音乐标题解析做成可测试纯函数。

## 4. macOS Agent 分析

位置：`references/upstream-branches/macos-source/agents/macos/`

核心能力：

- 通过 AppleScript 获取前台应用和窗口标题。
- 通过 `ioreg -c IOHIDSystem` 获取键鼠空闲时间。
- 通过 `pmset -g assertions` 检查 CoreAudiod 是否阻止系统空闲睡眠，用作音频播放判断。
- 通过 AppleScript 读取 `AXFullScreen` 判断前台窗口是否全屏。
- 支持 Spotify、Apple Music、QQ 音乐、网易云音乐的播放状态查询。
- 通过 `psutil` 获取 MacBook 电池。
- 菜单栏托盘，支持查看状态、打开配置、重载配置、安全退出。
- 上报 `/api/report`，字段与 Windows Agent 基本一致。

依赖：

```text
psutil>=5.9
requests>=2.28
pystray>=0.19
Pillow>=10.0
```

可复用价值：中高。

限制：

- README 明确说明“已实现全部功能，但缺少 macOS 测试环境，尚未经过实机验证”。
- AppleScript、Accessibility 权限、`pmset` 输出在不同 macOS 版本上可能不稳定。
- `macos-source` 的 `config.example.json` 缺少 `idle_threshold_seconds`，但 `agent.py` 默认配置里有这个字段；这是一个文档/模板不一致点。

建议保留：

- AppleScript 获取窗口信息和音乐状态的总体方案。
- ioreg 空闲时间方案。
- launchd 自启动文档。

建议强化：

- 做 macOS 版本兼容层，把每个 shell/AppleScript 调用封装成独立函数并测试输出解析。
- 修正 config 模板。
- 增加权限检测和更友好的错误提示。
- 如果未来追求稳定，可以评估原生 Swift/Objective-C helper，但第一版不必上来就做。

## 5. `redesign/blossom-letter` 分析

这个分支是“花信 · Blossom Letter”主题，主要价值在前端设计和每日总结功能。

值得吸收：

- OKLCH 暖纸色设计 token。
- 38% / 62% 双栏信息架构。
- “此刻”实时汇总和 Top 应用统计。
- 每日总结的数据产品思路。
- 暗色模式文案和视觉方向。

谨慎继承：

- `page.tsx` 把大量 UI 内联到单文件，README 也说明原组件“保留但未使用”。
- `globals.css` 大幅膨胀，主题耦合更强。
- AI 每日总结直接调用 OpenAI 兼容接口，需要隐私、成本、失败重试和配置边界重新设计。
- 该分支删除了健康数据相关接口，若你仍想保留健康数据，需要谨慎合并。

结论：把它当设计参考和功能灵感，不建议作为重构基底。

## 6. `redesign/pixel-room` 分析

这个分支实现了像素房间视图，并附带详细计划和设计 spec：

- `docs/superpowers/plans/2026-03-20-pixel-room.md`
- `docs/superpowers/specs/2026-03-20-pixel-room-design.md`
- `packages/frontend/src/components/PixelRoom.tsx`

值得吸收：

- PixelRoom 作为“可选视图”的思路。
- 设计 spec 很详细，适合转化为新项目需求文档。
- SVG 组件无外部图片依赖，易移植。
- day/night 由状态 prop 控制，这个边界比读取 body class 更干净。

谨慎继承：

- 分支中有 `packages/backend/public/` 构建产物，不应进入新源码。
- 像素房间默认 viewMode 为 room，是否适合作为主视图需要重新判断。
- 使用 emoji 映射应用图标，跨平台字体和渲染一致性要测试。
- 如果设备超过 2-3 台，SVG 横向布局可读性需要再设计。

结论：PixelRoom 组件和 spec 值得保留为未来 UI 实验素材，但新项目第一版仍建议先实现可靠的列表/时间线视图。

## 7. 分支取舍建议

建议重构基线：

1. 以 `main` 的后端 API 和数据库为兼容基线。
2. 以 `windows-source` 的 Agent 为 Windows 采集基线。
3. 以 `macos-source` 的 Agent 为 macOS 采集基线，但标记为需实机验证。
4. 从 `redesign/pixel-room` 吸收 PixelRoom 设计文档和组件思路。
5. 从 `redesign/blossom-letter` 吸收 OKLCH token、Top 应用统计、每日总结方向。

不建议：

- 不要直接以任何 redesign 分支作为新项目基底。
- 不要把 `packages/backend/public/` 或 `tsconfig.tsbuildinfo` 作为新项目源码继承。
- 不要把 Android 源码纳入当前阶段。

