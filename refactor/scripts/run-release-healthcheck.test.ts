import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
// @ts-expect-error JS helper is exercised by runtime tests in this file.
import { parseEnvFile, shouldRunReleaseHealthCheck } from "./run-release-healthcheck.mjs";

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const target = tempDirs.pop();
    if (target) {
      rmSync(target, { recursive: true, force: true });
    }
  }
});

describe("run-release-healthcheck helper", () => {
  it("parses simple env files", () => {
    const dir = mkdtempSync(join(tmpdir(), "watchme-health-"));
    tempDirs.push(dir);
    const envPath = join(dir, ".env");
    writeFileSync(envPath, "PORT=3999\nHASH_SECRET=\"dev-secret\"\n", "utf8");

    expect(parseEnvFile(envPath)).toEqual({
      PORT: "3999",
      HASH_SECRET: "dev-secret"
    });
  });

  it("skips health checks for placeholder secrets", () => {
    expect(shouldRunReleaseHealthCheck({})).toBe(false);
    expect(shouldRunReleaseHealthCheck({ HASH_SECRET: "replace-me" })).toBe(false);
    expect(shouldRunReleaseHealthCheck({ HASH_SECRET: "real-secret" })).toBe(true);
  });
});
