import type { MusicPayload } from "@watchme/shared";

const descriptions: Record<string, string> = {
  qq: "正在 QQ 上聊天~",
  wechat: "正在微信上聊天~",
  "google chrome": "正在用 Chrome 逛网页~",
  "microsoft edge": "正在用 Edge 逛网页~",
  firefox: "正在用 Firefox 逛网页~",
  safari: "正在用 Safari 逛网页~",
  "vs code": "正在 VS Code 里写代码~",
  cursor: "正在 Cursor 里写代码~",
  "visual studio": "正在 Visual Studio 里写代码~",
  spotify: "正在 Spotify 听歌~",
  "qq music": "正在 QQ 音乐听歌~",
  "netease cloud music": "正在网易云听歌~",
  "apple music": "正在 Apple Music 听歌~",
  figma: "正在 Figma 里做设计~",
  photoshop: "正在 Photoshop 里修图~",
  "file explorer": "正在翻文件夹找东西~",
  finder: "正在翻文件夹找东西~",
  "windows terminal": "正在命令行里敲命令~",
  terminal: "正在命令行里敲命令~",
  steam: "正在 Steam 玩游戏~",
  vlc: "正在 VLC 看视频~",
  idle: "暂时离开一下~"
};

const titleTemplates = new Map<string, (title: string) => string>([
  ["vs code", (title) => `正在 VS Code 里处理《${title}》~`],
  ["cursor", (title) => `正在 Cursor 里处理《${title}》~`],
  ["qq music", (title) => `正在 QQ 音乐里播放《${title}》~`],
  ["spotify", (title) => `正在 Spotify 里播放《${title}》~`],
  ["apple music", (title) => `正在 Apple Music 里播放《${title}》~`],
  ["google chrome", (title) => `正在 Chrome 里看《${title}》~`],
  ["microsoft edge", (title) => `正在 Edge 里看《${title}》~`],
  ["firefox", (title) => `正在 Firefox 里看《${title}》~`],
  ["safari", (title) => `正在看《${title}》~`],
  ["figma", (title) => `正在 Figma 里做《${title}》~`],
  ["photoshop", (title) => `正在 Photoshop 里处理《${title}》~`],
  ["vlc", (title) => `正在看《${title}》~`],
  ["steam", (title) => `正在 Steam 里玩《${title}》~`]
]);

const MUSIC_APPS = new Set(["spotify", "qq music", "apple music", "netease cloud music"]);

export function getAppDescription(appName: string, displayTitle?: string, music?: MusicPayload): string {
  const lower = appName.toLowerCase();

  if (displayTitle && !(music?.title && MUSIC_APPS.has(lower))) {
    const template = titleTemplates.get(lower);
    if (template) {
      return template(displayTitle);
    }

    return `正在处理《${displayTitle}》~`;
  }

  return descriptions[lower] || "正在忙别的事情~";
}

export function formatMusicLine(music?: MusicPayload): string | null {
  if (!music?.title) {
    return null;
  }

  return music.artist ? `${music.artist} - ${music.title}` : music.title;
}
