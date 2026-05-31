import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import {
  buildManagerSnapshot,
  createBackup,
  healthCheck,
  saveManagerSnapshot,
  startServer,
  stopServer,
} from "./server-manager-lib.mjs";

function parseArgs(argv) {
  const options = { target: "." };
  let command = "interactive";

  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token) continue;
    if (token === "--target") {
      options.target = argv[index + 1] || ".";
      index += 1;
      continue;
    }
    if (token === "--json") {
      options.json = argv[index + 1] || "{}";
      index += 1;
      continue;
    }
    if (command === "interactive") {
      command = token;
    }
  }

  return { command, options };
}

function printJson(value) {
  console.log(JSON.stringify(value, null, 2));
}

async function runInteractive(targetDir) {
  const rl = readline.createInterface({ input, output });

  try {
    while (true) {
      const snapshot = buildManagerSnapshot(targetDir);
      console.log("\nWatchMe Server Manager");
      console.log(`Release: ${snapshot.targetDir}`);
      console.log(`Status : ${snapshot.running ? `running (pid ${snapshot.pid})` : "stopped"}`);
      console.log(`Base URL: ${snapshot.baseUrl}`);
      console.log("1) Show config");
      console.log("2) Configure server and token");
      console.log("3) Start server");
      console.log("4) Stop server");
      console.log("5) Health check");
      console.log("6) Backup database");
      console.log("7) Exit");

      const choice = (await rl.question("Choose an action: ")).trim();
      if (choice === "1") {
        printJson(snapshot);
        continue;
      }

      if (choice === "2") {
        const next = { ...snapshot.config };
        next.port = (await rl.question(`PORT [${next.port}]: `)).trim() || next.port;
        next.hashSecret = (await rl.question(`HASH_SECRET [${next.hashSecret || "set one"}]: `)).trim() || next.hashSecret;
        next.displayName = (await rl.question(`DISPLAY_NAME [${next.displayName}]: `)).trim() || next.displayName;
        next.siteTitle = (await rl.question(`SITE_TITLE [${next.siteTitle}]: `)).trim() || next.siteTitle;
        next.siteDescription = (await rl.question(`SITE_DESC [${next.siteDescription}]: `)).trim() || next.siteDescription;
        next.agentToken = (await rl.question(`Agent token [${next.agentToken || "set one"}]: `)).trim() || next.agentToken;
        next.deviceId = (await rl.question(`Device ID [${next.deviceId || "my-desktop"}]: `)).trim() || next.deviceId;
        next.deviceName = (await rl.question(`Device name [${next.deviceName || "My Desktop"}]: `)).trim() || next.deviceName;
        saveManagerSnapshot(targetDir, next);
        console.log("Saved .env updates.");
        continue;
      }

      if (choice === "3") {
        printJson(startServer(targetDir));
        continue;
      }

      if (choice === "4") {
        printJson(stopServer(targetDir));
        continue;
      }

      if (choice === "5") {
        printJson(await healthCheck(targetDir));
        continue;
      }

      if (choice === "6") {
        console.log(`Backup created at ${createBackup(targetDir)}`);
        continue;
      }

      if (choice === "7") {
        break;
      }
    }
  } finally {
    rl.close();
  }
}

async function main() {
  const { command, options } = parseArgs(process.argv);
  const targetDir = options.target;

  if (command === "inspect") {
    printJson(buildManagerSnapshot(targetDir));
    return;
  }

  if (command === "save") {
    const payload = JSON.parse(options.json || "{}");
    printJson(saveManagerSnapshot(targetDir, payload));
    return;
  }

  if (command === "start") {
    printJson(startServer(targetDir));
    return;
  }

  if (command === "stop") {
    printJson(stopServer(targetDir));
    return;
  }

  if (command === "status") {
    printJson(buildManagerSnapshot(targetDir));
    return;
  }

  if (command === "health") {
    printJson(await healthCheck(targetDir));
    return;
  }

  if (command === "backup") {
    printJson({ backupPath: createBackup(targetDir) });
    return;
  }

  await runInteractive(targetDir);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
