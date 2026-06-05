#!/usr/bin/env bash
set -euo pipefail
# CRA 4's optimize-css-assets path uses postcss-safe-parser code that imports
# PostCSS 7 internals. On modern npm, postcss-safe-parser@5 can install a
# nested PostCSS 8 copy whose package exports hide those internals. Removing
# the nested copy makes Node resolve to react-scripts' PostCSS 7 dependency.
TARGET="node_modules/postcss-safe-parser/node_modules/postcss"
if [ -d "$TARGET" ]; then
  rm -rf "$TARGET"
fi
