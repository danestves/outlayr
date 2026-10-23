# clips

Remotion edits of Outlayr's setup flows, plus the looping steps the app plays in Settings.

| Command | Output |
| --- | --- |
| `vp run studio` | Remotion Studio |
| `vp run render` | `out/bank-shortcut-en.mp4`, `out/bank-shortcut-es.mp4` (1080×1920) |
| `vp run render:web` | `apps/web/src/assets/videos/{chaos,capture,sorted,month}-{light,dark}.mp4` (1080², 60fps loops) and their Spanish cuts `{chaos,capture,sorted,month}-{light,dark}-es.mp4`, each with an AV1 copy (`.av1.mp4`, played first where the browser decodes AV1) and a `.webp` poster, plus `out/promo-dark.mp4` (1080×1920) for socials (needs `ffmpeg` with `libsvtav1`, and `magick`) |
| `vp run loops` | `apps/native/assets/images/recipe/bank-*.webp` (needs `ffmpeg` and `img2webp`) |

`public/clips/get-shortcut.mp4`, `turn-on.mp4` and `logged.mp4` were recorded on the iPhone 17 Pro Max simulator with argent. `pick-banks.mp4` is a screen recording from a real phone, because the simulator has no bank apps to pick. Re-record and re-render when the Settings screen or the shared shortcut changes.
