import type { TimelineResponse } from "@watchme/shared";
import { getAppDescription } from "@watchme/web/lib/app-descriptions";

const APP_COLORS = [
  "#E8A0BF", "#88C9C9", "#E8B86D", "#C4A882", "#D4917B",
  "#A8C686", "#D4A0A0", "#8CB8B0", "#C9B97A", "#B89EC4"
];

interface TimelineProps {
  timeline: TimelineResponse | null;
  loading: boolean;
  currentAppByDevice?: Record<string, string>;
}

function formatDuration(minutes: number): string {
  if (minutes < 1) return "<1m";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder > 0 ? `${hours}h ${remainder}m` : `${hours}h`;
}

function getAppColor(appName: string, colorMap: Map<string, string>): string {
  const existing = colorMap.get(appName);
  if (existing) return existing;
  const color = APP_COLORS[colorMap.size % APP_COLORS.length]!;
  colorMap.set(appName, color);
  return color;
}

export default function Timeline({ timeline, loading, currentAppByDevice = {} }: TimelineProps) {
  if (loading && !timeline) {
    return (
      <div className="text-center py-12 text-[var(--color-text-muted)]">
        <p className="text-2xl mb-2">(・・?)</p>
        <p className="text-sm">正在拉取今天的活动~</p>
      </div>
    );
  }

  if (!timeline || (timeline.segments.length === 0 && timeline.media_segments.length === 0)) {
    return (
      <div className="text-center py-12 text-[var(--color-text-muted)]">
        <p className="text-2xl mb-2">(^-^)</p>
        <p className="text-sm">今天还没有活动记录呢~</p>
      </div>
    );
  }

  const colorMap = new Map<string, string>();
  const summaryEntries = Object.entries(timeline.summary).flatMap(([deviceId, apps]) =>
    Object.entries(apps).map(([appName, totalMinutes]) => ({ deviceId, appName, totalMinutes }))
  );
  const mediaEntries = Object.entries(timeline.media_summary).flatMap(([deviceId, songs]) =>
    Object.entries(songs).map(([song, totalMinutes]) => ({ deviceId, song, totalMinutes }))
  );
  const latestByApp = new Map<string, string>();
  for (const segment of timeline.segments) {
    latestByApp.set(segment.app_name, segment.display_title || "");
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xs font-semibold mb-2 text-[var(--color-text-muted)] uppercase tracking-wider">
          Foreground Summary
        </h3>
        <div className="space-y-1">
          {summaryEntries.sort((a, b) => b.totalMinutes - a.totalMinutes).map((entry) => {
            const color = getAppColor(entry.appName, colorMap);
            const isCurrent = currentAppByDevice[entry.deviceId] === entry.appName;

            return (
              <div key={`${entry.deviceId}:${entry.appName}`} className={`timeline-bar flex items-center ${isCurrent ? "timeline-active" : ""}`}>
                <div className="flex-shrink-0 w-16 px-2 py-2 flex items-center justify-center gap-1">
                  {isCurrent ? (
                    <span className="text-[10px] font-bold text-[var(--color-primary)] current-badge">当前</span>
                  ) : (
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                  )}
                </div>
                <div className="flex-1 px-3 py-2 min-w-0" style={{ backgroundColor: isCurrent ? `${color}30` : `${color}15` }}>
                  <span className="text-xs font-medium truncate block">
                    {getAppDescription(entry.appName, latestByApp.get(entry.appName) || undefined)}
                  </span>
                </div>
                <div className="flex-shrink-0 w-16 px-2 py-2 text-right">
                  <span className="text-[10px] font-mono text-[var(--color-accent)] font-medium">
                    {formatDuration(entry.totalMinutes)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {mediaEntries.length > 0 ? (
        <div>
          <h3 className="text-xs font-semibold mb-2 text-[var(--color-text-muted)] uppercase tracking-wider">
            Background Music
          </h3>
          <div className="space-y-1">
            {mediaEntries.sort((a, b) => b.totalMinutes - a.totalMinutes).map((entry) => (
              <div key={`${entry.deviceId}:${entry.song}`} className="timeline-bar flex items-center">
                <div className="flex-shrink-0 w-16 px-2 py-2 flex items-center justify-center">
                  <span className="text-[11px] text-[var(--color-secondary)]">♪</span>
                </div>
                <div className="flex-1 px-3 py-2 min-w-0 bg-[rgba(136,201,201,0.12)]">
                  <span className="text-xs font-medium truncate block">
                    {entry.song}
                  </span>
                </div>
                <div className="flex-shrink-0 w-16 px-2 py-2 text-right">
                  <span className="text-[10px] font-mono text-[var(--color-accent)] font-medium">
                    {formatDuration(entry.totalMinutes)}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className="timeline-note">后台音乐会单独计时，不依赖播放器是不是当前最上层窗口。</p>
        </div>
      ) : null}
    </div>
  );
}
