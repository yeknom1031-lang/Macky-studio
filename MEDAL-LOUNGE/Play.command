#!/bin/zsh
set -eu
medal_project_dir="${0:A:h}"
medal_app="$medal_project_dir/build/v4/MEDAL LOUNGE.app"
if [[ -d "$medal_app" ]]; then
  open "$medal_app"
  exit 0
fi
for medal_engine in "${GODOT_BIN:-}" /Applications/Godot.app/Contents/MacOS/Godot /private/tmp/godot-4.7.2/Godot.app/Contents/MacOS/Godot; do
  if [[ -n "$medal_engine" && -x "$medal_engine" ]]; then
    exec "$medal_engine" --path "$medal_project_dir"
  fi
done
if command -v godot >/dev/null 2>&1; then
  exec godot --path "$medal_project_dir"
fi
print 'Godot 4.7.2をApplicationsへインストールするか、配布版のMEDAL LOUNGE.appを開いてください。'
read 'medal_reply?Enterで閉じる'
