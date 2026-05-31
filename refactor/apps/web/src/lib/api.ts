import type { CurrentResponse, SiteConfig, TimelineResponse } from "@watchme/shared";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

const DEFAULT_CONFIG: SiteConfig = {
  displayName: "WatchMe",
  siteTitle: "WatchMe",
  siteDescription: "A privacy-first personal status dashboard.",
  siteFavicon: "/favicon.ico"
};

const VIEWER_ID_KEY = "watchme.viewer_id";

function getViewerId(): string | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    const existing = window.localStorage.getItem(VIEWER_ID_KEY);
    if (existing) {
      return existing;
    }

    const next = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(VIEWER_ID_KEY, next);
    return next;
  } catch {
    return undefined;
  }
}

async function fetchJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { signal });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function fetchCurrent(signal?: AbortSignal) {
  const viewerId = getViewerId();
  const query = viewerId ? `?viewer_id=${encodeURIComponent(viewerId)}` : "";
  return fetchJson<CurrentResponse>(`/api/current${query}`, signal);
}

export function fetchTimeline(date: string, signal?: AbortSignal) {
  const timezoneOffset = new Date().getTimezoneOffset();
  return fetchJson<TimelineResponse>(`/api/timeline?date=${encodeURIComponent(date)}&tz=${timezoneOffset}`, signal);
}

export async function fetchConfig(signal?: AbortSignal): Promise<SiteConfig> {
  try {
    return await fetchJson<SiteConfig>("/api/config", signal);
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function getDefaultConfig() {
  return DEFAULT_CONFIG;
}
