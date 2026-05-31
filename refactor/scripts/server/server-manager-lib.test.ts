import { describe, expect, it } from "vitest";

// @ts-expect-error JS helper is exercised by runtime tests in this file.
import { buildDeviceTokenEntry, parseEnvContent, stringifyEnvWithUpdates } from "./server-manager-lib.mjs";

describe("server manager env helpers", () => {
  it("parses env content", () => {
    const env = parseEnvContent("PORT=3000\n# comment\nHASH_SECRET=abc\n");
    expect(env).toEqual({
      PORT: "3000",
      HASH_SECRET: "abc",
    });
  });

  it("updates existing env values and appends missing ones", () => {
    const updated = stringifyEnvWithUpdates("PORT=3000\nHASH_SECRET=abc\n", {
      PORT: "3210",
      DEVICE_TOKEN_1: "desk-token:desk:Desk:windows",
    });

    expect(updated).toContain("PORT=3210");
    expect(updated).toContain("HASH_SECRET=abc");
    expect(updated).toContain("DEVICE_TOKEN_1=desk-token:desk:Desk:windows");
  });

  it("builds device token entries", () => {
    expect(buildDeviceTokenEntry("desk-token", "desk", "Desk")).toBe("desk-token:desk:Desk:windows");
  });
});
