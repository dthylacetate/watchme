import type { DevicePlatform } from "@watchme/shared";

export type AppCategory =
  | "browser"
  | "chat"
  | "design"
  | "email"
  | "file"
  | "finance"
  | "game"
  | "ide"
  | "meeting"
  | "music"
  | "system"
  | "video"
  | "unknown";

export interface AppCatalogEntry {
  id: string;
  name: string;
  category: AppCategory;
  platform?: DevicePlatform;
}

const APP_CATALOG: Record<string, AppCatalogEntry> = {
  "code.exe": { id: "code.exe", name: "VS Code", category: "ide", platform: "windows" },
  "cursor.exe": { id: "cursor.exe", name: "Cursor", category: "ide", platform: "windows" },
  "devenv.exe": { id: "devenv.exe", name: "Visual Studio", category: "ide", platform: "windows" },
  "idea64.exe": { id: "idea64.exe", name: "IntelliJ IDEA", category: "ide", platform: "windows" },
  "webstorm64.exe": { id: "webstorm64.exe", name: "WebStorm", category: "ide", platform: "windows" },
  "pycharm64.exe": { id: "pycharm64.exe", name: "PyCharm", category: "ide", platform: "windows" },
  "goland64.exe": { id: "goland64.exe", name: "GoLand", category: "ide", platform: "windows" },
  "rider64.exe": { id: "rider64.exe", name: "Rider", category: "ide", platform: "windows" },
  "eclipse.exe": { id: "eclipse.exe", name: "Eclipse", category: "ide", platform: "windows" },
  "chrome.exe": { id: "chrome.exe", name: "Google Chrome", category: "browser", platform: "windows" },
  "msedge.exe": { id: "msedge.exe", name: "Microsoft Edge", category: "browser", platform: "windows" },
  "firefox.exe": { id: "firefox.exe", name: "Firefox", category: "browser", platform: "windows" },
  "wechat.exe": { id: "wechat.exe", name: "微信", category: "chat", platform: "windows" },
  "weixin.exe": { id: "weixin.exe", name: "微信", category: "chat", platform: "windows" },
  "qq.exe": { id: "qq.exe", name: "QQ", category: "chat", platform: "windows" },
  "tim.exe": { id: "tim.exe", name: "TIM", category: "chat", platform: "windows" },
  "wxwork.exe": { id: "wxwork.exe", name: "企业微信", category: "chat", platform: "windows" },
  "dingtalk.exe": { id: "dingtalk.exe", name: "钉钉", category: "chat", platform: "windows" },
  "dingtalklauncher.exe": { id: "dingtalklauncher.exe", name: "钉钉", category: "chat", platform: "windows" },
  "lark.exe": { id: "lark.exe", name: "飞书", category: "chat", platform: "windows" },
  "feishu.exe": { id: "feishu.exe", name: "飞书", category: "chat", platform: "windows" },
  "outlook.exe": { id: "outlook.exe", name: "Outlook", category: "email", platform: "windows" },
  "explorer.exe": { id: "explorer.exe", name: "文件资源管理器", category: "file", platform: "windows" },
  "windowsterminal.exe": { id: "windowsterminal.exe", name: "Windows Terminal", category: "system", platform: "windows" },
  "powershell.exe": { id: "powershell.exe", name: "PowerShell", category: "system", platform: "windows" },
  "cmd.exe": { id: "cmd.exe", name: "命令提示符", category: "system", platform: "windows" },
  "taskmgr.exe": { id: "taskmgr.exe", name: "任务管理器", category: "system", platform: "windows" },
  "systemsettings.exe": { id: "systemsettings.exe", name: "设置", category: "system", platform: "windows" },
  "notepad.exe": { id: "notepad.exe", name: "记事本", category: "system", platform: "windows" },
  "applicationframehost.exe": { id: "applicationframehost.exe", name: "Windows App", category: "system", platform: "windows" },
  "spotify.exe": { id: "spotify.exe", name: "Spotify", category: "music", platform: "windows" },
  "qqmusic.exe": { id: "qqmusic.exe", name: "QQ音乐", category: "music", platform: "windows" },
  "cloudmusic.exe": { id: "cloudmusic.exe", name: "网易云音乐", category: "music", platform: "windows" },
  "music.ui.exe": { id: "music.ui.exe", name: "QQ音乐", category: "music", platform: "windows" },
  "kugou.exe": { id: "kugou.exe", name: "酷狗音乐", category: "music", platform: "windows" },
  "kuwo.exe": { id: "kuwo.exe", name: "酷我音乐", category: "music", platform: "windows" },
  "obs64.exe": { id: "obs64.exe", name: "OBS Studio", category: "video", platform: "windows" },
  "vlc.exe": { id: "vlc.exe", name: "VLC", category: "video", platform: "windows" },
  "potplayer.exe": { id: "potplayer.exe", name: "PotPlayer", category: "video", platform: "windows" },
  "bilibili.exe": { id: "bilibili.exe", name: "哔哩哔哩", category: "video", platform: "windows" },
  "photoshop.exe": { id: "photoshop.exe", name: "Photoshop", category: "design", platform: "windows" },
  "figma.exe": { id: "figma.exe", name: "Figma", category: "design", platform: "windows" },
  "leagueclientux.exe": { id: "leagueclientux.exe", name: "League Client", category: "game", platform: "windows" },
  "wemeetapp.exe": { id: "wemeetapp.exe", name: "腾讯会议", category: "meeting", platform: "windows" },
  "tencentmeeting.exe": { id: "tencentmeeting.exe", name: "腾讯会议", category: "meeting", platform: "windows" },
  "zoom.exe": { id: "zoom.exe", name: "Zoom", category: "meeting", platform: "windows" },
  "teams.exe": { id: "teams.exe", name: "Microsoft Teams", category: "meeting", platform: "windows" },
  "wps.exe": { id: "wps.exe", name: "WPS", category: "system", platform: "windows" },
  "et.exe": { id: "et.exe", name: "WPS Office", category: "system", platform: "windows" },
  "wpp.exe": { id: "wpp.exe", name: "WPS Office", category: "system", platform: "windows" },
  "clash verge.exe": { id: "clash verge.exe", name: "Clash Verge", category: "system", platform: "windows" },
  "mihomo party.exe": { id: "mihomo party.exe", name: "Mihomo Party", category: "system", platform: "windows" },
  "v2rayn.exe": { id: "v2rayn.exe", name: "v2rayN", category: "system", platform: "windows" },
  "thunder.exe": { id: "thunder.exe", name: "迅雷", category: "system", platform: "windows" },
  "baidunetdisk.exe": { id: "baidunetdisk.exe", name: "百度网盘", category: "system", platform: "windows" },
  "safari": { id: "safari", name: "Safari", category: "browser", platform: "macos" },
  "music": { id: "music", name: "Apple Music", category: "music", platform: "macos" },
  "spotify": { id: "spotify", name: "Spotify", category: "music", platform: "macos" },
  "finder": { id: "finder", name: "Finder", category: "file", platform: "macos" },
  "mail": { id: "mail", name: "Mail", category: "email", platform: "macos" },
  "facetime": { id: "facetime", name: "FaceTime", category: "meeting", platform: "macos" },
  "messages": { id: "messages", name: "Messages", category: "chat", platform: "macos" },
  "xcode": { id: "xcode", name: "Xcode", category: "ide", platform: "macos" }
};

export function normalizeAppId(appId: string): string {
  return appId.trim().toLowerCase();
}

export function resolveApp(appId: string): AppCatalogEntry {
  const normalized = normalizeAppId(appId);
  const found = APP_CATALOG[normalized];
  if (found) {
    return found;
  }

  const stem = normalized.replace(/\.app$/, "").replace(/\.exe$/, "");
  const label = stem
    .split(/[^a-z0-9]+/i)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return {
    id: normalized,
    name: label || appId,
    category: "unknown"
  };
}

export function listCatalogEntries(): AppCatalogEntry[] {
  return Object.values(APP_CATALOG);
}
