#!/bin/zsh
# Open the self-contained file directly. No server, port, or network is needed.
GAME_DIRECTORY="${0:A:h}"
open -a "Google Chrome" "$GAME_DIRECTORY/index.html" || open "$GAME_DIRECTORY/index.html"
