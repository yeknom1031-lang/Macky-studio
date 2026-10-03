#!/bin/zsh
set -euo pipefail
game_dir="${0:A:h}"
if [[ -d "$game_dir/build/終電のあと.app" ]]; then
  open "$game_dir/build/終電のあと.app"
  exit 0
fi
for engine in "${GODOT_BIN:-}" /Applications/Godot.app/Contents/MacOS/Godot "$HOME/Desktop/マッキー最強/Godot.app/Contents/MacOS/Godot"; do
  if [[ -n "$engine" && -x "$engine" ]]; then
    exec "$engine" --path "$game_dir"
  fi
done
print 'Godot 4.7以降で、このフォルダの project.godot を開いてください。'
read '?Enterで閉じる'
