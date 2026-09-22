#!/bin/sh
set -eu
medal_project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
medal_engine=${GODOT_BIN:-godot}
mkdir -p "$medal_project_dir/build/v2"
"$medal_engine" --headless --path "$medal_project_dir" --export-release macOS "$medal_project_dir/build/MEDAL-LOUNGE-v2.zip"
unzip -o "$medal_project_dir/build/MEDAL-LOUNGE-v2.zip" -d "$medal_project_dir/build/v2"
