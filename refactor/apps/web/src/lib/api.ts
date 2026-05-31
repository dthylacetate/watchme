import type { CurrentResponse, SiteConfig, TimelineResponse } from "@watchme/shared";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

const DEFAULT_CONFIG: SiteConfig = {
  displayName: "WatchMe",
  siteTitle: "WatchMe",
  siteDescription: "A privacy-first personal status dashboard.",
  siteFavicon: "/favicon.ico"
};

async function fetchJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { signal });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function fetchCurrent(signal?: AbortSignal) {
  return fetchJson<CurrentResponse>("/api/current", signal);
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
