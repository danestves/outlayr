#!/bin/sh
# video.sh <layers dir> <lang> <out.mp4>: 6 s search results loop, Ori waving while the cards bob.
# Layers come from ori.html?t=search&layer=bg|c1|c2|c3 (see README); ORI_LOOPS points at the Ori library's loops.
L=${ORI_LOOPS:-$HOME/scratch/outlayr-social/studio/assets/ori/loops}/wave
D=$1
nice -n 10 ffmpeg -nostdin -loglevel error -y -threads 4 \
 -loop 1 -framerate 30 -t 6 -i "$D/$2-bg.png" \
 -loop 1 -framerate 30 -t 6 -i "$D/$2-c1.png" \
 -loop 1 -framerate 30 -t 6 -i "$D/$2-c2.png" \
 -loop 1 -framerate 30 -t 6 -i "$D/$2-c3.png" \
 -stream_loop 5 -framerate 30 -i "$L/%04d.png" \
 -filter_complex "[4]scale=2280:2280[o];[0][1]overlay=0:'14*sin(2*PI*t/3)'[a];[a][2]overlay=0:'14*sin(2*PI*t/3+2.1)'[b];[b][3]overlay=0:'14*sin(2*PI*t/3+4.2)'[c];[c][o]overlay=888:284,scale=1920:1280:flags=lanczos,format=yuv420p" \
 -t 6 -r 30 -c:v libx264 -profile:v high -crf 14 -preset slow -movflags +faststart "$3"
