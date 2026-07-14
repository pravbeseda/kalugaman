#!/usr/bin/env bash
# Rebuilds the web fonts in src/assets/fonts from an upstream Inter release.
#
# Shipping Inter whole costs 110 KB per weight, most of it scripts this site will never
# write: Greek, Vietnamese, the full Latin Extended. Cut to the Latin and Cyrillic the
# two languages actually use, a weight is ~35 KB.
#
# Run by hand when Inter is upgraded; the .woff2 files are committed. Needs fonttools:
#   python3 -m venv .venv && .venv/bin/pip install fonttools brotli
#
# Usage: scripts/subset-fonts.sh <path to an unpacked Inter release> [pyftsubset]
set -euo pipefail

INTER_DIR="${1:?usage: subset-fonts.sh <inter-release-dir> [pyftsubset]}"
PYFTSUBSET="${2:-pyftsubset}"
OUT="$(dirname "$0")/../src/assets/fonts"

# Latin (with the punctuation and symbols the site uses) plus Cyrillic — the same ranges
# Google Fonts splits Inter along.
RANGES="U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,\
U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD,\
U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116"

for weight in Regular SemiBold Bold; do
  "$PYFTSUBSET" "$INTER_DIR/web/Inter-$weight.woff2" \
    --unicodes="$RANGES" \
    --layout-features='*' \
    --flavor=woff2 \
    --output-file="$OUT/Inter-$weight.woff2"
  echo "Inter-$weight.woff2  $(du -h "$OUT/Inter-$weight.woff2" | cut -f1)"
done
