#!/usr/bin/env bash
set -euo pipefail

SOURCE="${1:-./refactor/.release/server/data/watchme.db}"
TARGET_DIR="${2:-./refactor/.release/server/backups}"

mkdir -p "$TARGET_DIR"
timestamp="$(date +%Y%m%d-%H%M%S)"
target="$TARGET_DIR/watchme-$timestamp.db"
cp "$SOURCE" "$target"
echo "Backup created at $target"
