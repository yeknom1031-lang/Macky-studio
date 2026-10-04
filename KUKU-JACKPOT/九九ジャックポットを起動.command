#!/bin/zsh
cd "${0:A:h}"
if /usr/bin/curl --silent --fail http://127.0.0.1:4177/ | /usr/bin/grep -q '九九ジャックポット'; then
  /usr/bin/open http://127.0.0.1:4177/
  exit 0
fi
KUKU_NODE="$(command -v node)"
if [[ -z "$KUKU_NODE" ]]; then
  KUKU_NODE="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
fi
if [[ ! -x "$KUKU_NODE" ]]; then
  print 'Node.jsが見つかりません。Codexで「九九ジャックポットを起動して」と伝えてください。'
  read -k 1
  exit 1
fi
(sleep 1; /usr/bin/open http://127.0.0.1:4177/) &
print '九九ジャックポットを起動します。このウインドウを開いたまま遊んでください。'
"$KUKU_NODE" server.mjs
