import type { MusicPayload, TimelineResponse } from "@watchme/shared";
import { formatMusicLine, getAppDescription } from "@watchme/web/lib/app-descriptions";

const APP_COLORS = [
  "#E8A0BF", "#88C9C9", "#E8B86D", "#C4A882", "#D4917B",
  "#A8C686", "#D4A0A0", "#8CB8B0", "#C9B97A", "#B89EC4"
];

interface CurrentAppInfo {
  appName: string;
  displayTitle?: string;
}

interface TimelineProps {
  timeline: TimelineResponse | null;
  loading: boolean;
  currentAppByDevice?: Record<string, CurrentAppInfo>;
  currentMusicByDevice?: Record<string, MusicPayload | undefined>;
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

export default function Timeline({
  timeline,
  loading,
  currentAppByDevice = {},
  currentMusicByDevice = {}
}: TimelineProps) {
  if (loading && !timeline) {
    return (
      <div className="text-center py-12 text-[var(--color-text-muted)]">
        <p className="text-2xl mb-2">(·ω·)</p>
        <p className="text-sm">正在拉取今天的活动</p>
      </div>
    );
  }

  if (!timeline || (timeline.segments.length === 0 && timeline.media_segments.length === 0)) {
    return (
      <div className="text-center py-12 text-[var(--color-text-muted)]">
        <p className="text-2xl mb-2">(^-^)</p>
        <p className="text-sm">今天还没有活动记录</p>
      </div>
    );
  }

  const colorMap = new Map<string, string>();
  const summaryEntries = Object.entries(timeline.summary).flatMap(([deviceId, apps]) =>
    Object.entries(apps).map(([appName, totalMinutes]) => ({ deviceId, appName, totalMinutes }))
  );
  const latestByApp = new Map<string, string>();
  for (const segment of timeline.segments) {
    latestByApp.set(`${segment.device_id}:${segment.app_name}`, segment.display_title || "");
  }

  const mediaTotalMinutes = Object.values(timeline.media_summary)
    .flatMap((songs) => Object.values(songs))
    .reduce((sum, minutes) => sum + minutes, 0);
  const currentMusic = Object.values(currentMusicByDevice).find((music) => music?.title);
  const currentMusicText = formatMusicLine(currentMusic);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xs font-semibold mb-2 text-[var(--color-text-muted)] uppercase tracking-wider">
          Foreground Summary
        </h3>
        <div className="space-y-1">
          {summaryEntries.sort((a, b) => {
            const aCurrent = currentAppByDevice[a.deviceId]?.appName === a.appName;
            const bCurrent = currentAppByDevice[b.deviceId]?.appName === b.appName;
            if (aCurrent !== bCurrent) return aCurrent ? -1 : 1;
            return b.totalMinutes - a.totalMinutes;
          }).map((entry) => {
            const color = getAppColor(entry.appName, colorMap);
            const current = currentAppByDevice[entry.deviceId];
            const isCurrent = current?.appName === entry.appName;
            const displayTitle = isCurrent
              ? current?.displayTitle
              : latestByApp.get(`${entry.deviceId}:${entry.appName}`);

            return (
              <div
                key={`${entry.deviceId}:${entry.appName}`}
                className={`timeline-bar flex items-center ${isCurrent ? "timeline-active" : ""}`}
              >
                <div className="flex-shrink-0 w-20 px-2 py-2 flex items-center justify-center gap-1">
                  {isCurrent ? (
                    <span className="text-[10px] font-bold text-[var(--color-primary)] current-badge">当前前台</span>
                  ) : (
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                  )}
                </div>
                <div className="flex-1 px-3 py-2 min-w-0" style={{ backgroundColor: isCurrent ? `${color}30` : `${color}15` }}>
                  <span className="text-xs font-medium truncate block">
                    {getAppDescription(entry.appName, displayTitle || undefined)}
                  </span>
                  {isCurrent && displayTitle ? (
                    <span className="text-[10px] text-[var(--color-text-muted)] truncate block mt-0.5">
                      {entry.appName} / {displayTitle}
                    </span>
                  ) : null}
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

      {mediaTotalMinutes > 0 || currentMusicText ? (
        <div>
          <h3 className="text-xs font-semibold mb-2 text-[var(--color-text-muted)] uppercase tracking-wider">
            Background Music
          </h3>
          <div className="timeline-bar flex items-center">
            <div className="flex-shrink-0 w-20 px-2 py-2 flex items-center justify-center">
              <span className="text-[12px] text-[var(--color-secondary)]">♪</span>
            </div>
            <div className="flex-1 px-3 py-2 min-w-0 bg-[rgba(136,201,201,0.12)]">
              <span className="text-xs font-medium truncate block">
                {currentMusicText ? `正在播放：${currentMusicText}` : "当前没有播放信息"}
              </span>
              <span className="text-[10px] text-[var(--color-text-muted)] block mt-0.5">
                后台播放累计
              </span>
            </div>
            <div className="flex-shrink-0 w-16 px-2 py-2 text-right">
              <span className="text-[10px] font-mono text-[var(--color-accent)] font-medium">
                {formatDuration(mediaTotalMinutes)}
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
