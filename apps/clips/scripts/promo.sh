#!/bin/sh
set -eu

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
mkdir -p out

remotion bundle --out-dir "$work/bundle" --log=error
remotion render "$work/bundle" promo-dark "$work/promo-dark.mp4" --codec=h264 --crf=8 --image-format=png --color-space=bt709 --log=error
ffmpeg -v error -y -i "$work/promo-dark.mp4" -an -c:v libx264 -preset veryslow -tune animation -crf 20 \
    -pix_fmt yuv420p -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv \
    -movflags +faststart out/promo-dark.mp4
