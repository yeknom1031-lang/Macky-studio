#!/bin/zsh
set -e
game_dir="${0:A:h}"
game_app="$game_dir/build/WHITE ROOM.app"
if [[ ! -d "$game_app" ]]; then
  "$game_dir/build-macos.command"
fi
open "$game_app"
