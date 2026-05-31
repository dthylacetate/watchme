"use client";

import { useEffect, useRef, useState } from "react";
import type { CurrentResponse, SiteConfig, TimelineResponse } from "@watchme/shared";
import { fetchConfig, fetchCurrent, fetchTimeline, getDefaultConfig } from "@watchme/web/lib/api";

const POLL_INTERVAL_MS = 10_000;

function getToday(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function useDashboard() {
  const [config, setConfig] = useState<SiteConfig>(getDefaultConfig());
  const [current, setCurrent] = useState<CurrentResponse | null>(null);
  const [timeline, setTimeline] = useState<TimelineResponse | null>(null);
  const [selectedDate, setSelectedDate] = useState(getToday);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const firstLoad = useRef(true);

  useEffect(() => {
    const controller = new AbortController();

    const loadConfig = async () => {
      const nextConfig = await fetchConfig(controller.signal);
      if (!controller.signal.aborted) {
        setConfig(nextConfig);
      }
    };

    void loadConfig();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        if (firstLoad.current) {
          setLoading(true);
        }
        setError(null);

        const [nextCurrent, nextTimeline] = await Promise.all([
          fetchCurrent(controller.signal),
          fetchTimeline(selectedDate, controller.signal)
        ]);

        if (!controller.signal.aborted) {
          setCurrent(nextCurrent);
          setTimeline(nextTimeline);
          firstLoad.current = false;
        }
      } catch (caught) {
        if (!controller.signal.aborted) {
          setError(caught instanceof Error ? caught.message : "Unknown error");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void load();
    const timer = setInterval(() => {
      void load();
    }, POLL_INTERVAL_MS);

    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [selectedDate]);

  return {
    config,
    current,
    timeline,
    selectedDate,
    setSelectedDate,
    loading,
    error
  };
}
