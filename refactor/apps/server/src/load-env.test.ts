import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadEnvFile } from "./load-env";

const TEST_KEYS = ["WATCHME_TEST_PORT", "WATCHME_TEST_SECRET"];

afterEach(() => {
  for (const key of TEST_KEYS) {
    delete process.env[key];
  }
});

describe("loadEnvFile", () => {
  it("loads missing values from .env files", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "watchme-env-"));
    const filePath = join(tempDir, ".env");

    try {
      writeFileSync(filePath, "WATCHME_TEST_PORT=3212\nWATCHME_TEST_SECRET=\"quoted-value\"\n", "utf8");
      loadEnvFile(filePath);

      expect(process.env.WATCHME_TEST_PORT).toBe("3212");
      expect(process.env.WATCHME_TEST_SECRET).toBe("quoted-value");
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("does not override existing process env", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "watchme-env-"));
    const filePath = join(tempDir, ".env");

    try {
      process.env.WATCHME_TEST_PORT = "9999";
      writeFileSync(filePath, "WATCHME_TEST_PORT=3212\n", "utf8");
      loadEnvFile(filePath);

      expect(process.env.WATCHME_TEST_PORT).toBe("9999");
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
