import { createHmac } from "node:crypto";
import { resolveApp, type AppCatalogEntry } from "@watchme/app-catalog";

export type TitleVisibility = "hide" | "safe_title" | "app_only" | "allowlist";

export interface ProcessTitleInput {
  appId: string;
  windowTitle: string;
  hashSecret: string;
  allowlist?: string[];
}

export interface ProcessTitleResult {
  appId: string;
  appName: string;
  visibility: TitleVisibility;
  displayTitle?: string;
  titleHash: string;
  dropReason?: string;
  app: AppCatalogEntry;
}

const SENSITIVE_BROWSER_KEYWORDS = [
  "login",
  "sign in",
  "mail",
  "gmail",
  "outlook",
  "bank",
  "payment",
  "invoice",
  "checkout",
  "github notifications",
  "settings",
  "security",
  "verify",
  "password",
  "2fa",
  "telegram",
  "slack"
];

const BROWSER_SUFFIXES = [
  "Google Chrome",
  "Microsoft Edge",
  "Firefox",
  "Safari",
  "Arc"
];

const SENSITIVE_CATEGORIES = new Set(["chat", "email", "finance", "system", "file", "meeting"]);
const SAFE_TITLE_CATEGORIES = new Set(["design", "game", "ide", "music", "video"]);

export function createTitleHash(appId: string, title: string, hashSecret: string): string {
  return createHmac("sha256", hashSecret)
    .update(`${appId}\0${title.trim().toLowerCase()}`)
    .digest("hex");
}

function stripAppSuffix(title: string, appName: string): string {
  const escapedAppName = appName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`\\s[-|·:]\\s${escapedAppName}$`, "i"),
    ...BROWSER_SUFFIXES.map((suffix) => new RegExp(`\\s[-|·:]\\s${suffix}$`, "i"))
  ];

  let result = title.trim();
  for (const pattern of patterns) {
    result = result.replace(pattern, "").trim();
  }
  return result;
}

function sanitizeIdeTitle(title: string, appName: string): string | undefined {
  const stripped = stripAppSuffix(title, appName);
  const parts = stripped.split(" - ").map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return parts[parts.length - 1 - 1] || parts[parts.length - 1];
  }
  if (/[A-Za-z]:\\|\/Users\/|\/home\//.test(stripped)) {
    return undefined;
  }
  return stripped || undefined;
}

function sanitizeBrowserTitle(title: string): { title?: string; sensitive: boolean } {
  const stripped = stripAppSuffix(title, "browser");
  const lower = stripped.toLowerCase();
  if (!stripped) {
    return { sensitive: true };
  }
  if (SENSITIVE_BROWSER_KEYWORDS.some((keyword) => lower.includes(keyword))) {
    return { sensitive: true };
  }
  return { title: stripped, sensitive: false };
}

function sanitizeMediaTitle(title: string, appName: string): string | undefined {
  const stripped = stripAppSuffix(title, appName);
  return stripped || undefined;
}

export function processDisplayTitle(input: ProcessTitleInput): ProcessTitleResult {
  const app = resolveApp(input.appId);
  const trimmedTitle = input.windowTitle.trim();
  const normalizedTitle = trimmedTitle || app.name;
  const titleHash = createTitleHash(app.id, normalizedTitle, input.hashSecret);

  if (!trimmedTitle) {
    return {
      appId: app.id,
      appName: app.name,
      visibility: "app_only",
      displayTitle: app.name,
      titleHash,
      dropReason: "empty_title",
      app
    };
  }

  const allowlisted = input.allowlist?.some((entry) => entry.toLowerCase() === app.id);
  if (allowlisted) {
    return {
      appId: app.id,
      appName: app.name,
      visibility: "allowlist",
      displayTitle: trimmedTitle,
      titleHash,
      app
    };
  }

  if (SENSITIVE_CATEGORIES.has(app.category)) {
    return {
      appId: app.id,
      appName: app.name,
      visibility: "hide",
      displayTitle: app.name,
      titleHash,
      dropReason: "sensitive_category",
      app
    };
  }

  if (app.category === "browser") {
    const browser = sanitizeBrowserTitle(trimmedTitle);
    return {
      appId: app.id,
      appName: app.name,
      visibility: browser.sensitive ? "app_only" : "safe_title",
      displayTitle: browser.sensitive ? app.name : browser.title,
      titleHash,
      dropReason: browser.sensitive ? "browser_sensitive_keyword" : undefined,
      app
    };
  }

  if (app.category === "ide") {
    const safeTitle = sanitizeIdeTitle(trimmedTitle, app.name);
    return {
      appId: app.id,
      appName: app.name,
      visibility: safeTitle ? "safe_title" : "app_only",
      displayTitle: safeTitle ?? app.name,
      titleHash,
      dropReason: safeTitle ? undefined : "ide_path_hidden",
      app
    };
  }

  if (SAFE_TITLE_CATEGORIES.has(app.category)) {
    const safeTitle = sanitizeMediaTitle(trimmedTitle, app.name);
    return {
      appId: app.id,
      appName: app.name,
      visibility: safeTitle ? "safe_title" : "app_only",
      displayTitle: safeTitle ?? app.name,
      titleHash,
      app
    };
  }

  return {
    appId: app.id,
    appName: app.name,
    visibility: "app_only",
    displayTitle: app.name,
    titleHash,
    dropReason: "unknown_app_default",
    app
  };
}
