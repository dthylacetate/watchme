import { processDisplayTitle } from "./index";

const HASH_SECRET = "test-secret";

describe("privacy rules", () => {
  it("hides sensitive chat titles", () => {
    const result = processDisplayTitle({
      appId: "QQ.exe",
      windowTitle: "Alice",
      hashSecret: HASH_SECRET
    });

    expect(result.visibility).toBe("hide");
    expect(result.displayTitle).toBe("QQ");
  });

  it("hides sensitive browser pages", () => {
    const result = processDisplayTitle({
      appId: "chrome.exe",
      windowTitle: "Gmail - Inbox - Google Chrome",
      hashSecret: HASH_SECRET
    });

    expect(result.visibility).toBe("app_only");
    expect(result.dropReason).toBe("browser_sensitive_keyword");
  });

  it("keeps safe media titles", () => {
    const result = processDisplayTitle({
      appId: "QQMusic.exe",
      windowTitle: "Miles Davis - So What - QQ Music",
      hashSecret: HASH_SECRET
    });

    expect(result.visibility).toBe("safe_title");
    expect(result.displayTitle).toContain("Miles Davis");
  });

  it("extracts workspace names from VS Code titles", () => {
    const result = processDisplayTitle({
      appId: "Code.exe",
      windowTitle: "README.md - watchme - Visual Studio Code",
      hashSecret: HASH_SECRET
    });

    expect(result.displayTitle).toBe("watchme");
  });

  it("falls back to app-only for unknown apps", () => {
    const result = processDisplayTitle({
      appId: "mystery.exe",
      windowTitle: "Very Secret Title",
      hashSecret: HASH_SECRET
    });

    expect(result.visibility).toBe("app_only");
    expect(result.displayTitle).toBe("Mystery");
  });
});
