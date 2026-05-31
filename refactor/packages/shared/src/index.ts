import { z } from "zod";

export const DevicePlatformSchema = z.enum(["windows", "macos"]);

export const MusicPayloadSchema = z.object({
  title: z.string().trim().min(1).max(256).optional(),
  artist: z.string().trim().min(1).max(256).optional(),
  app: z.string().trim().min(1).max(128).optional()
});

export const OpenAppPayloadSchema = z.object({
  app_id: z.string().trim().min(1).max(128),
  window_title: z.string().max(256).optional(),
  app_name: z.string().trim().min(1).max(128).optional(),
  display_title: z.string().trim().min(1).max(256).optional()
});

export const ExtraPayloadSchema = z.object({
  battery_percent: z.number().int().min(0).max(100).optional(),
  battery_charging: z.boolean().optional(),
  music: MusicPayloadSchema.optional(),
  open_apps: z.array(OpenAppPayloadSchema).max(32).optional()
});

export const ReportRequestSchema = z.object({
  app_id: z.string().trim().min(1).max(128),
  window_title: z.string().max(256).default(""),
  timestamp: z.string().datetime(),
  extra: ExtraPayloadSchema.optional()
});

export const PublicMusicStateSchema = z.object({
  title: z.string().optional(),
  artist: z.string().optional(),
  app: z.string().optional()
});

export const PublicExtraStateSchema = z.object({
  battery_percent: z.number().int().min(0).max(100).optional(),
  battery_charging: z.boolean().optional(),
  music: PublicMusicStateSchema.optional(),
  open_apps: z.array(OpenAppPayloadSchema.omit({ window_title: true })).max(32).optional()
});

export const PublicDeviceStateSchema = z.object({
  device_id: z.string(),
  device_name: z.string(),
  platform: DevicePlatformSchema,
  app_id: z.string(),
  app_name: z.string(),
  display_title: z.string().optional(),
  last_seen_at: z.string().datetime(),
  is_online: z.boolean(),
  extra: PublicExtraStateSchema.optional()
});

export const RecentActivitySchema = z.object({
  id: z.number().int(),
  device_id: z.string(),
  device_name: z.string(),
  platform: DevicePlatformSchema,
  app_id: z.string(),
  app_name: z.string(),
  display_title: z.string().optional(),
  started_at: z.string().datetime()
});

export const TimelineSegmentSchema = z.object({
  app_id: z.string(),
  app_name: z.string(),
  display_title: z.string().optional(),
  started_at: z.string().datetime(),
  ended_at: z.string().datetime().nullable(),
  duration_minutes: z.number().int().nonnegative(),
  device_id: z.string(),
  device_name: z.string()
});

export const MediaTimelineSegmentSchema = z.object({
  app_name: z.string(),
  song_title: z.string(),
  artist: z.string().optional(),
  started_at: z.string().datetime(),
  ended_at: z.string().datetime().nullable(),
  duration_minutes: z.number().int().nonnegative(),
  device_id: z.string(),
  device_name: z.string()
});

export const CurrentResponseSchema = z.object({
  devices: z.array(PublicDeviceStateSchema),
  recent_activities: z.array(RecentActivitySchema),
  server_time: z.string().datetime(),
  viewer_count: z.number().int().nonnegative()
});

export const TimelineResponseSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  segments: z.array(TimelineSegmentSchema),
  summary: z.record(z.string(), z.record(z.string(), z.number().int().nonnegative())),
  media_segments: z.array(MediaTimelineSegmentSchema).default([]),
  media_summary: z.record(z.string(), z.record(z.string(), z.number().int().nonnegative())).default({})
});

export const SiteConfigSchema = z.object({
  displayName: z.string().min(1),
  siteTitle: z.string().min(1),
  siteDescription: z.string().min(1),
  siteFavicon: z.string().min(1)
});

export const ErrorResponseSchema = z.object({
  error: z.string(),
  code: z.string().optional()
});

export type DevicePlatform = z.infer<typeof DevicePlatformSchema>;
export type MusicPayload = z.infer<typeof MusicPayloadSchema>;
export type OpenAppPayload = z.infer<typeof OpenAppPayloadSchema>;
export type ExtraPayload = z.infer<typeof ExtraPayloadSchema>;
export type ReportRequest = z.infer<typeof ReportRequestSchema>;
export type PublicDeviceState = z.infer<typeof PublicDeviceStateSchema>;
export type RecentActivity = z.infer<typeof RecentActivitySchema>;
export type TimelineSegment = z.infer<typeof TimelineSegmentSchema>;
export type MediaTimelineSegment = z.infer<typeof MediaTimelineSegmentSchema>;
export type CurrentResponse = z.infer<typeof CurrentResponseSchema>;
export type TimelineResponse = z.infer<typeof TimelineResponseSchema>;
export type SiteConfig = z.infer<typeof SiteConfigSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

export function sanitizeExtraPayload(input: unknown): ExtraPayload | undefined {
  if (input == null) {
    return undefined;
  }

  const parsed = ExtraPayloadSchema.safeParse(input);
  if (!parsed.success) {
    return undefined;
  }

  const result: ExtraPayload = {};
  const { battery_percent, battery_charging, music } = parsed.data;

  if (typeof battery_percent === "number") {
    result.battery_percent = battery_percent;
  }

  if (typeof battery_charging === "boolean") {
    result.battery_charging = battery_charging;
  }

  if (music?.title) {
    result.music = {
      title: music.title,
      artist: music.artist,
      app: music.app
    };
  }

  if (parsed.data.open_apps?.length) {
    const seen = new Set<string>();
    const openApps = [];
    for (const app of parsed.data.open_apps) {
      const key = app.app_id.trim().toLowerCase();
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      openApps.push({
        app_id: app.app_id,
        window_title: app.window_title,
        app_name: app.app_name,
        display_title: app.display_title
      });
    }
    if (openApps.length > 0) {
      result.open_apps = openApps;
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

export function isValidLocalDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

export function getUtcRangeForLocalDate(date: string, timezoneOffsetMinutes: number): {
  startIso: string;
  endIso: string;
} {
  const [year, month, day] = date.split("-").map(Number);
  const startMs = Date.UTC(year, (month ?? 1) - 1, day ?? 1, 0, 0, 0, 0)
    + timezoneOffsetMinutes * 60_000;
  const endMs = startMs + 24 * 60 * 60 * 1000;
  return {
    startIso: new Date(startMs).toISOString(),
    endIso: new Date(endMs).toISOString()
  };
}

export function clampReportTimestamp(iso: string, maxSkewMinutes = 5): string {
  const parsed = new Date(iso);
  const now = Date.now();
  if (Number.isNaN(parsed.getTime())) {
    return new Date(now).toISOString();
  }

  const maxSkewMs = maxSkewMinutes * 60_000;
  if (Math.abs(parsed.getTime() - now) > maxSkewMs) {
    return new Date(now).toISOString();
  }

  return parsed.toISOString();
}
