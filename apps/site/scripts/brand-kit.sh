#!/bin/sh
set -eu

kit="public/brand-kit"
zip_file="$PWD/$kit/outlayr-brand-kit.zip"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

mkdir -p "$work/logo" "$work/screenshots/en" "$work/screenshots/es" "$work/b-roll"
cp "$kit"/outlayr-mark-* "$kit/outlayr-app-icon.png" "$work/logo/"
for name in log-an-expense 04 05 06 10; do
    cp "public/screens/$name.webp" "public/screens/$name-dark.webp" "$work/screenshots/en/"
    cp "public/screens/es/$name.webp" "public/screens/es/$name-dark.webp" "$work/screenshots/es/"
done
cp "$kit"/broll/*.mp4 "$work/b-roll/"

rm -f "$zip_file"
# Everything inside is already compressed, so storing beats deflating.
(cd "$work" && zip -q -0 -r -X "$zip_file" logo screenshots b-roll)
