import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DevicePlatformSchema, type DevicePlatform } from "@watchme/shared";

export interface DeviceToken {
  token: string;
  deviceId: string;
  deviceName: string;
  platform: DevicePlatform;
}

export interface ServerConfig {
  port: number;
  dbPath: string;
  hashSecret: string;
  offlineAfterSeconds: number;
  retentionDays: number;
  cleanupIntervalMinutes: number;
  staticDir: string;
  displayName: string;
  siteTitle: string;
  siteDescription: string;
  siteFavicon: string;
  deviceTokens: Map<string, DeviceToken>;
}

function parseDeviceToken(raw: string): DeviceToken {
  const parts = raw.split(":");
  if (parts.length < 4) {
    throw new Error(`Invalid DEVICE_TOKEN value: ${raw}`);
  }

  const [token, deviceId, deviceName, platform] = parts;
  const parsedPlatform = DevicePlatformSchema.parse(platform);

  return {
    token,
    deviceId,
    deviceName,
    platform: parsedPlatform
  };
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const hashSecret = env.HASH_SECRET;
  if (!hashSecret) {
    throw new Error("HASH_SECRET is required");
  }

  const deviceTokens = new Map<string, DeviceToken>();
  for (const [key, value] of Object.entries(env)) {
    if (!key.startsWith("DEVICE_TOKEN_") || !value) {
      continue;
    }

    const parsed = parseDeviceToken(value);
    deviceTokens.set(parsed.token, parsed);
  }

  if (deviceTokens.size === 0) {
    throw new Error("At least one DEVICE_TOKEN_N entry is required");
  }

  const displayName = env.DISPLAY_NAME || "WatchMe";
  const siteTitle = env.SITE_TITLE || `${displayName} Now`;
  const siteDescription = env.SITE_DESC || `What is ${displayName} doing right now?`;
  const siteFavicon = env.SITE_FAVICON || "/favicon.ico";
  const dbPath = resolve(env.DB_PATH || "./watchme.db");
  const staticDir = resolve(env.STATIC_DIR || "./public");

  mkdirSync(dirname(dbPath), { recursive: true });
  if (existsSync(staticDir)) {
    mkdirSync(staticDir, { recursive: true });
  }

  return {
    port: Number(env.PORT || 3000),
    dbPath,
    hashSecret,
    offlineAfterSeconds: Number(env.OFFLINE_AFTER_SECONDS || 90),
    retentionDays: Number(env.RETENTION_DAYS || 30),
    cleanupIntervalMinutes: Number(env.CLEANUP_INTERVAL_MINUTES || 60),
    staticDir,
    displayName,
    siteTitle,
    siteDescription,
    siteFavicon,
    deviceTokens
  };
}
