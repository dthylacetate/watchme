import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { loadEnvFile } from "./load-env";

loadEnvFile();

const { app, config } = createApp();

serve({
  fetch: app.fetch,
  port: config.port
}, (info) => {
  console.log(`WatchMe server listening on http://localhost:${info.port}`);
});
