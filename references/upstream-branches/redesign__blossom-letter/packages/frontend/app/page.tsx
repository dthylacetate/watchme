"use client";

import type React from "react";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useDashboard } from "@/hooks/useDashboard";
import { getAppDescription } from "@/lib/app-descriptions";

/** Strip trailing "喵~" from descriptions */
function cleanDesc(appName: string, title?: string): string {
  return getAppDescription(appName, title).replace(/喵~$/, "").trim();
}

/* ═══ Helpers ═══ */
const PALETTE = ["#c47d8c", "#7a9e7e", "#b89858", "#8a7ea0", "#7eaab0", "#b08870", "#6a8e6a", "#a0886a", "#9a7090", "#7a9a8a"];

function fmtDur(m: number): string {
  if (!Number.isFinite(m) || m < 1) return "<1m";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h${r}m` : `${h}h`;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function offsetDate(s: string, n: number) {
  const d = new Date(s + "T00:00:00");
  if (isNaN(d.getTime())) return s;
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtDate(s: string) {
  const parts = s.split("-");
  if (parts.length !== 3) return s;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return s;
  const date = new Date(y, m - 1, d);
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return `${m}月${d}日 ${weekdays[date.getDay()]}`;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 9) return "晨光微熹";
  if (h >= 9 && h < 12) return "日上花梢";
  if (h >= 12 && h < 14) return "午后小憩";
  if (h >= 14 && h < 18) return "斜阳渐长";
  if (h >= 18 && h < 22) return "暮色四合";
  return "夜阑人静";
}

function fmtTime(t?: string) {
  if (!t) return "--:--";
  const d = new Date(t);
  return isNaN(d.getTime()) ? "--:--" : d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

/* ═══ Decorative Blossom ═══ */
function BlossomSVG({ className }: { className?: string }) {
  return (
    <svg className={className || "blossom-deco"} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      {[0, 72, 144, 216, 288].map((r) => (
        <ellipse key={r} cx="100" cy="100" rx="28" ry="48" fill="currentColor" transform={`rotate(${r} 100 100) translate(0 -30)`} opacity="0.7" />
      ))}
      <circle cx="100" cy="100" r="12" fill="currentColor" opacity="0.9" />
    </svg>
  );
}

/* ═══ Usage Bar Chart ═══ */
function UsageChart({ data, maxMins }: { data: { name: string; mins: number; color: string }[]; maxMins: number }) {
  if (!data.length) return null;
  return (
    <div className="usage-chart">
      {data.map((d, i) => (
        <div key={d.name} className="usage-row" style={{ "--ci": i } as React.CSSProperties}>
          <span className="usage-label">{d.name}</span>
          <div className="usage-track">
            <div
              className="usage-fill"
              style={{ width: `${Math.max(3, (d.mins / maxMins) * 100)}%`, background: d.color }}
            />
          </div>
          <span className="usage-mins">{fmtDur(d.mins)}</span>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════
   Main Page — 花信 v5
   ═══════════════════════════════════════ */
export default function Home() {
  const { current, timeline, selectedDate, changeDate, loading, error, viewerCount } = useDashboard();
  const [activeDevFilter, setActiveDevFilter] = useState<string | null>(null);
  const colorRef = useRef(new Map<string, string>());

  const data = current;
  const tlData = timeline;

  // All online devices
  const onlineDevices = useMemo(() =>
    (data?.devices ?? []).filter((d) => d.is_online === 1),
  [data?.devices]);

  // Primary active device (most recently seen)
  const active = useMemo(() => {
    if (!onlineDevices.length) return undefined;
    let best = onlineDevices[0];
    for (const d of onlineDevices) {
      const t = d.last_seen_at ? new Date(d.last_seen_at).getTime() : 0;
      const bt = best.last_seen_at ? new Date(best.last_seen_at).getTime() : 0;
      if (t > bt) best = d;
    }
    return best;
  }, [onlineDevices]);

  const isOnline = !!active;
  const music = active?.extra?.music;

  const allOffline = useMemo(() => {
    if (!data?.devices || data.devices.length === 0) return true;
    return data.devices.every((d) => d.is_online !== 1);
  }, [data?.devices]);

  useEffect(() => {
    document.body.classList.toggle("night-mode", allOffline);
    return () => { document.body.classList.remove("night-mode"); };
  }, [allOffline]);

  // Current app by device
  const currentAppByDevice = useMemo(() => {
    const m: Record<string, string> = {};
    for (const d of data?.devices ?? []) {
      if (d.is_online === 1 && d.app_name) m[d.device_id] = d.app_name;
    }
    return m;
  }, [data?.devices]);

  useEffect(() => { colorRef.current.clear(); }, [tlData]);

  const isToday = selectedDate === todayStr();

  // Build timeline groups
  const tlGroups = useMemo(() => {
    const segs = tlData?.segments ?? [];
    if (!segs.length) return [];

    const byDev = new Map<string, { name: string; items: typeof segs }>();
    for (const s of segs) {
      let e = byDev.get(s.device_id);
      if (!e) { e = { name: s.device_name, items: [] }; byDev.set(s.device_id, e); }
      e.items.push(s);
    }

    return Array.from(byDev.entries()).map(([devId, { name, items }]) => {
      const agg = new Map<string, { appName: string; title: string; mins: number; last: number; cur: boolean }>();
      for (const s of items) {
        const t = new Date(s.started_at).getTime();
        const ts = Number.isFinite(t) ? t : 0;
        const ex = agg.get(s.app_name);
        if (ex) {
          if (ts > ex.last) { ex.last = ts; if (s.display_title) ex.title = s.display_title; }
        } else {
          agg.set(s.app_name, { appName: s.app_name, title: s.display_title || "", mins: 0, last: ts, cur: false });
        }
      }
      const sum = tlData?.summary?.[devId];
      if (sum) for (const [a, m] of Object.entries(sum)) { const e = agg.get(a); if (e) e.mins = m as number; }
      const ca = currentAppByDevice[devId];
      if (ca) { const e = agg.get(ca); if (e) e.cur = true; }
      const sorted = Array.from(agg.values()).sort((a, b) => (a.cur !== b.cur ? (a.cur ? -1 : 1) : b.mins - a.mins));
      return { devId, name, apps: sorted };
    });
  }, [tlData, currentAppByDevice]);

  // Filtered timeline groups
  const filteredGroups = useMemo(() => {
    if (!activeDevFilter) return tlGroups;
    return tlGroups.filter((g) => g.devId === activeDevFilter);
  }, [tlGroups, activeDevFilter]);

  function getColor(app: string) {
    let c = colorRef.current.get(app);
    if (!c) { c = PALETTE[colorRef.current.size % PALETTE.length]!; colorRef.current.set(app, c); }
    return c;
  }

  // Top apps for chart (from filtered or all groups)
  const chartData = useMemo(() => {
    const appMins = new Map<string, number>();
    for (const g of filteredGroups) {
      for (const a of g.apps) {
        appMins.set(a.appName, (appMins.get(a.appName) || 0) + a.mins);
      }
    }
    const sorted = Array.from(appMins.entries())
      .map(([name, mins]) => ({ name, mins, color: getColor(name) }))
      .sort((a, b) => b.mins - a.mins)
      .slice(0, 6);
    return sorted;
  }, [filteredGroups]);

  const maxChartMins = chartData.length ? chartData[0].mins : 1;

  // Total screen time
  const totalMins = useMemo(() => {
    let t = 0;
    for (const g of filteredGroups) for (const a of g.apps) t += a.mins;
    return t;
  }, [filteredGroups]);

  const handleDevFilter = useCallback((devId: string) => {
    setActiveDevFilter((prev) => (prev === devId ? null : devId));
  }, []);

  // Fetch AI daily summary from backend
  const [dailySummary, setDailySummary] = useState<{ summary: string | null; generated_at: string | null } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setDailySummary(null);
    fetch(`/api/daily-summary?date=${selectedDate}`, { signal: controller.signal })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setDailySummary(d); })
      .catch(() => {});
    return () => controller.abort();
  }, [selectedDate]);

  return (
    <>
      {/* Fireflies — visible only in night mode */}
      <div className="firefly-container" aria-hidden="true">
        <div className="firefly" /><div className="firefly" /><div className="firefly" />
        <div className="firefly" /><div className="firefly" /><div className="firefly" />
        <div className="firefly" /><div className="firefly" />
      </div>

      {/* ── Header ── */}
      <header className="top-bar reveal">
        <div className="top-bar-inner">
          {/* Left: title */}
          <div className="top-bar-left">
            <h1 className="site-title">Monika Now</h1>
            <span className="site-greeting">{greeting()}</span>
          </div>

          {/* Center: devices as clickable buttons showing current app */}
          <div className="top-bar-center reveal reveal-d2">
            {(data?.devices ?? []).map((d) => {
              const isSel = activeDevFilter === d.device_id;
              const isOn = d.is_online === 1;
              return (
                <button
                  key={d.device_id}
                  type="button"
                  className={`dev-btn ${isSel ? "dev-btn-active" : ""} ${isOn ? "" : "dev-btn-off"}`}
                  onClick={() => handleDevFilter(d.device_id)}
                >
                  <span className="dev-btn-name">{d.device_name}</span>
                  {isOn && (
                    <span className="dev-btn-app">
                      {d.app_name}{d.display_title ? ` · ${d.display_title}` : ""}
                    </span>
                  )}
                  {!isOn && <span className="dev-btn-off-label">离线</span>}
                  {isOn && d.extra && typeof d.extra.battery_percent === "number" && (
                    <span className="dev-btn-batt">{d.extra.battery_charging ? "\u26A1" : ""}{d.extra.battery_percent}%</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right: time + viewers */}
          <div className="top-bar-right">
            <span className="top-time">{fmtTime(data?.server_time)}</span>
            {viewerCount > 0 && <span className="top-viewers">{viewerCount} 人在看</span>}
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <div className="panels">
        {/* ═══ LEFT ═══ */}
        <div className="panel-left">
          <BlossomSVG />
          <div className="petal-container">
            <div className="petal" /><div className="petal" /><div className="petal" /><div className="petal" />
            <div className="petal" /><div className="petal" /><div className="petal" /><div className="petal" />
            <div className="petal" /><div className="petal" /><div className="petal" /><div className="petal" />
          </div>

          {isOnline ? (
            <div className="presence-content">
              {/* Poetic online indicator */}
              <p className="status-line reveal reveal-d2">
                <span className="status-dot" />
                此刻在线
              </p>

              {/* Hero: split into app + what */}
              <div className="hero-block reveal reveal-d3">
                <p className="hero-app hero-alive">正在用 {active.app_name}</p>
                {active.display_title && (
                  <p className="hero-title">写「{active.display_title}」</p>
                )}
              </div>

              {/* Music — detailed */}
              {music?.title && (
                <div className="music-block reveal reveal-d4">
                  <p className="music-label">正在听的音乐</p>
                  <div className="music-row">
                    <div className="music-bars">
                      <div className="m-bar" /><div className="m-bar" /><div className="m-bar" /><div className="m-bar" />
                    </div>
                    <div className="music-info">
                      <span className="music-title-text">{music.title}</span>
                      {music.artist && <span className="music-artist">{music.artist}</span>}
                      {music.app && <span className="music-app">via {music.app}</span>}
                    </div>
                  </div>
                </div>
              )}

              {/* Separator */}
              <div className="orn-sep reveal reveal-d4"><span className="orn-sep-dot" /></div>

              {/* Usage chart */}
              <div className="chart-section reveal reveal-d5">
                <div className="chart-header">
                  <span className="chart-label">今日使用 Top 6</span>
                  <span className="chart-total">{fmtDur(totalMins)}</span>
                </div>
                <UsageChart data={chartData} maxMins={maxChartMins} />
              </div>

              {/* AI Daily Summary */}
              <div className="ai-summary reveal reveal-d5">
                <p className="ai-summary-label">今日小结</p>
                <p className="ai-summary-text">
                  {dailySummary?.summary || "每晚 21:00 自动生成"}
                </p>
                <span className="ai-summary-time">
                  {dailySummary?.generated_at ? `${dailySummary.generated_at.slice(11, 16)} · AI 生成` : "等待生成..."}
                </span>
              </div>
            </div>
          ) : (
            <div className="presence-content presence-offline reveal reveal-d2">
              <p className="offline-poem-line">月落乌啼</p>
              <p className="offline-poem-line offline-poem-dim">万籁俱寂，设备已入眠</p>
              {loading && !data && <p className="offline-loading">轻叩数据之门...</p>}
              {error && !loading && <p className="offline-loading">信号微弱，尝试重连中</p>}
            </div>
          )}

          <p className="bottom-quote">&ldquo;每一刻都值得被记录&rdquo;</p>
        </div>

        {/* ═══ RIGHT: Timeline ═══ */}
        <div className="panel-right">
          {/* Date nav */}
          <div className="tl-header reveal reveal-d3">
            <span className="tl-title">
              时间线
              {activeDevFilter && (
                <span className="tl-filter-badge">
                  {(data?.devices ?? []).find((d) => d.device_id === activeDevFilter)?.device_name}
                  <button type="button" className="tl-filter-clear" onClick={() => setActiveDevFilter(null)}>&times;</button>
                </span>
              )}
            </span>
            <div className="tl-nav">
              <button type="button" className="btn-subtle" onClick={() => changeDate(offsetDate(selectedDate, -1))} aria-label="前一天">&larr;</button>
              <span className="tl-date" suppressHydrationWarning>{fmtDate(selectedDate)}</span>
              <button type="button" className="btn-subtle" onClick={() => changeDate(offsetDate(selectedDate, 1))} disabled={isToday} aria-label="后一天">&rarr;</button>
              {!isToday && <button type="button" className="btn-subtle btn-today" onClick={() => changeDate(todayStr())}>今天</button>}
            </div>
          </div>

          {/* Timeline scroll */}
          <div className="tl-scroll reveal reveal-d4">
            {filteredGroups.length === 0 && !loading ? (
              <div className="tl-empty">
                <p className="tl-empty-poem">尚无足迹</p>
                <p className="tl-empty-sub">这一天还是一张白纸</p>
              </div>
            ) : (
              <div style={{ opacity: loading && tlData ? 0.4 : 1, transition: "opacity 0.3s" }}>
                {/* Current activity per device — pinned at top */}
                {onlineDevices.length > 0 && isToday && (
                  <div className="now-summary">
                    <p className="now-summary-label">此刻</p>
                    {onlineDevices.map((d) => (
                      <div key={d.device_id} className="now-summary-row">
                        <span className="now-summary-dev">{d.device_name}</span>
                        <span className="now-summary-app">{d.app_name}{d.display_title ? ` · ${d.display_title}` : ""}</span>
                      </div>
                    ))}
                  </div>
                )}

                {filteredGroups.map(({ devId, name, apps }) => (
                  <div key={devId} className="tl-device-group">
                    <p className="tl-device-name">{name}</p>
                    <div className="tl-list">
                      {apps.map((app, i) => {
                        const c = getColor(app.appName);
                        return (
                          <div
                            key={app.appName}
                            className={`tl-item tl-stagger ${app.cur ? "tl-item-active" : ""}`}
                            style={{ "--i": i } as React.CSSProperties}
                          >
                            <div className="tl-dot" style={{ background: c, opacity: app.cur ? 1 : 0.5 }} />
                            {app.cur && <span className="tl-now">Now</span>}
                            <span className="tl-desc">{cleanDesc(app.appName, app.title)}</span>
                            <span className="tl-dur">{fmtDur(app.mins)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="tl-footer" suppressHydrationWarning>
            <span suppressHydrationWarning>每 10 秒自动刷新</span><span suppressHydrationWarning>Monika Now</span>
          </div>
        </div>
      </div>
    </>
  );
}
