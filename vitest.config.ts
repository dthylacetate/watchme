import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@watchme/shared": fileURLToPath(new URL("./refactor/packages/shared/src/index.ts", import.meta.url)),
      "@watchme/privacy": fileURLToPath(new URL("./refactor/packages/privacy/src/index.ts", import.meta.url)),
      "@watchme/db": fileURLToPath(new URL("./refactor/packages/db/src/index.ts", import.meta.url)),
      "@watchme/app-catalog": fileURLToPath(new URL("./refactor/packages/app-catalog/src/index.ts", import.meta.url)),
      "@watchme/web": fileURLToPath(new URL("./refactor/apps/web/src", import.meta.url))
    }
  },
  test: {
    globals: true,
    environment: "node",
    include: ["refactor/**/*.test.ts"],
    coverage: {
      reporter: ["text", "html"]
    }
  }
});
