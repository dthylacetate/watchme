import { existsSync } from "node:fs";
import { join } from "node:path";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { buildMediaTimelineSegments, buildTimelineSegments, createDatabase, type Database } from "@watchme/db";
import {
  CurrentResponseSchema,
  type ExtraPayload,
  ReportRequestSchema,
  SiteConfigSchema,
  TimelineResponseSchema,
  clampReportTimestamp,
  getUtcRangeForLocalDate,
  isValidLocalDate,
  sanitizeExtraPayload
} from "@watchme/shared";
import { processDisplayTitle } from "@watchme/privacy";
import { loadConfig, type DeviceToken, type ServerConfig } from "./config";
import { startCleanupLoop } from "./cleanup";
import { takeRateLimitToken } from "./rate-limit";
import { touchViewer } from "./viewers";

type Variables = {
  device: DeviceToken;
};

export interface AppContext {
  config: ServerConfig;
  db: Database;
  startedAt: number;
  enableCleanup: boolean;
}

function unauthorized(message = "Unauthorized") {
  return Response.json({ error: message, code: "unauthorized" }, { status: 401 });
}

function badRequest(message: string) {
  return Response.json({ error: message, code: "bad_request" }, { status: 400 });
}

function tooManyRequests() {
  return Response.json({ error: "Too many requests", code: "rate_limited" }, { status: 429 });
}

function processExtraPayload(extra: ExtraPayload | undefined, hashSecret: string): ExtraPayload | undefined {
  if (!extra) {
    return undefined;
  }

  const processed: ExtraPayload = { ...extra };
  if (extra.open_apps?.length) {
    processed.open_apps = extra.open_apps.map((app) => {
      const sanitized = processDisplayTitle({
        appId: app.app_id,
        windowTitle: app.window_title ?? "",
        hashSecret
      });
      return {
        app_id: sanitized.appId,
        app_name: sanitized.appName,
        display_title: sanitized.displayTitle
      };
    });
  }

  return processed;
}

export function createApp(context?: Partial<AppContext>) {
  const config = context?.config ?? loadConfig();
  const db = context?.db ?? createDatabase(config.dbPath);
  const enableCleanup = context?.enableCleanup ?? context == null;
  db.migrate();

  const app = new Hono<{ Variables: Variables }>();
  const startedAt = context?.startedAt ?? Date.now();

  app.use("/api/report", async (c, next) => {
    const authHeader = c.req.header("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return unauthorized();
    }

    const token = authHeader.slice("Bearer ".length).trim();
    const device = config.deviceTokens.get(token);
    if (!device) {
      return unauthorized();
    }

    const ip = c.req.header("x-forwarded-for") || "local";
    if (!takeRateLimitToken(`${device.deviceId}:${ip}`)) {
      return tooManyRequests();
    }

    c.set("device", device);
    await next();
  });

  app.use("/api/device", async (c, next) => {
    const authHeader = c.req.header("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return unauthorized();
    }

    const token = authHeader.slice("Bearer ".length).trim();
    const device = config.deviceTokens.get(token);
    if (!device) {
      return unauthorized();
    }

    c.set("device", device);
    await next();
  });

  app.get("/api/health", (c) => {
    return c.json({
      status: "ok",
      uptime: Math.floor((Date.now() - startedAt) / 1000),
      timestamp: new Date().toISOString()
    });
  });

  app.get("/api/config", (c) => {
    const payload = SiteConfigSchema.parse({
      displayName: config.displayName,
      siteTitle: config.siteTitle,
      siteDescription: config.siteDescription,
      siteFavicon: config.siteFavicon
    });
    return c.json(payload);
  });

  app.get("/api/device", (c) => {
    const device = c.get("device");
    return c.json({
      ok: true,
      device_id: device.deviceId,
      device_name: device.deviceName,
      platform: device.platform
    });
  });

  app.post("/api/report", async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return badRequest("Invalid JSON");
    }

    const parsed = ReportRequestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message || "Invalid report payload");
    }

    const device = c.get("device");
    const reportedAt = clampReportTimestamp(parsed.data.timestamp);
    const extra = processExtraPayload(sanitizeExtraPayload(parsed.data.extra), config.hashSecret);
    const processed = processDisplayTitle({
      appId: parsed.data.app_id,
      windowTitle: parsed.data.window_title,
      hashSecret: config.hashSecret
    });

    db.recordReport({
      device: {
        deviceId: device.deviceId,
        deviceName: device.deviceName,
        platform: device.platform
      },
      reportedAt,
      appId: processed.appId,
      appName: processed.appName,
      displayTitle: processed.displayTitle || processed.appName,
      titleHash: processed.titleHash,
      extra
    });

    return c.json({ ok: true });
  });

  app.get("/api/current", (c) => {
    const viewerKey = `${c.req.header("x-forwarded-for") || "local"}|${c.req.header("user-agent") || "unknown"}`;
    const viewerCount = touchViewer(viewerKey);
    const payload = CurrentResponseSchema.parse({
      devices: db.listCurrentDevices(config.offlineAfterSeconds),
      recent_activities: db.listRecentActivities(20),
      server_time: new Date().toISOString(),
      viewer_count: viewerCount
    });

    return c.json(payload);
  });

  app.get("/api/timeline", (c) => {
    const date = c.req.query("date");
    if (!date || !isValidLocalDate(date)) {
      return badRequest("date must be YYYY-MM-DD");
    }

    const tzRaw = c.req.query("tz") ?? "0";
    const timezoneOffset = Number(tzRaw);
    if (!Number.isFinite(timezoneOffset)) {
      return badRequest("tz must be a number");
    }

    const deviceId = c.req.query("device_id") || undefined;
    const range = getUtcRangeForLocalDate(date, timezoneOffset);
    const currentDevices = db.listCurrentDevices(config.offlineAfterSeconds);
    const foregroundRows = db.listActivitiesInRange(range.startIso, range.endIso, deviceId);
    const mediaRows = db.listMediaActivitiesInRange(range.startIso, range.endIso, deviceId);
    const foregroundTimeline = buildTimelineSegments(foregroundRows, currentDevices);
    const mediaTimeline = buildMediaTimelineSegments(mediaRows, currentDevices);

    const payload = TimelineResponseSchema.parse({
      date,
      segments: foregroundTimeline.segments,
      summary: foregroundTimeline.summary,
      media_segments: mediaTimeline.segments,
      media_summary: mediaTimeline.summary
    });

    return c.json(payload);
  });

  if (existsSync(config.staticDir)) {
    app.use("/*", serveStatic({ root: config.staticDir }));
    app.get("/", serveStatic({ path: join(config.staticDir, "index.html") }));
  }

  if (enableCleanup) {
    startCleanupLoop(db, config);
  }

  return { app, db, config };
}
