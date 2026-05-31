import type { PublicDeviceState } from "@watchme/shared";

interface DeviceCardProps {
  device: PublicDeviceState;
  selected: boolean;
  onSelect: () => void;
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diff)) {
    return "未知时间";
  }
  if (diff < 60_000) {
    return "刚刚";
  }
  if (diff < 60 * 60_000) {
    return `${Math.floor(diff / 60_000)} 分钟前`;
  }
  return `${Math.floor(diff / 3_600_000)} 小时前`;
}

export default function DeviceCard({ device, selected, onSelect }: DeviceCardProps) {
  return (
    <button
      type="button"
      className={`card-decorated rounded-md px-3 py-2.5 flex items-center gap-2.5 cursor-pointer transition-all ${selected ? "selected-device" : ""}`}
      onClick={onSelect}
    >
      <span className="text-base" aria-hidden="true">
        {device.platform === "windows" ? "🪟" : "💻"}
      </span>
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold truncate">{device.device_name}</span>
          {device.is_online && device.extra?.battery_percent != null ? (
            <span className="text-[10px] text-[var(--color-text-muted)] flex-shrink-0">
              {device.extra.battery_charging ? "充电 " : "电量 "}
              {device.extra.battery_percent}%
            </span>
          ) : null}
        </div>
        <span className="text-[10px] text-[var(--color-text-muted)]">
          {device.is_online ? `${device.platform} · ${formatRelative(device.last_seen_at)}` : "offline"}
        </span>
      </div>
      <span className="text-xs flex-shrink-0" title={device.is_online ? "Online" : "Offline"}>
        {device.is_online ? "(=^-^=)" : "(-.-)zzZ"}
      </span>
    </button>
  );
}
