const VIEWER_TTL_MS = 30_000;

const viewers = new Map<string, number>();

export function touchViewer(key: string): number {
  const now = Date.now();
  viewers.set(key, now);

  for (const [viewerKey, lastSeenAt] of viewers.entries()) {
    if (now - lastSeenAt > VIEWER_TTL_MS) {
      viewers.delete(viewerKey);
    }
  }

  return viewers.size;
}

export function resetViewersForTest(): void {
  viewers.clear();
}
