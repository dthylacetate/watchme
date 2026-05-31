# WatchMe Script Layout

`refactor/scripts/` 现在按职责拆成两组：

## `build/`

构建和发布目录准备脚本：

- `fix-node-sqlite-build.mjs`
- `prepare-server-release.mjs`
- `prepare-server-release-lib.mjs`

## `server/`

服务端部署、检查、备份和管理脚本：

- `deploy-server.ps1` / `deploy-server.sh`
- `backup-data.ps1` / `backup-data.sh`
- `check-release-health.mjs` / `.ps1` / `.sh`
- `run-release-healthcheck.mjs`
- `soak-server.mjs`
- `manage-server.mjs`
- `manage-server-ui.ps1` / `.cmd`
- `server-manager-lib.mjs`

这样整理的目的很简单：构建类脚本和长期运维类脚本分开，找起来不会再挤成一团。
