#!/bin/zsh
set -euo pipefail

LABEL="com.dealradar.server"
TARGET_PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
DOMAIN="gui/$(id -u)"

launchctl bootout "$DOMAIN/$LABEL" 2>/dev/null || true
rm -f "$TARGET_PLIST"

echo "DealRadar background service removed: $DOMAIN/$LABEL"
