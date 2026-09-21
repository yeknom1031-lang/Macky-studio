#!/bin/bash
cd "$(dirname "$0")" || exit 1
game_node="$(command -v node)"
if [ -z "$game_node" ]; then
  game_node="/Users/makibook/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
fi
if [ ! -x "$game_node" ]; then
  echo "Node.js が見つかりません。Node.js 20 以降をインストールしてください。"
  read -r -p "Enter で閉じる" game_reply
  exit 1
fi
"$game_node" server.mjs --open
