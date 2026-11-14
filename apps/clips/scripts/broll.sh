#!/bin/sh
set -eu

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
out="../site/public/brand-kit/broll"
mkdir -p "$out"

remotion bundle --out-dir "$work/bundle" --log=error

for id in chaos-light chaos-dark capture-light capture-dark sorted-light sorted-dark month-light month-dark promo-dark; do
    remotion render "$work/bundle" "$id" "$work/$id.mp4" --codec=h264 --crf=8 --image-format=png --color-space=bt709 --log=error
    ffmpeg -v error -y -i "$work/$id.mp4" -an -c:v libx264 -preset veryslow -tune animation -crf 22 \
        -pix_fmt yuv420p -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv \
        -movflags +faststart "$out/$id.mp4"
done
