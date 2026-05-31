"use client";

import { useEffect, useMemo, useState } from "react";
import CurrentStatus from "@watchme/web/components/CurrentStatus";
import DatePicker from "@watchme/web/components/DatePicker";
import DeviceCard from "@watchme/web/components/DeviceCard";
import Header from "@watchme/web/components/Header";
import SiteMetadataSync from "@watchme/web/components/SiteMetadataSync";
import Timeline from "@watchme/web/components/Timeline";
import { useDashboard } from "@watchme/web/hooks/useDashboard";

export default function HomePage() {
  const {
    config,
    current,
    timeline,
    selectedDate,
    setSelectedDate,
    loading,
    error
  } = useDashboard();
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  const devices = useMemo(() => {
    const list = current?.devices ?? [];
    return [...list].sort((left, right) => left.device_id.localeCompare(right.device_id));
  }, [current?.devices]);

  const currentAppByDevice = useMemo(() => {
    const map: Record<string, string> = {};
    for (const device of devices) {
      if (device.is_online) {
        map[device.device_id] = device.app_name;
      }
    }
    return map;
  }, [devices]);

  const selectedDevice =
    devices.find((device) => device.device_id === selectedDeviceId)
    ?? devices.find((device) => device.is_online)
    ?? devices[0];

  const allOffline = useMemo(() => {
    if (devices.length === 0) {
      return false;
    }
    return devices.every((device) => !device.is_online);
  }, [devices]);

  useEffect(() => {
    if (selectedDevice && !selectedDeviceId) {
      setSelectedDeviceId(selectedDevice.device_id);
    }
  }, [selectedDevice, selectedDeviceId]);

  useEffect(() => {
    document.body.classList.toggle("night-mode", allOffline);
    return () => {
      document.body.classList.remove("night-mode");
    };
  }, [allOffline]);

  const filteredTimeline = timeline && selectedDevice
    ? {
        ...timeline,
        segments: timeline.segments.filter((segment) => segment.device_id === selectedDevice.device_id),
        media_segments: timeline.media_segments.filter((segment) => segment.device_id === selectedDevice.device_id),
        summary: selectedDevice.device_id in timeline.summary
          ? { [selectedDevice.device_id]: timeline.summary[selectedDevice.device_id] }
          : {},
        media_summary: selectedDevice.device_id in timeline.media_summary
          ? { [selectedDevice.device_id]: timeline.media_summary[selectedDevice.device_id] }
          : {}
      }
    : timeline;

  return (
    <>
      <SiteMetadataSync config={config} />
      <Header
        displayName={config.displayName}
        serverTime={current?.server_time}
        viewerCount={current?.viewer_count ?? 0}
      />

      {error ? (
        <div className="vn-bubble mb-4 border-[var(--color-primary)]">
          <p className="text-sm text-[var(--color-primary)]">
            (&gt;_&lt;) 连不上啦...
          </p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            {error}
          </p>
        </div>
      ) : null}

      <CurrentStatus
        displayName={config.displayName}
        device={selectedDevice}
        loading={loading && !current}
      />

      <section className="dashboard-grid">
        <aside className="device-column">
          <div className="section-title">Devices</div>
          {devices.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-lg mb-1">(-.-)zzZ</p>
              <p className="text-xs text-[var(--color-text-muted)] italic">
                还没有设备连上呢~
              </p>
            </div>
          ) : (
            devices.map((device) => (
              <DeviceCard
                key={device.device_id}
                device={device}
                selected={selectedDevice?.device_id === device.device_id}
                onSelect={() => setSelectedDeviceId(device.device_id)}
              />
            ))
          )}
        </aside>

        <section className="timeline-column">
          <div className="timeline-toolbar">
            <DatePicker selectedDate={selectedDate} onChange={setSelectedDate} />
            <div className="timeline-refresh-note">每 10 秒自动刷新</div>
          </div>
          <div className="separator-dashed mb-3" />
          <Timeline timeline={filteredTimeline} loading={loading} currentAppByDevice={currentAppByDevice} />
        </section>
      </section>
    </>
  );
}
