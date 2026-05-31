# 当前 API 与数据模型

这份文档记录旧项目的实际接口和数据结构，供之后在 `watchme/refactor/` 中做兼容或迁移时使用。

## 1. 环境变量

| 变量 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `PORT` | 否 | `3000` | Bun 服务监听端口。 |
| `STATIC_DIR` | 否 | `./public` | 静态前端目录。Docker 中是 `/app/public`。 |
| `DB_PATH` | 否 | `./live-dashboard.db` | SQLite 数据库路径。Docker 中是 `/data/live-dashboard.db`。 |
| `HASH_SECRET` | 是 | 无 | 窗口标题 HMAC 密钥。未设置会直接退出。 |
| `DEVICE_TOKEN_N` | 写入接口必需 | 无 | 设备 token，格式 `token:device_id:device_name:platform`。 |
| `DISPLAY_NAME` | 否 | `Monika` | 前端展示名。 |
| `SITE_TITLE` | 否 | `${DISPLAY_NAME} Now` | HTML title。 |
| `SITE_DESC` | 否 | `What is ${DISPLAY_NAME} doing right now?` | HTML description。 |
| `SITE_FAVICON` | 否 | `/favicon.ico` | favicon，允许相对路径或 HTTPS URL。 |
| `NEXT_PUBLIC_API_BASE` | 前端构建时可选 | 空字符串 | 前端请求 API 的 base URL，空值表示同源。 |

## 2. 认证

写入接口使用：

```http
Authorization: Bearer <token>
```

服务端从 `DEVICE_TOKEN_N` 解析设备信息：

```text
token:device_id:device_name:platform
```

`platform` 只能是：

- `windows`
- `android`
- `macos`

## 3. API 端点

### `GET /api/health`

用途：服务健康检查。

响应：

```json
{
  "status": "ok",
  "uptime": 123,
  "timestamp": "2026-05-31T07:00:00.000Z"
}
```

### `GET /api/config`

用途：获取站点展示配置。

响应：

```json
{
  "displayName": "Monika",
  "siteTitle": "Monika Now",
  "siteDescription": "What is Monika doing right now?",
  "siteFavicon": "/favicon.ico"
}
```

### `POST /api/report`

用途：设备上报当前前台应用。

认证：需要 Bearer Token。

请求：

```json
{
  "app_id": "Code.exe",
  "window_title": "PROJECT_ANALYSIS.md - live-dashboard - Visual Studio Code",
  "timestamp": "2026-05-31T07:00:00.000Z",
  "extra": {
    "battery_percent": 87,
    "battery_charging": true,
    "music": {
      "title": "Song",
      "artist": "Artist",
      "app": "Spotify"
    }
  }
}
```

处理规则：

- `app_id` 必填。
- `window_title` 最长 256 字符。
- `timestamp` 只接受服务器时间正负 5 分钟内，超出则使用服务器时间。
- NSFW 命中时静默返回成功，不写活动。
- 原始 `window_title` 不写入数据库。
- `display_title` 由隐私策略生成。
- `title_hash` 由 HMAC 生成，用于去重。
- `extra` 只保留电池和音乐字段。

成功响应：

```json
{ "ok": true }
```

错误响应：

```json
{ "error": "Unauthorized" }
```

```json
{ "error": "app_id required" }
```

### `GET /api/current`

用途：公开获取当前设备状态、最近活动、服务器时间和访客数。

响应：

```json
{
  "devices": [
    {
      "device_id": "my-pc",
      "device_name": "My PC",
      "platform": "windows",
      "app_id": "Code.exe",
      "app_name": "VS Code",
      "display_title": "live-dashboard",
      "last_seen_at": "2026-05-31T07:00:00.000Z",
      "is_online": 1,
      "extra": {
        "battery_percent": 87,
        "battery_charging": true
      }
    }
  ],
  "recent_activities": [],
  "server_time": "2026-05-31T07:00:00.000Z",
  "viewer_count": 1
}
```

说明：

- 不返回 `window_title`。
- `extra` 在服务端从 JSON 字符串解析为对象。
- 访客数基于内存中的 IP 心跳，30 秒过期。

### `GET /api/timeline`

用途：按日期获取活动片段和汇总。

查询参数：

| 参数 | 必填 | 示例 | 说明 |
| --- | --- | --- | --- |
| `date` | 是 | `2026-05-31` | 日期，格式 `YYYY-MM-DD`。 |
| `tz` | 否 | `-480` | 浏览器 `getTimezoneOffset()`，UTC+8 为 `-480`。 |
| `device_id` | 否 | `my-pc` | 只查指定设备。 |

响应：

```json
{
  "date": "2026-05-31",
  "segments": [
    {
      "app_name": "VS Code",
      "app_id": "Code.exe",
      "display_title": "live-dashboard",
      "started_at": "2026-05-31T07:00:00.000Z",
      "ended_at": "2026-05-31T07:15:00.000Z",
      "duration_minutes": 15,
      "device_id": "my-pc",
      "device_name": "My PC"
    }
  ],
  "summary": {
    "my-pc": {
      "VS Code": 15
    }
  }
}
```

说明：

- duration 由相邻活动推断，不是真实应用退出时间。
- 同设备相邻活动间隔超过 2 分钟时，上一段最多按 1 分钟计算。

### `POST /api/health-data`

用途：设备上报统一格式的健康数据。

认证：需要 Bearer Token。

限制：单次最多 500 条。

请求：

```json
{
  "records": [
    {
      "type": "heart_rate",
      "value": 72,
      "unit": "bpm",
      "timestamp": "2026-05-31T07:00:00.000Z",
      "end_time": ""
    }
  ]
}
```

支持类型包括：

```text
heart_rate, resting_heart_rate, heart_rate_variability,
steps, distance, exercise, sleep,
oxygen_saturation, body_temperature, respiratory_rate,
blood_pressure, blood_glucose,
weight, height,
active_calories, total_calories,
hydration, nutrition
```

响应：

```json
{ "ok": true, "inserted": 1 }
```

### `POST /api/health-webhook`

用途：适配外部 Health Connect webhook 格式。

认证：需要 Bearer Token。

限制：单次最多 2000 条。

支持字段：

- `heart_rate`
- `steps`
- `oxygen_saturation`
- `active_calories`
- `total_calories`
- `sleep`
- `weight`
- `blood_pressure`
- `blood_glucose`
- `body_temperature`
- `respiratory_rate`
- `distance`
- `exercise`
- `hydration`
- `heart_rate_variability`
- `resting_heart_rate`
- `height`

注意：当前 `blood_pressure` 只存 systolic，未存 diastolic。

### `GET /api/health-data`

用途：公开查询健康数据。

查询参数：

| 参数 | 必填 | 示例 | 说明 |
| --- | --- | --- | --- |
| `date` | 是 | `2026-05-31` | 日期，格式 `YYYY-MM-DD`。 |
| `tz` | 否 | `-480` | 浏览器 `getTimezoneOffset()`。 |
| `device_id` | 否 | `my-phone` | 只查指定设备。 |

响应：

```json
{
  "date": "2026-05-31",
  "records": [
    {
      "device_id": "my-phone",
      "type": "heart_rate",
      "value": 72,
      "unit": "bpm",
      "recorded_at": "2026-05-31T07:00:00.000Z",
      "end_time": ""
    }
  ]
}
```

## 4. 数据表

### `activities`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | INTEGER | 自增主键。 |
| `device_id` | TEXT | 设备 ID。 |
| `device_name` | TEXT | 设备显示名。 |
| `platform` | TEXT | 平台。 |
| `app_id` | TEXT | Agent 上报的应用 ID。 |
| `app_name` | TEXT | 服务端解析后的应用名。 |
| `window_title` | TEXT | 历史字段，当前总是空字符串。 |
| `display_title` | TEXT | 可公开展示的标题。 |
| `title_hash` | TEXT | 原始标题 HMAC。 |
| `time_bucket` | INTEGER | 10 秒去重桶。 |
| `started_at` | TEXT | 活动时间。 |
| `created_at` | TEXT | 入库时间。 |

唯一索引：

```sql
UNIQUE(device_id, app_id, title_hash, time_bucket)
```

### `device_states`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `device_id` | TEXT | 主键。 |
| `device_name` | TEXT | 设备显示名。 |
| `platform` | TEXT | 平台。 |
| `app_id` | TEXT | 当前应用 ID。 |
| `app_name` | TEXT | 当前应用名。 |
| `window_title` | TEXT | 历史字段，当前总是空字符串。 |
| `display_title` | TEXT | 可公开展示的标题。 |
| `last_seen_at` | TEXT | 最后心跳时间。 |
| `extra` | TEXT | JSON 字符串。 |
| `is_online` | INTEGER | 1 在线，0 离线。 |

离线判定：

```sql
last_seen_at < datetime('now', '-1 minute')
```

### `health_records`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | INTEGER | 自增主键。 |
| `device_id` | TEXT | 设备 ID。 |
| `type` | TEXT | 健康指标类型。 |
| `value` | REAL | 数值。 |
| `unit` | TEXT | 单位。 |
| `recorded_at` | TEXT | 记录开始时间。 |
| `end_time` | TEXT | 记录结束时间，可能为空。 |
| `created_at` | TEXT | 入库时间。 |

唯一约束：

```sql
UNIQUE(device_id, type, recorded_at, end_time)
```

## 5. 兼容注意事项

- 旧 Agent 只要继续按 `POST /api/report` 格式上报，新后端应优先兼容。
- `window_title` 不应重新暴露给公开 API。
- `HASH_SECRET` 影响历史标题去重，迁移时最好保留。
- `GET /api/health-data` 公开查询是旧行为，新项目如果改为可关闭或需认证，要在迁移说明里强调。
- 旧前端依赖 `is_online` 为数字 `1/0`，新 API 若改成 boolean，需要兼容层。

