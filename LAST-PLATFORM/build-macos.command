#!/bin/zsh
set -euo pipefail
game_dir="${0:A:h}"
engine="${GODOT_BIN:-$HOME/Desktop/マッキー最強/Godot.app/Contents/MacOS/Godot}"
if [[ ! -x "$engine" ]]; then
  print 'GODOT_BINにGodotの実行ファイルを指定してください。'
  exit 1
fi
mkdir -p "$game_dir/build"
touch "$game_dir/build/.gdignore"
template="${GODOT_MACOS_TEMPLATE:-$HOME/Library/Application Support/Godot/export_templates/4.7.2.stable/macos.zip}"
if [[ ! -f "$template" ]]; then
  print 'GODOT_MACOS_TEMPLATEにmacOS書き出しテンプレートのZIPを指定してください。'
  exit 1
fi
cp "$template" "$game_dir/build/macos-template.zip"
"$engine" --headless --path "$game_dir" --editor --import --quit
"$engine" --headless --path "$game_dir" -- --self-test
"$engine" --headless --path "$game_dir" --export-release macOS "$game_dir/build/After-the-Last-Train.zip"
/usr/bin/ditto -x -k "$game_dir/build/After-the-Last-Train.zip" "$game_dir/build"
print "完成：$game_dir/build/終電のあと.app"
