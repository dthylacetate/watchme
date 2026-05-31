import { DatabaseSync } from "node:sqlite";
import type { DevicePlatform, ExtraPayload, MediaTimelineSegment, PublicDeviceState, RecentActivity, TimelineSegment } from "@watchme/shared";

export interface DeviceIdentity {
  deviceId: string;
  deviceName: string;
  platform: DevicePlatform;
}

export interface ForegroundActivityRow {
  id: number;
  device_id: string;
  device_name: string;
  platform: DevicePlatform;
  app_id: string;
  app_name: string;
  display_title: string;
  title_hash: string;
  started_at: string;
}

export interface MediaActivityRow {
  id: number;
  device_id: string;
  device_name: string;
  platform: DevicePlatform;
  media_app_name: string;
  media_title: string;
  media_artist: string | null;
  media_hash: string;
  started_at: string;
}

export type OpenAppActivityRow = ForegroundActivityRow;

export interface RecordReportInput {
  device: DeviceIdentity;
  reportedAt: string;
  appId: string;
  appName: string;
  displayTitle: string;
  titleHash: string;
  extra?: ExtraPayload;
}

const MIGRATIONS = [
  {
    version: "0001_init",
    sql: `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS devices (
        device_id TEXT PRIMARY KEY,
        device_name TEXT NOT NULL,
        platform TEXT NOT NULL,
        created_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS device_states (
        device_id TEXT PRIMARY KEY,
        device_name TEXT NOT NULL,
        platform TEXT NOT NULL,
        app_id TEXT NOT NULL,
        app_name TEXT NOT NULL,
        display_title TEXT NOT NULL,
        last_seen_at TEXT NOT NULL,
        extra_json TEXT,
        FOREIGN KEY (device_id) REFERENCES devices(device_id)
      );

      CREATE TABLE IF NOT EXISTS activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT NOT NULL,
        device_name TEXT NOT NULL,
        platform TEXT NOT NULL,
        app_id TEXT NOT NULL,
        app_name TEXT NOT NULL,
        display_title TEXT NOT NULL,
        title_hash TEXT NOT NULL,
        time_bucket INTEGER NOT NULL,
        started_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_activities_dedup
        ON activities(device_id, app_id, title_hash, time_bucket);
      CREATE INDEX IF NOT EXISTS idx_activities_started_at
        ON activities(started_at);

      CREATE TABLE IF NOT EXISTS media_activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT NOT NULL,
        device_name TEXT NOT NULL,
        platform TEXT NOT NULL,
        media_app_name TEXT NOT NULL,
        media_title TEXT NOT NULL,
        media_artist TEXT,
        media_hash TEXT NOT NULL,
        time_bucket INTEGER NOT NULL,
        started_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_media_dedup
        ON media_activities(device_id, media_hash, time_bucket);
      CREATE INDEX IF NOT EXISTS idx_media_started_at
        ON media_activities(started_at);
    `
  },
  {
    version: "0002_open_app_activities",
    sql: `
      CREATE TABLE IF NOT EXISTS open_app_activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT NOT NULL,
        device_name TEXT NOT NULL,
        platform TEXT NOT NULL,
        app_id TEXT NOT NULL,
        app_name TEXT NOT NULL,
        display_title TEXT NOT NULL,
        title_hash TEXT NOT NULL,
        time_bucket INTEGER NOT NULL,
        started_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_open_app_dedup
        ON open_app_activities(device_id, app_id, title_hash, time_bucket);
      CREATE INDEX IF NOT EXISTS idx_open_app_started_at
        ON open_app_activities(started_at);
      CREATE INDEX IF NOT EXISTS idx_open_app_device_app_started_at
        ON open_app_activities(device_id, app_id, started_at);
    `
  }
];

export interface Database {
  sqlite: DatabaseSync;
  migrate(): void;
  recordReport(input: RecordReportInput): void;
  listCurrentDevices(offlineAfterSeconds: number, nowIso?: string): PublicDeviceState[];
  listRecentActivities(limit?: number): RecentActivity[];
  listActivitiesInRange(startIso: string, endIso: string, deviceId?: string): ForegroundActivityRow[];
  listOpenAppActivitiesInRange(startIso: string, endIso: string, deviceId?: string): OpenAppActivityRow[];
  listMediaActivitiesInRange(startIso: string, endIso: string, deviceId?: string): MediaActivityRow[];
  cleanupOldData(retentionDays: number, nowIso?: string): {
    deletedActivities: number;
    deletedOpenAppActivities: number;
    deletedMediaActivities: number;
  };
  close(): void;
}

export function createDatabase(path: string): Database {
  const sqlite = new DatabaseSync(path);
  sqlite.exec("PRAGMA journal_mode = WAL");
  sqlite.exec("PRAGMA foreign_keys = ON");

  return {
    sqlite,
    migrate() {
      sqlite.exec("CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL)");
      const existing = new Set(
        sqlite.prepare("SELECT version FROM schema_migrations").all().map((row) => String((row as { version: string }).version))
      );

      for (const migration of MIGRATIONS) {
        if (existing.has(migration.version)) {
          continue;
        }

        sqlite.exec("BEGIN");
        try {
          sqlite.exec(migration.sql);
          sqlite.prepare("INSERT INTO schema_migrations(version, applied_at) VALUES(?, ?)").run(
            migration.version,
            new Date().toISOString()
          );
          sqlite.exec("COMMIT");
        } catch (error) {
          sqlite.exec("ROLLBACK");
          throw error;
        }
      }
    },

    recordReport(input) {
      const createdAt = new Date().toISOString();
      const timeBucket = Math.floor(new Date(input.reportedAt).getTime() / 10_000);
      const extraJson = input.extra ? JSON.stringify(input.extra) : null;

      sqlite.prepare(
        `
          INSERT INTO devices(device_id, device_name, platform, created_at, last_seen_at)
          VALUES(?, ?, ?, ?, ?)
          ON CONFLICT(device_id) DO UPDATE SET
            device_name = excluded.device_name,
            platform = excluded.platform,
            last_seen_at = excluded.last_seen_at
        `
      ).run(
        input.device.deviceId,
        input.device.deviceName,
        input.device.platform,
        createdAt,
        input.reportedAt
      );

      sqlite.prepare(
        `
          INSERT INTO device_states(device_id, device_name, platform, app_id, app_name, display_title, last_seen_at, extra_json)
          VALUES(?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(device_id) DO UPDATE SET
            device_name = excluded.device_name,
            platform = excluded.platform,
            app_id = excluded.app_id,
            app_name = excluded.app_name,
            display_title = excluded.display_title,
            last_seen_at = excluded.last_seen_at,
            extra_json = excluded.extra_json
        `
      ).run(
        input.device.deviceId,
        input.device.deviceName,
        input.device.platform,
        input.appId,
        input.appName,
        input.displayTitle,
        input.reportedAt,
        extraJson
      );

      sqlite.prepare(
        `
          INSERT OR IGNORE INTO activities(
            device_id, device_name, platform, app_id, app_name, display_title,
            title_hash, time_bucket, started_at, created_at
          )
          VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      ).run(
        input.device.deviceId,
        input.device.deviceName,
        input.device.platform,
        input.appId,
        input.appName,
        input.displayTitle,
        input.titleHash,
        timeBucket,
        input.reportedAt,
        createdAt
      );

      if (input.extra?.music?.title) {
        const musicAppName = input.extra.music.app || "Music";
        const mediaHash = JSON.stringify([
          musicAppName,
          input.extra.music.artist || "",
          input.extra.music.title
        ]);
        sqlite.prepare(
          `
            INSERT OR IGNORE INTO media_activities(
              device_id, device_name, platform, media_app_name, media_title, media_artist,
              media_hash, time_bucket, started_at, created_at
            )
            VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `
        ).run(
          input.device.deviceId,
          input.device.deviceName,
          input.device.platform,
          musicAppName,
          input.extra.music.title,
          input.extra.music.artist ?? null,
          mediaHash,
          timeBucket,
          input.reportedAt,
          createdAt
        );
      }

      const openApps = input.extra?.open_apps?.length
        ? input.extra.open_apps.map((app) => ({
            appId: app.app_id,
            appName: app.app_name || app.app_id,
            displayTitle: app.display_title || app.app_name || app.app_id
          }))
        : [{
            appId: input.appId,
            appName: input.appName,
            displayTitle: input.displayTitle
          }];

      for (const app of openApps) {
        if (isMusicAppForUsage(app.appId, app.appName)) {
          continue;
        }

        const openAppHash = JSON.stringify([
          app.appId,
          app.displayTitle
        ]);
        sqlite.prepare(
          `
            INSERT OR IGNORE INTO open_app_activities(
              device_id, device_name, platform, app_id, app_name, display_title,
              title_hash, time_bucket, started_at, created_at
            )
            VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `
        ).run(
          input.device.deviceId,
          input.device.deviceName,
          input.device.platform,
          app.appId,
          app.appName,
          app.displayTitle,
          openAppHash,
          timeBucket,
          input.reportedAt,
          createdAt
        );
      }
    },

    listCurrentDevices(offlineAfterSeconds, nowIso = new Date().toISOString()) {
      const nowMs = new Date(nowIso).getTime();
      const rows = sqlite.prepare(
        `
          SELECT
            device_id,
            device_name,
            platform,
            app_id,
            app_name,
            display_title,
            last_seen_at,
            extra_json
          FROM device_states
          ORDER BY last_seen_at DESC, device_name ASC
        `
      ).all() as Array<Record<string, unknown>>;

      return rows.map((row) => {
        const lastSeenAt = String(row.last_seen_at);
        const isOnline = nowMs - new Date(lastSeenAt).getTime() <= offlineAfterSeconds * 1000;
        const extra = row.extra_json ? JSON.parse(String(row.extra_json)) : undefined;

        return {
          device_id: String(row.device_id),
          device_name: String(row.device_name),
          platform: row.platform as DevicePlatform,
          app_id: String(row.app_id),
          app_name: String(row.app_name),
          display_title: String(row.display_title),
          last_seen_at: lastSeenAt,
          is_online: isOnline,
          extra
        };
      });
    },

    listRecentActivities(limit = 20) {
      return sqlite.prepare(
        `
          SELECT id, device_id, device_name, platform, app_id, app_name, display_title, started_at
          FROM activities
          ORDER BY started_at DESC
          LIMIT ?
        `
      ).all(limit) as RecentActivity[];
    },

    listActivitiesInRange(startIso, endIso, deviceId) {
      if (deviceId) {
        return sqlite.prepare(
          `
            SELECT id, device_id, device_name, platform, app_id, app_name, display_title, title_hash, started_at
            FROM activities
            WHERE started_at >= ? AND started_at < ? AND device_id = ?
            ORDER BY device_id ASC, started_at ASC
          `
        ).all(startIso, endIso, deviceId) as unknown as ForegroundActivityRow[];
      }

      return sqlite.prepare(
        `
          SELECT id, device_id, device_name, platform, app_id, app_name, display_title, title_hash, started_at
          FROM activities
          WHERE started_at >= ? AND started_at < ?
          ORDER BY device_id ASC, started_at ASC
        `
      ).all(startIso, endIso) as unknown as ForegroundActivityRow[];
    },

    listOpenAppActivitiesInRange(startIso, endIso, deviceId) {
      if (deviceId) {
        return sqlite.prepare(
          `
            SELECT id, device_id, device_name, platform, app_id, app_name, display_title, title_hash, started_at
            FROM open_app_activities
            WHERE started_at >= ? AND started_at < ? AND device_id = ?
            ORDER BY device_id ASC, app_id ASC, started_at ASC
          `
        ).all(startIso, endIso, deviceId) as unknown as OpenAppActivityRow[];
      }

      return sqlite.prepare(
        `
          SELECT id, device_id, device_name, platform, app_id, app_name, display_title, title_hash, started_at
          FROM open_app_activities
          WHERE started_at >= ? AND started_at < ?
          ORDER BY device_id ASC, app_id ASC, started_at ASC
        `
      ).all(startIso, endIso) as unknown as OpenAppActivityRow[];
    },

    listMediaActivitiesInRange(startIso, endIso, deviceId) {
      if (deviceId) {
        return sqlite.prepare(
          `
            SELECT id, device_id, device_name, platform, media_app_name, media_title, media_artist, media_hash, started_at
            FROM media_activities
            WHERE started_at >= ? AND started_at < ? AND device_id = ?
            ORDER BY device_id ASC, started_at ASC
          `
        ).all(startIso, endIso, deviceId) as unknown as MediaActivityRow[];
      }

      return sqlite.prepare(
        `
          SELECT id, device_id, device_name, platform, media_app_name, media_title, media_artist, media_hash, started_at
          FROM media_activities
          WHERE started_at >= ? AND started_at < ?
          ORDER BY device_id ASC, started_at ASC
        `
      ).all(startIso, endIso) as unknown as MediaActivityRow[];
    },

    cleanupOldData(retentionDays, nowIso = new Date().toISOString()) {
      const cutoffMs = new Date(nowIso).getTime() - retentionDays * 24 * 60 * 60 * 1000;
      const cutoffIso = new Date(cutoffMs).toISOString();

      const deleteActivitiesResult = sqlite.prepare(
        "DELETE FROM activities WHERE started_at < ?"
      ).run(cutoffIso);
      const deleteOpenAppResult = sqlite.prepare(
        "DELETE FROM open_app_activities WHERE started_at < ?"
      ).run(cutoffIso);
      const deleteMediaResult = sqlite.prepare(
        "DELETE FROM media_activities WHERE started_at < ?"
      ).run(cutoffIso);

      return {
        deletedActivities: Number(deleteActivitiesResult.changes ?? 0),
        deletedOpenAppActivities: Number(deleteOpenAppResult.changes ?? 0),
        deletedMediaActivities: Number(deleteMediaResult.changes ?? 0)
      };
    },

    close() {
      sqlite.close();
    }
  };
}

function computeDurationMinutes(startMs: number, endMs: number): number {
  return Math.max(0, Math.floor((endMs - startMs) / 60_000));
}

function isMusicAppForUsage(appId: string, appName: string): boolean {
  const normalizedId = appId.toLowerCase();
  const normalizedName = appName.toLowerCase();
  return [
    "qqmusic",
    "music.ui",
    "spotify",
    "cloudmusic",
    "netease cloud music",
    "apple music",
    "foobar",
    "aimp",
    "kugou",
    "kuwo"
  ].some((marker) => normalizedId.includes(marker) || normalizedName.includes(marker));
}

function getRunEndTime(
  lastSampleMs: number,
  nextStartMs: number | undefined,
  currentEndMs: number | undefined
): number {
  if (typeof nextStartMs === "number") {
    const gap = nextStartMs - lastSampleMs;
    return gap > 2 * 60_000 ? lastSampleMs : nextStartMs;
  }

  if (typeof currentEndMs === "number" && currentEndMs > lastSampleMs) {
    return currentEndMs;
  }

  return lastSampleMs;
}

function isNearSample(previousStartedAt: string, nextStartedAt: string): boolean {
  const gap = new Date(nextStartedAt).getTime() - new Date(previousStartedAt).getTime();
  return gap >= 0 && gap <= 2 * 60_000;
}

export function buildTimelineSegments(
  rows: ForegroundActivityRow[],
  activeDevices: PublicDeviceState[],
  nowIso = new Date().toISOString()
): {
  segments: TimelineSegment[];
  summary: Record<string, Record<string, number>>;
} {
  const activeByDevice = new Map(
    activeDevices.map((device) => [device.device_id, device])
  );
  const segments: TimelineSegment[] = [];
  const summary: Record<string, Record<string, number>> = {};

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (!row) {
      continue;
    }

    let lastInRun = row;
    while (index + 1 < rows.length) {
      const candidate = rows[index + 1];
      if (!candidate
        || candidate.device_id !== row.device_id
        || candidate.app_id !== row.app_id
        || candidate.title_hash !== row.title_hash
        || !isNearSample(lastInRun.started_at, candidate.started_at)) {
        break;
      }
      index += 1;
      lastInRun = candidate;
    }

    const next = rows[index + 1];
    const sameDeviceNextStart = next?.device_id === row.device_id
      ? new Date(next.started_at).getTime()
      : undefined;
    const active = activeByDevice.get(row.device_id);
    const activeOpenApps = active?.extra?.open_apps ?? [];
    const isCurrentApp = active?.app_id === row.app_id;
    const isOpenApp = activeOpenApps.some((app) => app.app_id === row.app_id);
    const currentEndMs = active?.is_online && (isCurrentApp || isOpenApp)
      ? new Date(nowIso).getTime()
      : undefined;
    const startMs = new Date(row.started_at).getTime();
    const lastSampleMs = new Date(lastInRun.started_at).getTime();
    const endMs = getRunEndTime(lastSampleMs, sameDeviceNextStart, currentEndMs);
    const minutes = computeDurationMinutes(startMs, endMs);

    segments.push({
      app_id: row.app_id,
      app_name: row.app_name,
      display_title: row.display_title,
      started_at: row.started_at,
      ended_at: new Date(endMs).toISOString(),
      duration_minutes: minutes,
      device_id: row.device_id,
      device_name: row.device_name
    });

    summary[row.device_id] ??= {};
    summary[row.device_id]![row.app_name] = (summary[row.device_id]![row.app_name] ?? 0) + minutes;
  }

  return { segments, summary };
}

export function buildOpenAppTimelineSegments(
  rows: OpenAppActivityRow[],
  activeDevices: PublicDeviceState[],
  nowIso = new Date().toISOString()
): {
  segments: TimelineSegment[];
  summary: Record<string, Record<string, number>>;
} {
  const activeByDevice = new Map(
    activeDevices.map((device) => [device.device_id, device])
  );
  const rowsByApp = new Map<string, OpenAppActivityRow[]>();
  for (const row of rows) {
    const key = `${row.device_id}\u001f${row.app_id}`;
    rowsByApp.set(key, [...(rowsByApp.get(key) ?? []), row]);
  }

  const segments: TimelineSegment[] = [];
  const summary: Record<string, Record<string, number>> = {};
  const nowMs = new Date(nowIso).getTime();

  for (const appRows of rowsByApp.values()) {
    appRows.sort((left, right) => new Date(left.started_at).getTime() - new Date(right.started_at).getTime());

    for (let index = 0; index < appRows.length; index += 1) {
      const row = appRows[index];
      if (!row) {
        continue;
      }

      let lastInRun = row;
      while (index + 1 < appRows.length) {
        const candidate = appRows[index + 1];
        if (!candidate
          || candidate.title_hash !== row.title_hash
          || !isNearSample(lastInRun.started_at, candidate.started_at)) {
          break;
        }
        index += 1;
        lastInRun = candidate;
      }

      const nextSameApp = appRows[index + 1];
      const nextSameAppStart = nextSameApp
        ? new Date(nextSameApp.started_at).getTime()
        : undefined;
      const active = activeByDevice.get(row.device_id);
      const isOpenApp = active?.extra?.open_apps?.some((app) => app.app_id === row.app_id)
        || active?.app_id === row.app_id;
      const currentEndMs = active?.is_online && isOpenApp ? nowMs : undefined;
      const startMs = new Date(row.started_at).getTime();
      const lastSampleMs = new Date(lastInRun.started_at).getTime();
      const endMs = getRunEndTime(lastSampleMs, nextSameAppStart, currentEndMs);
      const minutes = computeDurationMinutes(startMs, endMs);

      segments.push({
        app_id: row.app_id,
        app_name: row.app_name,
        display_title: row.display_title,
        started_at: row.started_at,
        ended_at: new Date(endMs).toISOString(),
        duration_minutes: minutes,
        device_id: row.device_id,
        device_name: row.device_name
      });

      summary[row.device_id] ??= {};
      summary[row.device_id]![row.app_name] = (summary[row.device_id]![row.app_name] ?? 0) + minutes;
    }
  }

  segments.sort((left, right) => new Date(left.started_at).getTime() - new Date(right.started_at).getTime());

  return { segments, summary };
}

export function buildMediaTimelineSegments(
  rows: MediaActivityRow[],
  activeDevices: PublicDeviceState[]
): {
  segments: MediaTimelineSegment[];
  summary: Record<string, Record<string, number>>;
} {
  const activeByDevice = new Map(
    activeDevices.map((device) => [device.device_id, device])
  );
  const segments: MediaTimelineSegment[] = [];
  const summary: Record<string, Record<string, number>> = {};

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (!row) {
      continue;
    }

    let lastInRun = row;
    while (index + 1 < rows.length) {
      const candidate = rows[index + 1];
      if (!candidate
        || candidate.device_id !== row.device_id
        || candidate.media_hash !== row.media_hash
        || !isNearSample(lastInRun.started_at, candidate.started_at)) {
        break;
      }
      index += 1;
      lastInRun = candidate;
    }

    const next = rows[index + 1];
    const sameDeviceNextStart = next?.device_id === row.device_id
      ? new Date(next.started_at).getTime()
      : undefined;
    const active = activeByDevice.get(row.device_id);
    const activeMusic = active?.extra?.music;
    const isSameSong = activeMusic?.title === row.media_title
      && (activeMusic.artist ?? "") === (row.media_artist ?? "");
    const currentEndMs = active?.is_online && isSameSong
      ? new Date(active.last_seen_at).getTime()
      : undefined;
    const startMs = new Date(row.started_at).getTime();
    const lastSampleMs = new Date(lastInRun.started_at).getTime();
    const endMs = getRunEndTime(lastSampleMs, sameDeviceNextStart, currentEndMs);
    const minutes = computeDurationMinutes(startMs, endMs);
    const summaryLabel = row.media_artist ? `${row.media_artist} - ${row.media_title}` : row.media_title;

    segments.push({
      app_name: row.media_app_name,
      song_title: row.media_title,
      artist: row.media_artist ?? undefined,
      started_at: row.started_at,
      ended_at: new Date(endMs).toISOString(),
      duration_minutes: minutes,
      device_id: row.device_id,
      device_name: row.device_name
    });

    summary[row.device_id] ??= {};
    summary[row.device_id]![summaryLabel] = (summary[row.device_id]![summaryLabel] ?? 0) + minutes;
  }

  return { segments, summary };
}
