#!/bin/zsh
set -euo pipefail

LABEL="com.dealradar.server"
ROOT="/Users/ohyeseong/Documents/핫딜 소싱기"
SOURCE_PLIST="$ROOT/ops/$LABEL.plist"
TARGET_PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
RUNTIME_PARENT="$HOME/Library/Application Support/DealRadar"
RUNTIME="$RUNTIME_PARENT/runtime"
STAGING="$RUNTIME_PARENT/runtime.staging"
DOMAIN="gui/$(id -u)"

if [[ ! -f "$ROOT/.next/standalone/server.js" ]]; then
  echo "Standalone build not found. Run: npm run build" >&2
  exit 1
fi

mkdir -p "$HOME/Library/LaunchAgents" "$HOME/Library/Logs" "$RUNTIME_PARENT"
rm -rf "$STAGING"
mkdir -p "$STAGING/.next"
cp -R "$ROOT/.next/standalone/." "$STAGING/"
cp -R "$ROOT/.next/static" "$STAGING/.next/static"
cp -R "$ROOT/public" "$STAGING/public"

if [[ -f "$ROOT/.env.local" ]]; then
  cp "$ROOT/.env.local" "$STAGING/.env.local"
  chmod 600 "$STAGING/.env.local"
fi

rm -rf "$RUNTIME.previous"
if [[ -d "$RUNTIME" ]]; then
  mv "$RUNTIME" "$RUNTIME.previous"
fi
mv "$STAGING" "$RUNTIME"
rm -rf "$RUNTIME.previous"

cp "$SOURCE_PLIST" "$TARGET_PLIST"
plutil -lint "$TARGET_PLIST"

launchctl bootout "$DOMAIN/$LABEL" 2>/dev/null || true
sleep 2

for attempt in {1..5}; do
  if launchctl bootstrap "$DOMAIN" "$TARGET_PLIST"; then
    break
  fi

  if [[ "$attempt" -eq 5 ]]; then
    echo "Could not register the DealRadar LaunchAgent." >&2
    exit 1
  fi

  sleep 2
done
launchctl enable "$DOMAIN/$LABEL"
launchctl kickstart -k "$DOMAIN/$LABEL"

for attempt in {1..20}; do
  if curl --fail --silent --max-time 2 http://127.0.0.1:3000/api/health >/dev/null; then
    echo "DealRadar health check passed: http://127.0.0.1:3000/api/health"
    break
  fi

  if [[ "$attempt" -eq 20 ]]; then
    echo "DealRadar failed to become healthy. Check ~/Library/Logs/deal-radar.error.log" >&2
    exit 1
  fi

  sleep 1
done

echo "DealRadar background service installed: $DOMAIN/$LABEL"
