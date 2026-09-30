#!/bin/zsh
cd -- "$(dirname -- "$0")" || exit 1
game_url="http://127.0.0.1:4178/"
game_plist="$HOME/Library/LaunchAgents/local.yurumon-march.plist"
if ! /usr/bin/curl --silent --fail --max-time 2 "$game_url" >/dev/null; then
  if [[ -f "$game_plist" ]]; then
    /bin/launchctl bootstrap "gui/$(/usr/bin/id -u)" "$game_plist" 2>/dev/null
    /bin/launchctl kickstart "gui/$(/usr/bin/id -u)/local.yurumon-march" 2>/dev/null
  else
    game_node="/Users/makibook/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
    if [[ -x "$game_node" ]]; then
      /usr/bin/nohup "$game_node" "$PWD/server.mjs" >/tmp/yurumon-march-server.log 2>&1 </dev/null &!
    fi
  fi
  for game_attempt in {1..30}; do
    if /usr/bin/curl --silent --fail --max-time 1 "$game_url" >/dev/null; then
      break
    fi
    /bin/sleep 0.2
  done
fi
if /usr/bin/curl --silent --fail --max-time 2 "$game_url" >/dev/null; then
  /usr/bin/open "$game_url"
else
  print 'ゲームの起動に失敗しました。ログ: /tmp/yurumon-march-server.log'
  read 'game_reply?Enter キーで閉じます。'
  exit 1
fi
