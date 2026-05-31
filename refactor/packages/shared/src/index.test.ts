import {
  ExtraPayloadSchema,
  ReportRequestSchema,
  clampReportTimestamp,
  getUtcRangeForLocalDate,
  sanitizeExtraPayload
} from "./index";

describe("shared schemas", () => {
  it("accepts a valid report payload", () => {
    const parsed = ReportRequestSchema.parse({
      app_id: "Code.exe",
      window_title: "watchme - Visual Studio Code",
      timestamp: "2026-05-31T12:00:00.000Z",
      extra: {
        battery_percent: 80,
        battery_charging: true,
        music: {
          title: "Track",
          artist: "Artist",
          app: "QQ Music"
        }
      }
    });

    expect(parsed.app_id).toBe("Code.exe");
  });

  it("rejects invalid battery values", () => {
    expect(() =>
      ExtraPayloadSchema.parse({
        battery_percent: 200
      })
    ).toThrow();
  });

  it("sanitizes unknown extra fields", () => {
    const value = sanitizeExtraPayload({
      battery_percent: 55,
      debug: true
    });

    expect(value).toEqual({ battery_percent: 55 });
  });

  it("builds a UTC range from a local date", () => {
    const range = getUtcRangeForLocalDate("2026-05-31", -480);
    expect(range.startIso).toBe("2026-05-30T16:00:00.000Z");
    expect(range.endIso).toBe("2026-05-31T16:00:00.000Z");
  });

  it("clamps out-of-range report timestamps", () => {
    const clamped = clampReportTimestamp("2000-01-01T00:00:00.000Z", 5);
    expect(Math.abs(Date.now() - new Date(clamped).getTime())).toBeLessThan(10 * 60_000);
  });
});
