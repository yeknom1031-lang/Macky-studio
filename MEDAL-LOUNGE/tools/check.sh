#!/bin/sh
set -eu
medal_project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
medal_engine=${GODOT_BIN:-godot}
"$medal_engine" --headless --path "$medal_project_dir" --editor --import
"$medal_engine" --headless --fixed-fps 90 --path "$medal_project_dir" -- --test
"$medal_engine" --headless --fixed-fps 90 --path "$medal_project_dir" --script res://tools/bonus-tests.gd
"$medal_engine" --headless --fixed-fps 90 --path "$medal_project_dir" --script res://tools/stack-tests.gd
"$medal_engine" --headless --fixed-fps 90 --path "$medal_project_dir" --script res://tools/playthrough-tests.gd
"$medal_engine" --headless --fixed-fps 90 --path "$medal_project_dir" --script res://tools/party-tests.gd
