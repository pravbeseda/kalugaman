#!/usr/bin/env bash
# Rebuilds every font file in src/assets/fonts from upstream releases.
#
# Two sets come out of the same sources, so an upgrade cannot leave them on different
# versions of the typeface:
#   *.woff2 — the site (Astro's fonts API)
#   *.ttf   — the OG card (resvg reads ttf/otf, not woff2)
#
# Both are cut to the Latin and Cyrillic the two languages actually use. Whole, Inter is
# 110 KB a weight as woff2 and 420 KB as ttf, most of it scripts this site will never
# write; subset, a weight is ~35 KB and ~60 KB.
#
# Run by hand on an upgrade; the results are committed. Needs fonttools:
#   python3 -m venv .venv && .venv/bin/pip install fonttools brotli
#
# Usage: scripts/subset-fonts.sh <inter-release-dir> <jetbrains-mono-release-dir> [pyftsubset]
set -euo pipefail

INTER="${1:?usage: subset-fonts.sh <inter-dir> <jetbrains-mono-dir> [pyftsubset]}"
MONO="${2:?usage: subset-fonts.sh <inter-dir> <jetbrains-mono-dir> [pyftsubset]}"
PYFTSUBSET="${3:-pyftsubset}"
OUT="$(cd "$(dirname "$0")/../src/assets/fonts" && pwd)"

# Latin (with the punctuation and symbols the site uses) plus Cyrillic — the ranges
# Google Fonts splits these families along.
RANGES="U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,\
U+0329,U+2000-206F,U+20AC,U+2122,U+2190,U+2191,U+2193,U+2212,U+2215,U+2600,U+263E,\
U+FE0E,U+FEFF,U+FFFD,U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116"

subset() {
  local source="$1" target="$2" flavor="${3:-}"
  local args=(--unicodes="$RANGES" --layout-features='*' --output-file="$OUT/$target")
  [ -n "$flavor" ] && args+=(--flavor="$flavor")

  "$PYFTSUBSET" "$source" "${args[@]}"
  printf '  %-28s %s\n' "$target" "$(du -h "$OUT/$target" | cut -f1)"
}

echo 'site (woff2):'
for weight in Regular SemiBold Bold; do
  subset "$INTER/web/Inter-$weight.woff2" "Inter-$weight.woff2" woff2
done

echo 'OG card (ttf):'
for weight in SemiBold Bold; do
  subset "$INTER/extras/ttf/Inter-$weight.ttf" "Inter-$weight.ttf"
done
subset "$MONO/fonts/ttf/JetBrainsMono-Regular.ttf" "JetBrainsMono-Regular.ttf"
