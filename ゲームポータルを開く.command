#!/bin/zsh
portal_dir="${0:A:h}/GAME-PORTAL"
portal_python="$(command -v python3)"
if [[ -z "$portal_python" ]]; then
  portal_python="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3"
fi
if [[ ! -x "$portal_python" ]]; then
  print 'Python 3が見つかりません。Codexで「ゲームポータルを起動して」と伝えてください。'
  read 'portal_reply?Enterで閉じる'
  exit 1
fi
"$portal_python" "$portal_dir/server.py"
if [[ $? != 0 ]]; then
  print 'ポータルを起動できませんでした。'
  read 'portal_reply?Enterで閉じる'
fi
