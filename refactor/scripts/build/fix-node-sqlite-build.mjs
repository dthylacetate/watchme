import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const target = resolve("refactor/apps/server/dist/index.js");
const source = readFileSync(target, "utf8");
const nextSource = source.replace('from "sqlite"', 'from "node:sqlite"');

if (source !== nextSource) {
  writeFileSync(target, nextSource, "utf8");
}
