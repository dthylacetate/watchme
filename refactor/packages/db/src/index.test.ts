import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDatabase } from "./index";
import { buildMediaTimelineSegments, buildTimelineSegments, type ForegroundActivityRow, type MediaActivityRow } from "./index";

describe("database cleanup", () => {
  it("removes stale foreground and media activities outside retention", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "watchme-db-"));
    const dbPath = join(tempDir, "cleanup.db");
    const db = createDatabase(dbPath);
    db.migrate();

    try {
      db.recordReport({
        device: {
          deviceId: "desk-1",
          deviceName: "Desk 1",
          platform: "windows"
        },
        reportedAt: "2026-04-01T10:00:00.000Z",
        appId: "code.exe",
        appName: "VS Code",
        displayTitle: "watchme",
        titleHash: "old-hash",
        extra: {
          music: {
            title: "Old Track",
            artist: "Old Artist",
            app: "QQ Music"
          }
        }
      });

      db.recordReport({
        device: {
          deviceId: "desk-1",
          deviceName: "Desk 1",
          platform: "windows"
        },
        reportedAt: "2026-05-31T10:00:00.000Z",
        appId: "code.exe",
        appName: "VS Code",
        displayTitle: "watchme",
        titleHash: "new-hash",
        extra: {
          music: {
            title: "New Track",
            artist: "New Artist",
            app: "QQ Music"
          }
        }
      });

      const result = db.cleanupOldData(30, "2026-05-31T12:00:00.000Z");
      const activities = db.listActivitiesInRange("2026-01-01T00:00:00.000Z", "2026-12-31T00:00:00.000Z");
      const media = db.listMediaActivitiesInRange("2026-01-01T00:00:00.000Z", "2026-12-31T00:00:00.000Z");

      expect(result.deletedActivities).toBe(1);
      expect(result.deletedMediaActivities).toBe(1);
      expect(activities).toHaveLength(1);
      expect(media).toHaveLength(1);
      expect(media[0]?.media_title).toBe("New Track");
    } finally {
      db.close();
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

describe("timeline aggregation", () => {
  it("merges dense foreground samples before calculating duration", () => {
    const rows: ForegroundActivityRow[] = [
      makeForeground("2026-05-31T10:00:00.000Z"),
      makeForeground("2026-05-31T10:00:10.000Z"),
      makeForeground("2026-05-31T10:00:20.000Z"),
      makeForeground("2026-05-31T10:01:00.000Z")
    ];

    const timeline = buildTimelineSegments(rows, []);

    expect(timeline.segments).toHaveLength(1);
    expect(timeline.segments[0]?.duration_minutes).toBe(1);
    expect(timeline.summary["desk-1"]?.["VS Code"]).toBe(1);
  });

  it("merges dense media samples before calculating duration", () => {
    const rows: MediaActivityRow[] = [
      makeMedia("2026-05-31T10:00:00.000Z"),
      makeMedia("2026-05-31T10:00:10.000Z"),
      makeMedia("2026-05-31T10:00:20.000Z"),
      makeMedia("2026-05-31T10:01:00.000Z")
    ];

    const timeline = buildMediaTimelineSegments(rows, []);

    expect(timeline.segments).toHaveLength(1);
    expect(timeline.segments[0]?.duration_minutes).toBe(1);
    expect(timeline.summary["desk-1"]?.["Artist - Track A"]).toBe(1);
  });

  it("keeps different songs separate when they share the same player", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "watchme-db-"));
    const dbPath = join(tempDir, "media-hash.db");
    const db = createDatabase(dbPath);
    db.migrate();

    try {
      for (const [reportedAt, title] of [
        ["2026-05-31T10:00:00.000Z", "Track A"],
        ["2026-05-31T10:01:00.000Z", "Track B"]
      ] as const) {
        db.recordReport({
          device: {
            deviceId: "desk-1",
            deviceName: "Desk 1",
            platform: "windows"
          },
          reportedAt,
          appId: "code.exe",
          appName: "VS Code",
          displayTitle: "watchme",
          titleHash: `hash-${title}`,
          extra: {
            music: {
              title,
              artist: "Artist",
              app: "QQ Music"
            }
          }
        });
      }

      const media = db.listMediaActivitiesInRange("2026-05-31T00:00:00.000Z", "2026-06-01T00:00:00.000Z");
      expect(media.map((row) => row.media_title)).toEqual(["Track A", "Track B"]);
      expect(new Set(media.map((row) => row.media_hash)).size).toBe(2);
    } finally {
      db.close();
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

function makeForeground(startedAt: string): ForegroundActivityRow {
  return {
    id: 1,
    device_id: "desk-1",
    device_name: "Desk",
    platform: "windows",
    app_id: "code.exe",
    app_name: "VS Code",
    display_title: "watchme",
    title_hash: "hash-a",
    started_at: startedAt
  };
}

function makeMedia(startedAt: string): MediaActivityRow {
  return {
    id: 1,
    device_id: "desk-1",
    device_name: "Desk",
    platform: "windows",
    media_app_name: "QQ Music",
    media_title: "Track A",
    media_artist: "Artist",
    media_hash: "song-a",
    started_at: startedAt
  };
}
