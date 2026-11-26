# App Store header and search art

iOS 27 product page header (3840x1646) and search results asset (3840x2560 still, 1920x1280 video). `ori.html` lays out Ori and the copy for every store locale (`lang` = `en`, `es`, `es-ES`, `fr`, `pt-BR`, `pt-PT`, `de`). Render on the Mac: the headline and cards use SF Rounded and SF Mono from `/System/Library/Fonts`, and Geist is only the fallback.

```sh
# Header and search stills, one pair per locale
for l in en es es-ES fr pt-BR pt-PT de; do
  ./render.sh "ori.html?t=header&lang=$l" 3840 1646 header-$l.png
  ./render.sh "ori.html?t=search&lang=$l" 3840 2560 search-$l.png
done
```

The search video needs the scene split into layers (transparent PNGs), then `video.sh` composites Ori's wave loop from the Ori library over them with ffmpeg:

```sh
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
for y in bg c1 c2 c3; do
  "$CHROME" --headless=new --hide-scrollbars --force-device-scale-factor=1 --window-size=3840,2560 \
    --virtual-time-budget=8000 --allow-file-access-from-files --default-background-color=00000000 \
    --screenshot=layers/en-$y.png "file://$PWD/ori.html?t=search&lang=en&layer=$y"
done
./video.sh layers en search-en.mp4
```

The loop is 6 s so the 1 s wave and the 3 s card bob both end where they start. Its first frame matches the still, so it works as the poster frame. Apple's safe areas are small (header 1646x661 centred, search 2168x1030), and on iPhone the back and share buttons cover the header's top corners, so add `&guide=1` to check a layout and keep the headline clear of x < 1000.
