#!/bin/zsh
cd -- "$(dirname "$0")" || exit 1
MAGMA_NODE="$(command -v node)"
if [[ -z "$MAGMA_NODE" ]]; then
  MAGMA_NODE="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
fi
if [[ ! -x "$MAGMA_NODE" ]]; then
  echo "Node.js が見つかりません。Node.jsをインストールしてから、もう一度実行してください。"
  read -r
  exit 1
fi
exec "$MAGMA_NODE" server.mjs --open
