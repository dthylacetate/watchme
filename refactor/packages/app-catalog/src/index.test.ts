import { describe, expect, it } from "vitest";
import { resolveApp } from "./index";

describe("app catalog", () => {
  it("uses Chinese display names for common Chinese apps", () => {
    expect(resolveApp("Weixin.exe").name).toBe("微信");
    expect(resolveApp("DingTalk.exe").name).toBe("钉钉");
    expect(resolveApp("WeMeetApp.exe").name).toBe("腾讯会议");
    expect(resolveApp("QQMusic.exe").name).toBe("QQ音乐");
    expect(resolveApp("cloudmusic.exe").name).toBe("网易云音乐");
  });

  it("uses localized names for common Windows shell apps", () => {
    expect(resolveApp("explorer.exe").name).toBe("文件资源管理器");
    expect(resolveApp("taskmgr.exe").name).toBe("任务管理器");
    expect(resolveApp("SystemSettings.exe").name).toBe("设置");
  });

  it("keeps unknown app fallback stable", () => {
    expect(resolveApp("mystery-tool.exe")).toMatchObject({
      id: "mystery-tool.exe",
      name: "Mystery Tool",
      category: "unknown"
    });
  });
});
