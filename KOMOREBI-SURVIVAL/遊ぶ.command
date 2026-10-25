#!/bin/zsh
GAME_DIR="${0:A:h}"
if command -v python3 >/dev/null 2>&1; then
  python3 "$GAME_DIR/launch.py"
  GAME_RESULT=$?
elif [[ -x "$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3" ]]; then
  "$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3" "$GAME_DIR/launch.py"
  GAME_RESULT=$?
else
  print '起動に必要なPythonが見つかりません。Codexで「ゲームを起動して」と伝えてください。'
  GAME_RESULT=1
fi
if [[ "$GAME_RESULT" != 0 ]]; then
  print 'Enterキーを押すと閉じます。'
  read
fi
exit "$GAME_RESULT"
