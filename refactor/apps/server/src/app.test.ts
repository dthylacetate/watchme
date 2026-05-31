import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "./app";

function makeEnv() {
  const tempDir = mkdtempSync(join(tmpdir(), "watchme-server-"));
  const appContext = createApp({
    config: {
      port: 0,
      dbPath: join(tempDir, "watchme.db"),
      hashSecret: "test-secret",
      offlineAfterSeconds: 120,
      retentionDays: 30,
      cleanupIntervalMinutes: 60,
      staticDir: join(tempDir, "static"),
      displayName: "Tester",
      siteTitle: "Tester Now",
      siteDescription: "What is Tester doing right now?",
      siteFavicon: "/favicon.ico",
      deviceTokens: new Map([
        ["abc123", {
          token: "abc123",
          deviceId: "desk-01",
          deviceName: "Desk",
          platform: "windows"
        }]
      ])
    }
  });

  return {
    ...appContext,
    cleanup() {
      appContext.db.close();
      rmSync(tempDir, { recursive: true, force: true });
    }
  };
}

describe("server API", () => {
  it("validates device bearer tokens", async () => {
    const ctx = makeEnv();
    try {
      const okResponse = await ctx.app.request("/api/device", {
        headers: {
          authorization: "Bearer abc123"
        }
      });
      expect(okResponse.status).toBe(200);
      await expect(okResponse.json()).resolves.toMatchObject({
        ok: true,
        device_id: "desk-01",
        device_name: "Desk",
        platform: "windows"
      });

      const badResponse = await ctx.app.request("/api/device", {
        headers: {
          authorization: "Bearer wrong-token"
        }
      });
      expect(badResponse.status).toBe(401);
    } finally {
      ctx.cleanup();
    }
  });

  it("stores reports and exposes current state", async () => {
    const ctx = makeEnv();
    try {
      const reportResponse = await ctx.app.request("/api/report", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer abc123"
        },
        body: JSON.stringify({
          app_id: "Code.exe",
          window_title: "README.md - watchme - Visual Studio Code",
          timestamp: new Date().toISOString(),
          extra: {
            battery_percent: 77,
            battery_charging: true,
            music: {
              title: "Blue in Green",
              artist: "Miles Davis",
              app: "QQ Music"
            }
          }
        })
      });

      expect(reportResponse.status).toBe(200);

      const currentResponse = await ctx.app.request("/api/current");
      const currentJson = await currentResponse.json();

      expect(currentJson.devices).toHaveLength(1);
      expect(currentJson.devices[0]?.app_name).toBe("VS Code");
      expect(currentJson.devices[0]?.display_title).toBe("watchme");
      expect(currentJson.devices[0]?.extra?.music?.title).toBe("Blue in Green");
    } finally {
      ctx.cleanup();
    }
  });

  it("builds foreground and media timelines", async () => {
    const ctx = makeEnv();
    try {
      const baseTime = new Date("2026-05-31T12:00:00.000Z").getTime();

      for (const [offset, title, song] of [
        [0, "QQ 主窗口", "Track A"],
        [60_000, "QQ 主窗口", "Track B"],
        [120_000, "README.md - watchme - Visual Studio Code", "Track B"]
      ] as const) {
        await ctx.app.request("/api/report", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: "Bearer abc123"
          },
          body: JSON.stringify({
            app_id: offset < 120_000 ? "QQ.exe" : "Code.exe",
            window_title: title,
            timestamp: new Date(baseTime + offset).toISOString(),
            extra: {
              music: {
                title: song,
                artist: "Artist",
                app: "QQ Music"
              }
            }
          })
        });
      }

      const response = await ctx.app.request("/api/timeline?date=2026-05-31&tz=0");
      const json = await response.json();

      expect(json.segments.length).toBeGreaterThan(0);
      expect(json.media_segments.length).toBeGreaterThan(0);
      expect(Object.keys(json.media_summary["desk-01"] || {})).toContain("Artist - Track B");
    } finally {
      ctx.cleanup();
    }
  });
});
