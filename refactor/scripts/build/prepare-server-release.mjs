import { prepareServerRelease } from "./prepare-server-release-lib.mjs";

const targetDir = prepareServerRelease(".", process.argv[2] || "refactor/.release/server");
console.log(`Prepared server release at ${targetDir}`);
