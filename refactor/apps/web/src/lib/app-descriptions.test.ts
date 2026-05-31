import { describe, expect, it } from "vitest";
import { formatMusicLine, getAppDescription } from "./app-descriptions";

describe("app descriptions", () => {
  it("uses reference title-aware templates for known apps", () => {
    expect(getAppDescription("VS Code", "watchme")).toBe("正在用VS Code写「watchme」喵~");
    expect(getAppDescription("PowerPoint", "Roadmap")).toBe("正在做「Roadmap」PPT喵~");
    expect(getAppDescription("Microsoft Edge", "Docs")).toBe("正在用Edge看「Docs」喵~");
  });

  it("falls back to generic text for unknown apps", () => {
    expect(getAppDescription("Something Else")).toBe("正在忙别的喵~");
    expect(getAppDescription("Something Else", "Mystery")).toBe("正在玩「Mystery」喵~");
  });

  it("uses reference app-specific copy without titles", () => {
    expect(getAppDescription("Postman")).toBe("正在用Postman调接口喵~");
    expect(getAppDescription("Bilibili")).toBe("正在B站划水摸鱼喵~");
    expect(getAppDescription("Visual Studio Code")).toBe("正在用VS Code疯狂写bug喵~");
    expect(getAppDescription("Tencent Meeting")).toBe("正在开会喵~");
  });

  it("does not match short app names to longer music apps", () => {
    expect(getAppDescription("QQ", "QQ")).toBe("正在QQ上水群喵~");
    expect(getAppDescription("Weixin", "Weixin")).toBe("正在微信上聊天喵~");
    expect(getAppDescription("File Explorer", "File Explorer")).toBe("正在翻文件夹找东西喵~");
  });

  it("matches app names by useful aliases and substrings", () => {
    expect(getAppDescription("Adobe Photoshop 2026")).toBe("正在用Photoshop修图喵~");
    expect(getAppDescription("Clash Verge Rev")).toBe("正在调代理设置喵~");
  });

  it("prefers music metadata for player apps", () => {
    expect(getAppDescription("QQ Music", "Song Title", { title: "Song Title", artist: "Artist", app: "QQ Music" }))
      .toBe("正在QQ音乐听歌喵~");
  });

  it("formats music lines", () => {
    expect(formatMusicLine({ title: "Blue in Green", artist: "Miles Davis", app: "QQ Music" }))
      .toBe("Miles Davis - Blue in Green");
    expect(formatMusicLine({ title: "Blue in Green", app: "QQ Music" })).toBe("Blue in Green");
    expect(formatMusicLine(undefined)).toBeNull();
  });
});
