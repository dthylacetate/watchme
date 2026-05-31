import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { openSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

export function parseEnvContent(content) {
  const env = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) {
      continue;
    }
    const key = line.slice(0, eqIndex).trim();
    const value = line.slice(eqIndex + 1);
    env[key] = value;
  }
  return env;
}

export function stringifyEnvWithUpdates(content, updates) {
  const lines = content.split(/\r?\n/);
  const seen = new Set();

  const output = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      return line;
    }

    const eqIndex = line.indexOf("=");
    const key = line.slice(0, eqIndex).trim();
    if (!(key in updates)) {
      return line;
    }

    seen.add(key);
    return `${key}=${updates[key]}`;
  });

  for (const [key, value] of Object.entries(updates)) {
    if (!seen.has(key)) {
      output.push(`${key}=${value}`);
    }
  }

  return `${output.filter((line, index, arr) => !(index === arr.length - 1 && line === "")).join("\n")}\n`;
}

export function buildDeviceTokenEntry(token, deviceId, displayName, platform = "windows") {
  return `${token}:${deviceId}:${displayName}:${platform}`;
}

export function getReleasePaths(targetDirArg = ".") {
  const targetDir = resolve(targetDirArg);
  const envPath = resolve(targetDir, ".env");
  const envExamplePath = resolve(targetDir, ".env.example");
  const logsDir = resolve(targetDir, "logs");
  const dataDir = resolve(targetDir, "data");
  const backupsDir = resolve(targetDir, "backups");
  const pidPath = resolve(logsDir, "watchme-server.pid");
  const stdoutPath = resolve(logsDir, "server.out.log");
  const stderrPath = resolve(logsDir, "server.err.log");
  const dbPath = resolve(dataDir, "watchme.db");
  return {
    targetDir,
    envPath,
    envExamplePath,
    logsDir,
    dataDir,
    backupsDir,
    pidPath,
    stdoutPath,
    stderrPath,
    dbPath,
  };
}

export function ensureReleaseLayout(targetDirArg = ".") {
  const paths = getReleasePaths(targetDirArg);
  mkdirSync(paths.logsDir, { recursive: true });
  mkdirSync(paths.dataDir, { recursive: true });
  mkdirSync(paths.backupsDir, { recursive: true });
  if (!existsSync(paths.envPath) && existsSync(paths.envExamplePath)) {
    copyFileSync(paths.envExamplePath, paths.envPath);
  }
  return paths;
}

export function readEnvObject(targetDirArg = ".") {
  const paths = ensureReleaseLayout(targetDirArg);
  const content = existsSync(paths.envPath) ? readFileSync(paths.envPath, "utf8") : "";
  return { paths, content, env: parseEnvContent(content) };
}

export function writeEnvObject(targetDirArg, updates) {
  const { paths, content } = readEnvObject(targetDirArg);
  const next = stringifyEnvWithUpdates(content, updates);
  writeFileSync(paths.envPath, next, "utf8");
  return { paths, content: next, env: parseEnvContent(next) };
}

export function getBaseUrlFromEnv(env) {
  const port = Number(env.PORT || 3000);
  return `http://127.0.0.1:${port}`;
}

export function readPid(targetDirArg = ".") {
  const { pidPath } = getReleasePaths(targetDirArg);
  if (!existsSync(pidPath)) {
    return null;
  }
  const value = readFileSync(pidPath, "utf8").trim();
  return value ? Number(value) : null;
}

export function isProcessRunning(pid) {
  if (!pid || Number.isNaN(pid)) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function getServerStatus(targetDirArg = ".") {
  const { env } = readEnvObject(targetDirArg);
  const pid = readPid(targetDirArg);
  const running = isProcessRunning(pid);
  return {
    pid,
    running,
    baseUrl: getBaseUrlFromEnv(env),
    env,
  };
}

export function startServer(targetDirArg = ".") {
  const paths = ensureReleaseLayout(targetDirArg);
  const status = getServerStatus(targetDirArg);
  if (status.running) {
    return { alreadyRunning: true, ...status };
  }

  const outFd = openSync(paths.stdoutPath, "a");
  const errFd = openSync(paths.stderrPath, "a");
  const child = spawn(process.execPath, ["dist/index.js"], {
    cwd: paths.targetDir,
    detached: true,
    stdio: ["ignore", outFd, errFd],
  });
  child.unref();
  writeFileSync(paths.pidPath, String(child.pid), "utf8");
  return {
    alreadyRunning: false,
    pid: child.pid,
    running: true,
    baseUrl: status.baseUrl,
  };
}

export function stopServer(targetDirArg = ".") {
  const paths = getReleasePaths(targetDirArg);
  const pid = readPid(targetDirArg);
  if (!pid || !isProcessRunning(pid)) {
    rmSync(paths.pidPath, { force: true });
    return { stopped: false, pid: pid ?? null };
  }

  process.kill(pid);
  rmSync(paths.pidPath, { force: true });
  return { stopped: true, pid };
}

export async function healthCheck(targetDirArg = ".") {
  const { env } = readEnvObject(targetDirArg);
  const baseUrl = getBaseUrlFromEnv(env);
  const response = await fetch(`${baseUrl}/api/health`);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Health check failed: HTTP ${response.status} ${text}`);
  }
  const payload = text ? JSON.parse(text) : {};
  return { baseUrl, payload };
}

export function buildManagerSnapshot(targetDirArg = ".") {
  const { paths, env } = readEnvObject(targetDirArg);
  const status = getServerStatus(targetDirArg);
  const deviceToken = String(env.DEVICE_TOKEN_1 || "");
  const [agentToken = "", deviceId = "", deviceName = "", platform = "windows"] = deviceToken.split(":");

  return {
    targetDir: paths.targetDir,
    envPath: paths.envPath,
    baseUrl: status.baseUrl,
    running: status.running,
    pid: status.pid,
    config: {
      port: String(env.PORT || 3000),
      hashSecret: String(env.HASH_SECRET || ""),
      displayName: String(env.DISPLAY_NAME || "WatchMe"),
      siteTitle: String(env.SITE_TITLE || "WatchMe Now"),
      siteDescription: String(env.SITE_DESC || "What is WatchMe doing right now?"),
      agentToken,
      deviceId,
      deviceName,
      platform,
    },
  };
}

export function saveManagerSnapshot(targetDirArg, snapshot) {
  const {
    port,
    hashSecret,
    displayName,
    siteTitle,
    siteDescription,
    agentToken,
    deviceId,
    deviceName,
    platform = "windows",
  } = snapshot;

  if (!hashSecret?.trim()) {
    throw new Error("HASH_SECRET cannot be empty.");
  }
  if (!agentToken?.trim()) {
    throw new Error("Agent token cannot be empty.");
  }
  if (!deviceId?.trim()) {
    throw new Error("Device ID cannot be empty.");
  }
  if (!deviceName?.trim()) {
    throw new Error("Device name cannot be empty.");
  }

  return writeEnvObject(targetDirArg, {
    PORT: String(port || 3000).trim(),
    HASH_SECRET: String(hashSecret).trim(),
    DISPLAY_NAME: String(displayName || "WatchMe").trim(),
    SITE_TITLE: String(siteTitle || "WatchMe Now").trim(),
    SITE_DESC: String(siteDescription || "What is WatchMe doing right now?").trim(),
    DEVICE_TOKEN_1: buildDeviceTokenEntry(
      String(agentToken).trim(),
      String(deviceId).trim(),
      String(deviceName).trim(),
      String(platform).trim() || "windows"
    ),
  });
}

export function createBackup(targetDirArg = ".") {
  const paths = ensureReleaseLayout(targetDirArg);
  if (!existsSync(paths.dbPath)) {
    throw new Error(`Database file not found at ${paths.dbPath}`);
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = resolve(paths.backupsDir, `watchme-${stamp}.db`);
  copyFileSync(paths.dbPath, backupPath);
  return backupPath;
}
