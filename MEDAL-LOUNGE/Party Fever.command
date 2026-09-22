#!/bin/zsh
set -eu
medal_party_dir="${0:A:h}"
medal_party_app="$medal_party_dir/build/v6/MEDAL LOUNGE.app"
if [[ -d "$medal_party_app" ]]; then
  open "$medal_party_app" --args --party
  exit 0
fi
for medal_party_engine in "${GODOT_BIN:-}" /Applications/Godot.app/Contents/MacOS/Godot /private/tmp/godot-4.7.2/Godot.app/Contents/MacOS/Godot; do
  if [[ -n "$medal_party_engine" && -x "$medal_party_engine" ]]; then
    exec "$medal_party_engine" --path "$medal_party_dir" -- --party
  fi
done
print 'Godot 4.7.2か、build/v6のアプリから起動してください。'
read 'medal_party_reply?Enterで閉じる'
