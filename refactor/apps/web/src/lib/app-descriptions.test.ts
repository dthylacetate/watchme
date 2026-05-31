import { describe, expect, it } from "vitest";
import { formatMusicLine, getAppDescription } from "./app-descriptions";

describe("app descriptions", () => {
  it("uses title-aware templates for known apps", () => {
    expect(getAppDescription("VS Code", "watchme")).toBe("正在 VS Code 里处理《watchme》~");
  });

  it("falls back to generic text for unknown apps", () => {
    expect(getAppDescription("Something Else")).toBe("正在忙别的事情~");
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
