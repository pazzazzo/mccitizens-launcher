#!/usr/bin/env bash
set -euo pipefail

# Compte les lignes de code (.js, .html, .css, .ejs) en ignorant node_modules et .mccitizens
find . \
  -path ./node_modules -prune -o \
  -path ./.mccitizens -prune -o \
  -type f \( -iname '*.js' -o -iname '*.html' -o -iname '*.css' -o -iname '*.ejs' \) -print0 \
| xargs -0 -r -n1 wc -l \
| awk 'BEGIN{tot=0} {tot+=$1} END{printf "Total lignes: %d\n", tot}'
