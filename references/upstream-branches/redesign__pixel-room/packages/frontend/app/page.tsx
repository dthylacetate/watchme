"use client";

import { useEffect, useMemo, useState } from "react";
import { useDashboard } from "@/hooks/useDashboard";
import Header from "@/components/Header";
import CurrentStatus from "@/components/CurrentStatus";
import DeviceCard from "@/components/DeviceCard";
import DatePicker from "@/components/DatePicker";
import Timeline from "@/components/Timeline";
import PixelRoom from "@/components/PixelRoom";

export default function Home() {
  const { current, timeline, selectedDate, changeDate, loading, error, viewerCount } = useDashboard();

  // Build currentAppByDevice map for Timeline
  const currentAppByDevice = useMemo(() => {
    const map: Record<string, string> = {};
    if (current?.devices) {
      for (const d of current.devices) {
        if (d.is_online === 1 && d.app_name) {
          map[d.device_id] = d.app_name;
        }
      }
    }
    return map;
  }, [current?.devices]);

  // Night mode: activate when all devices are offline (Monika sleeping)
  const allOffline = useMemo(() => {
    if (!current?.devices || current.devices.length === 0) return false;
    return current.devices.every((d) => d.is_online !== 1);
  }, [current?.devices]);

  const [viewMode, setViewMode] = useState<"room" | "cards">("room");

  useEffect(() => {
    document.body.classList.toggle("night-mode", allOffline);
    return () => { document.body.classList.remove("night-mode"); };
  }, [allOffline]);

  return (
    <>
      <Header serverTime={current?.server_time} viewerCount={viewerCount} />

      {/* Error banner */}
      {error && (
        <div className="vn-bubble mb-4 border-[var(--color-primary)]">
          <p className="text-sm text-[var(--color-primary)]">
            (&gt;_&lt;) 连接失败了喵...
          </p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            别担心，会自动重试的~
          </p>
        </div>
      )}

      {/* Loading state */}
      {loading && !current && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <p className="text-2xl">(=^-ω-^=)</p>
          <div className="loading-dots">
            <span />
            <span />
            <span />
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">正在加载喵~</p>
        </div>
      )}

      {current && (
        <>
          {/* Current status - prominent VN dialog */}
          <CurrentStatus devices={current.devices ?? []} />

          {/* View toggle */}
          <div className="flex justify-end gap-1 mb-4">
            <button
              type="button"
              onClick={() => setViewMode("room")}
              className={`text-xs px-3 py-1.5 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 ${
                viewMode === "room"
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              }`}
            >
              🏠 房间
            </button>
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`text-xs px-3 py-1.5 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 ${
                viewMode === "cards"
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              }`}
            >
              📋 卡片
            </button>
          </div>

          {viewMode === "room" ? (
            <PixelRoom devices={current.devices ?? []} isNightMode={allOffline} />
          ) : (
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Left: device cards (narrow) */}
              <div className="lg:w-56 flex-shrink-0 space-y-2">
                <h2 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
                  Devices
                </h2>
                {(!current.devices || current.devices.length === 0) ? (
                  <div className="text-center py-4">
                    <p className="text-lg mb-1">( -ω-) zzZ</p>
                    <p className="text-xs text-[var(--color-text-muted)] italic">
                      还没有设备连接呢~
                    </p>
                  </div>
                ) : (
                  current.devices.map((d) => (
                    <DeviceCard key={d.device_id} device={d} />
                  ))
                )}
              </div>

              {/* Right: timeline (wide) */}
              <div className="flex-1 min-w-0">
                {/* Date picker */}
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <DatePicker selectedDate={selectedDate} onChange={changeDate} />
                </div>

                <div className="separator-dashed mb-4" />

                {/* Timeline content */}
                {loading && timeline ? (
                  <div className="opacity-60">
                    <Timeline
                      segments={timeline.segments}
                      summary={timeline.summary}
                      currentAppByDevice={currentAppByDevice}
                    />
                  </div>
                ) : timeline ? (
                  <Timeline
                    segments={timeline.segments}
                    summary={timeline.summary}
                    currentAppByDevice={currentAppByDevice}
                  />
                ) : null}
              </div>
            </div>
          )}
        </>
      )}

      {/* Footer */}
      <footer className="mt-12 pt-4 separator-dashed text-center">
        <p className="text-[10px] text-[var(--color-text-muted)]">
          Monika Now &middot; 每 10 秒自动刷新 &middot; (◕ᴗ◕)
        </p>
      </footer>
    </>
  );
}
