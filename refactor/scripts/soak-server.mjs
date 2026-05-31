const baseUrl = process.argv[2] || "http://127.0.0.1:3212";
const token = process.argv[3] || "dev-token";
const iterations = Number(process.argv[4] || 24);
const delayMs = Number(process.argv[5] || 250);

const steps = [
  {
    app_id: "Code.exe",
    window_title: "watchme - Visual Studio Code",
    extra: {
      battery_percent: 82,
      battery_charging: true,
      music: {
        title: "Blue in Green",
        artist: "Miles Davis",
        app: "QQ Music"
      }
    }
  },
  {
    app_id: "chrome.exe",
    window_title: "Pull Request Review - Chrome",
    extra: {
      battery_percent: 80,
      battery_charging: true,
      music: {
        title: "Blue in Green",
        artist: "Miles Davis",
        app: "QQ Music"
      }
    }
  },
  {
    app_id: "QQ.exe",
    window_title: "QQ",
    extra: {
      battery_percent: 76,
      battery_charging: false,
      music: {
        title: "Breathe",
        artist: "Pink Floyd",
        app: "QQ Music"
      }
    }
  },
  {
    app_id: "Code.exe",
    window_title: "Timeline.tsx - watchme - Visual Studio Code",
    extra: {
      battery_percent: 74,
      battery_charging: false,
      music: {
        title: "Breathe",
        artist: "Pink Floyd",
        app: "QQ Music"
      }
    }
  }
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(path, options) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${path} -> HTTP ${response.status}: ${text}`);
  }
  return text ? JSON.parse(text) : {};
}

async function run() {
  const startedAt = Date.now();
  let currentChecks = 0;
  let timelineChecks = 0;

  for (let index = 0; index < iterations; index += 1) {
    const step = steps[index % steps.length];
    const timestamp = new Date().toISOString();

    await fetchJson("/api/report", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ...step,
        timestamp
      })
    });

    if (index % 3 === 0) {
      const current = await fetchJson("/api/current");
      if (!Array.isArray(current.devices) || current.devices.length === 0) {
        throw new Error("current response has no devices during soak run");
      }
      currentChecks += 1;
    }

    if (index % 4 === 0) {
      const localDate = new Date().toISOString().slice(0, 10);
      const timeline = await fetchJson(`/api/timeline?date=${localDate}&tz=0`);
      if (!Array.isArray(timeline.segments) || !Array.isArray(timeline.media_segments)) {
        throw new Error("timeline response shape is invalid during soak run");
      }
      timelineChecks += 1;
    }

    await sleep(delayMs);
  }

  const durationSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(
    JSON.stringify(
      {
        ok: true,
        baseUrl,
        iterations,
        currentChecks,
        timelineChecks,
        durationSeconds
      },
      null,
      2
    )
  );
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
