import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadConfig } from "./config";

describe("server config", () => {
  it("defaults offline threshold to 120 seconds", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "watchme-config-"));
    try {
      const env: NodeJS.ProcessEnv = {
        NODE_ENV: "test",
        HASH_SECRET: "test-secret",
        DEVICE_TOKEN_1: "desk-token:desk-1:Desk:windows",
        DB_PATH: join(tempDir, "watchme.db"),
        STATIC_DIR: join(tempDir, "static")
      };
      const config = loadConfig(env);

      expect(config.offlineAfterSeconds).toBe(120);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
