#!/bin/sh
set -eu
medal_project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
medal_engine=${GODOT_BIN:-godot}
"$medal_engine" --headless --path "$medal_project_dir" --editor --import
"$medal_engine" --headless --path "$medal_project_dir" --script res://tools/audio-tests.gd -- --audio-test
