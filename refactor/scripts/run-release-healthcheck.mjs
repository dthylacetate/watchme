import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

function stripQuotes(value) {
  if (
    (value.startsWith("\"") && value.endsWith("\""))
    || (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

export function parseEnvFile(filePath) {
  const env = {};
  if (!existsSync(filePath)) {
    return env;
  }

  const content = readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = stripQuotes(line.slice(separatorIndex + 1).trim());
    env[key] = value;
  }

  return env;
}

export function shouldRunReleaseHealthCheck(env) {
  return Boolean(env.HASH_SECRET && env.HASH_SECRET !== "replace-me");
}

function startReleaseServer(targetDir) {
  return new Promise((resolveStart, reject) => {
    const child = spawn(process.execPath, ["dist/index.js"], {
      cwd: targetDir,
      env: {
        ...process.env,
        PORT: "0"
      },
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      const match = text.match(/WatchMe server listening on http:\/\/localhost:(\d+)/);
      if (match) {
        resolveStart({
          child,
          baseUrl: `http://127.0.0.1:${match[1]}`
        });
      }
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`release server exited early with code ${code}${stderr ? `: ${stderr.trim()}` : ""}`));
      }
    });
  });
}

async function stopChild(child) {
  if (child.killed) {
    return;
  }

  child.kill("SIGTERM");
  await new Promise((resolveStop) => {
    const timer = setTimeout(() => {
      if (!child.killed) {
        child.kill("SIGKILL");
      }
      resolveStop(undefined);
    }, 3000);

    child.once("exit", () => {
      clearTimeout(timer);
      resolveStop(undefined);
    });
  });
}

export async function runReleaseHealthCheck(targetArg = "refactor/.release/server") {
  const targetDir = resolve(targetArg);
  const env = parseEnvFile(resolve(targetDir, ".env"));

  if (!shouldRunReleaseHealthCheck(env)) {
    console.log(`Skipped release health check for ${targetDir}: .env is missing or still has placeholder HASH_SECRET.`);
    return { skipped: true, targetDir };
  }

  const { child, baseUrl } = await startReleaseServer(targetDir);
  try {
    const checkScript = resolve("refactor/scripts/check-release-health.mjs");
    const result = await new Promise((resolveResult, reject) => {
      const checker = spawn(process.execPath, [checkScript, baseUrl, "10", "500"], {
        cwd: resolve("."),
        stdio: ["ignore", "pipe", "pipe"]
      });

      let stdout = "";
      let stderr = "";
      checker.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });
      checker.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
      checker.on("error", reject);
      checker.on("exit", (code) => {
        if (code === 0) {
          resolveResult(stdout.trim());
        } else {
          reject(new Error(stderr.trim() || stdout.trim() || `health check exited with code ${code}`));
        }
      });
    });

    console.log(result);
    return { skipped: false, targetDir, baseUrl };
  } finally {
    await stopChild(child);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runReleaseHealthCheck(process.argv[2]).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
