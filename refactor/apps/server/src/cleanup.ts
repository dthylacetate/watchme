import type { Database } from "@watchme/db";
import type { ServerConfig } from "./config";

export function runCleanup(db: Database, config: ServerConfig, nowIso?: string) {
  return db.cleanupOldData(config.retentionDays, nowIso);
}

export function startCleanupLoop(db: Database, config: ServerConfig) {
  if (config.retentionDays <= 0 || config.cleanupIntervalMinutes <= 0) {
    return () => undefined;
  }

  const run = () => {
    try {
      const result = runCleanup(db, config);
      if (result.deletedActivities > 0 || result.deletedOpenAppActivities > 0 || result.deletedMediaActivities > 0) {
        console.log(
          `Cleanup removed ${result.deletedActivities} foreground rows, ${result.deletedOpenAppActivities} open app rows and ${result.deletedMediaActivities} media rows`
        );
      }
    } catch (error) {
      console.error("Cleanup failed", error);
    }
  };

  run();
  const timer = setInterval(run, config.cleanupIntervalMinutes * 60_000);
  return () => clearInterval(timer);
}
