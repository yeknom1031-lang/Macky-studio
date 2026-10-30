#!/bin/zsh
# Macky Studio 共通ランチャー。ポート競合を確認して、このゲームを開きます。
launcher_dir="${0:A:h}"
portal_script="$launcher_dir/../GAME-PORTAL/server.py"
launcher_python="$(command -v python3)"
if [[ -z "$launcher_python" ]]; then
  launcher_python="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3"
fi
if [[ ! -x "$launcher_python" || ! -f "$portal_script" ]]; then
  print '起動に必要なPython 3またはGAME-PORTALフォルダが見つかりません。'
  print 'ゲームとGAME-PORTALをMacky-studioフォルダ内に置いてください。'
  [[ -t 0 ]] && read 'launcher_reply?Enterで閉じる'
  exit 1
fi
"$launcher_python" "$portal_script" --game MAGMA-ESCAPE "$@"
launcher_result=$?
if [[ "$launcher_result" != 0 ]]; then
  print 'ゲームを起動できませんでした。上のメッセージをご確認ください。'
  [[ -t 0 ]] && read 'launcher_reply?Enterで閉じる'
fi
exit "$launcher_result"
