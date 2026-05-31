const baseUrl = process.argv[2] || "http://127.0.0.1:3000";
const retries = Number(process.argv[3] || 20);
const delayMs = Number(process.argv[4] || 1000);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(path) {
  const response = await fetch(`${baseUrl}${path}`);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${path} -> HTTP ${response.status}: ${text}`);
  }
  return text ? JSON.parse(text) : {};
}

function validateHealth(payload) {
  return payload && payload.status === "ok" && typeof payload.timestamp === "string";
}

function validateConfig(payload) {
  return payload
    && typeof payload.displayName === "string"
    && typeof payload.siteTitle === "string"
    && typeof payload.siteDescription === "string";
}

function validateCurrent(payload) {
  return payload
    && Array.isArray(payload.devices)
    && Array.isArray(payload.recent_activities)
    && typeof payload.server_time === "string";
}

function validateTimeline(payload) {
  return payload
    && typeof payload.date === "string"
    && Array.isArray(payload.segments)
    && Array.isArray(payload.media_segments);
}

async function runCheck() {
  const timelineDate = new Date().toISOString().slice(0, 10);

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const health = await fetchJson("/api/health");
      if (!validateHealth(health)) {
        throw new Error("health payload shape is invalid");
      }

      const config = await fetchJson("/api/config");
      if (!validateConfig(config)) {
        throw new Error("config payload shape is invalid");
      }

      const current = await fetchJson("/api/current");
      if (!validateCurrent(current)) {
        throw new Error("current payload shape is invalid");
      }

      const timeline = await fetchJson(`/api/timeline?date=${timelineDate}&tz=0`);
      if (!validateTimeline(timeline)) {
        throw new Error("timeline payload shape is invalid");
      }

      console.log(JSON.stringify({
        ok: true,
        baseUrl,
        attempt,
        checks: ["health", "config", "current", "timeline"]
      }, null, 2));
      return;
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      await sleep(delayMs);
    }
  }
}

runCheck().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
