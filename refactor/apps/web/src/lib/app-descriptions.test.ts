import { describe, expect, it } from "vitest";
import { formatMusicLine, getAppDescription } from "./app-descriptions";

describe("app descriptions", () => {
  it("uses title-aware templates for known apps", () => {
    expect(getAppDescription("VS Code", "watchme")).toBe("正在 VS Code 里改《watchme》~");
    expect(getAppDescription("PowerPoint", "Roadmap")).toBe("正在做《Roadmap》这份 PPT~");
  });

  it("falls back to generic text for unknown apps", () => {
    expect(getAppDescription("Something Else")).toBe("正在忙别的事情~");
  });

  it("uses playful app-specific copy without titles", () => {
    expect(getAppDescription("Postman")).toBe("正在 Postman 调接口~");
    expect(getAppDescription("Bilibili")).toBe("正在 B 站划水~");
  });

  it("prefers music metadata for player apps", () => {
    expect(getAppDescription("QQ Music", "Song Title", { title: "Song Title", artist: "Artist", app: "QQ Music" }))
      .toBe("正在 QQ 音乐听歌~");
  });

  it("formats music lines", () => {
    expect(formatMusicLine({ title: "Blue in Green", artist: "Miles Davis", app: "QQ Music" }))
      .toBe("Miles Davis - Blue in Green");
    expect(formatMusicLine({ title: "Blue in Green", app: "QQ Music" })).toBe("Blue in Green");
    expect(formatMusicLine(undefined)).toBeNull();
  });
});
