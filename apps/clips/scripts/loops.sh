#!/bin/sh
set -eu

clips="public/clips"
out="../native/assets/images/recipe"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

loop() {
    name="$1"
    filter="$2"
    mkdir -p "$work/$name"
    ffmpeg -v error -y $3 -filter_complex "$filter,fps=12,scale=300:-2:flags=lanczos,tpad=stop_mode=clone:stop_duration=0.8" "$work/$name/f%03d.png"
    img2webp -loop 0 -lossy -q 72 -m 6 -d 83 "$work/$name"/f*.png -o "$out/$name.webp" >/dev/null
}

loop bank-add \
    "[0:v]trim=3.2:5.75,setpts=PTS-STARTPTS[a];[0:v]trim=6.3:7.6,setpts=PTS-STARTPTS[b];[a][b]concat=n=2:v=1" \
    "-i $clips/get-shortcut.mp4"
loop bank-pick "[0:v]trim=4.5:10.5,setpts=(PTS-STARTPTS)/1.5" "-i $clips/pick-banks.mp4"
loop bank-on "[0:v]trim=3.6:8.9,setpts=(PTS-STARTPTS)/1.2" "-i $clips/turn-on.mp4"
