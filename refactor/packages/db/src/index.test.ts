import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDatabase } from "./index";

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
