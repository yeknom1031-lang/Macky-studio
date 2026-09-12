#!/bin/zsh

GAME_DIR="$(cd "$(dirname "$0")" && pwd)"
GAME_URL="http://127.0.0.1:8765/"
LOG_FILE="/tmp/sky-builder-3d-server.log"

cd "$GAME_DIR" || exit 1

if ! /usr/bin/curl --silent --fail "$GAME_URL" >/dev/null 2>&1; then
  /usr/bin/nohup /usr/bin/python3 -m http.server 8765 --bind 127.0.0.1 >"$LOG_FILE" 2>&1 &
  sleep 1
fi

/usr/bin/open "$GAME_URL"
