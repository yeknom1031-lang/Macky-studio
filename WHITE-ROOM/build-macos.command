#!/bin/zsh
set -euo pipefail
game_dir="${0:A:h}"
cd "$game_dir"
engine_path="${GODOT_BIN:-}"
if [[ -z "$engine_path" ]]; then
  for candidate in /Applications/Godot.app/Contents/MacOS/Godot /tmp/godot-abyss/Godot.app/Contents/MacOS/Godot; do
    if [[ -x "$candidate" ]]; then
      engine_path="$candidate"
      break
    fi
  done
fi
if [[ -z "$engine_path" ]]; then
  engine_path="$(command -v godot || true)"
fi
if [[ -z "$engine_path" || ! -x "$engine_path" ]]; then
  print 'Godot 4.7.2 と macOS 書き出しテンプレートが必要です。GODOT_BIN に Godot の実行ファイルを指定できます。'
  exit 1
fi
mkdir -p build
touch build/.gdignore
"$engine_path" --headless --path "$game_dir" --editor --import
if [[ "${1:-}" == '--test' ]]; then
  "$engine_path" --headless --path "$game_dir" -- --self-test
  exit $?
fi
"$engine_path" --headless --path "$game_dir" --export-release macOS "$game_dir/build/WHITE-ROOM-macOS.zip"
/usr/bin/ditto -x -k "$game_dir/build/WHITE-ROOM-macOS.zip" "$game_dir/build"
print "完成：$game_dir/build/WHITE ROOM.app"
