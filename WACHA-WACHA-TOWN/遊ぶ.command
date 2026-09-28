#!/bin/zsh
cd "${0:A:h}"
open -a "Google Chrome" "$PWD/index.html" || open "$PWD/index.html"
