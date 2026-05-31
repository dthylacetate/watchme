import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
// @ts-expect-error JS helper is exercised by runtime tests in this file.
import { prepareServerRelease } from "./prepare-server-release-lib.mjs";

const tempRoots: string[] = [];

afterEach(() => {
  while (tempRoots.length > 0) {
    const path = tempRoots.pop();
    if (path) {
      rmSync(path, { recursive: true, force: true });
    }
  }
});

function makeFixtureRoot(name: string) {
  const root = resolve(join(tmpdir(), `watchme-${name}-${Date.now()}-${Math.random().toString(16).slice(2)}`));
  tempRoots.push(root);

  mkdirSync(join(root, "refactor/apps/server/dist"), { recursive: true });
  mkdirSync(join(root, "refactor/apps/web/out"), { recursive: true });
  mkdirSync(join(root, "refactor/docs"), { recursive: true });

  writeFileSync(join(root, "refactor/apps/server/dist/index.js"), "console.log('server');\n", "utf8");
  writeFileSync(join(root, "refactor/apps/web/out/index.html"), "<html>ok</html>\n", "utf8");
  writeFileSync(join(root, "refactor/docs/deployment.md"), "# deploy\n", "utf8");

  return root;
}

describe("prepareServerRelease", () => {
  it("creates a release directory from build outputs", () => {
    const root = makeFixtureRoot("create");
    const target = join(root, "refactor/.release/server");

    prepareServerRelease(root, target);

    expect(existsSync(join(target, "dist/index.js"))).toBe(true);
    expect(existsSync(join(target, "public/index.html"))).toBe(true);
    expect(existsSync(join(target, ".env.example"))).toBe(true);
    expect(existsSync(join(target, "deployment.md"))).toBe(true);
  });

  it("preserves runtime files when rebuilding an existing release", () => {
    const root = makeFixtureRoot("preserve");
    const target = join(root, "refactor/.release/server");

    mkdirSync(join(target, "data"), { recursive: true });
    mkdirSync(join(target, "logs"), { recursive: true });
    mkdirSync(join(target, "backups"), { recursive: true });
    writeFileSync(join(target, ".env"), "PORT=3999\n", "utf8");
    writeFileSync(join(target, "data/watchme.db"), "db-bytes", "utf8");
    writeFileSync(join(target, "logs/agent.log"), "log line", "utf8");
    writeFileSync(join(target, "backups/backup.db"), "backup-bytes", "utf8");

    prepareServerRelease(root, target);

    expect(readFileSync(join(target, ".env"), "utf8")).toBe("PORT=3999\n");
    expect(readFileSync(join(target, "data/watchme.db"), "utf8")).toBe("db-bytes");
    expect(readFileSync(join(target, "logs/agent.log"), "utf8")).toBe("log line");
    expect(readFileSync(join(target, "backups/backup.db"), "utf8")).toBe("backup-bytes");
    expect(existsSync(join(target, "dist/index.js"))).toBe(true);
  });
});
