import type { PublicDeviceState } from "@watchme/shared";
import { formatMusicLine, getAppDescription } from "@watchme/web/lib/app-descriptions";

interface CurrentStatusProps {
  displayName: string;
  device?: PublicDeviceState;
  loading: boolean;
}

export default function CurrentStatus({ displayName, device, loading }: CurrentStatusProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <p className="text-2xl">(=^-^=)</p>
        <div className="loading-dots">
          <span />
          <span />
          <span />
        </div>
        <p className="text-xs text-[var(--color-text-muted)]">正在加载</p>
      </div>
    );
  }

  const active = device?.is_online ? device : undefined;
  const description = active ? getAppDescription(active.app_name, active.display_title, active.extra?.music) : null;
  const musicText = formatMusicLine(active?.extra?.music);
  const openApps = active?.extra?.open_apps ?? [];

  return (
    <div className="status-bubble mb-6">
      <div className="status-ears" aria-hidden="true">
        <span className="ear ear-left" />
        <span className="ear ear-right" />
      </div>
      <div className="px-5 py-4 text-center">
        {active ? (
          <>
            <p className="text-xs text-[var(--color-text-muted)] mb-1">
              {displayName} 现在...
            </p>
            <p className="text-lg font-bold font-[var(--font-jp)] text-[var(--color-primary)] leading-relaxed status-text">
              {description}
            </p>
            {musicText ? (
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                ♪ 正在听：{musicText}
              </p>
            ) : null}
            <div className="flex items-center justify-center gap-3 mt-1.5 flex-wrap">
              <span className="text-[10px] text-[var(--color-text-muted)]">
                当前设备：{active.device_name}
              </span>
              {active.extra?.battery_percent != null ? (
                <span className="text-[10px] text-[var(--color-text-muted)]">
                  {active.extra.battery_charging ? "充电中 " : "电量 "}
                  {active.extra.battery_percent}%
                </span>
              ) : null}
            </div>
            {openApps.length > 0 ? (
              <div className="open-apps-row" aria-label="当前打开的应用">
                {openApps.slice(0, 12).map((app) => (
                  <span
                    key={app.app_id}
                    className={`open-app-pill ${app.app_name === active.app_name ? "open-app-pill-active" : ""}`}
                    title={app.display_title || app.app_name || app.app_id}
                  >
                    {app.app_name || app.app_id}
                  </span>
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <div className="py-1">
            <p className="text-xl mb-1">(-.-)zzZ</p>
            <p className="text-sm text-[var(--color-text-muted)]">
              {displayName} 现在不在电脑前
            </p>
          </div>
        )}
      </div>
      <div className="status-pointer" aria-hidden="true" />
    </div>
  );
}
