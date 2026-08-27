#!/bin/zsh
set -euo pipefail

LABEL="com.dealradar.server"
TARGET_PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
RUNTIME_PARENT="$HOME/Library/Application Support/DealRadar"
DOMAIN="gui/$(id -u)"

launchctl bootout "$DOMAIN/$LABEL" 2>/dev/null || true
rm -f "$TARGET_PLIST"
rm -rf "$RUNTIME_PARENT"

echo "DealRadar background service removed: $DOMAIN/$LABEL"
