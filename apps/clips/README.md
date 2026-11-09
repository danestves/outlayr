# clips

Remotion edits of Outlayr's setup flows, plus the looping steps the app plays in Settings.

| Command | Output |
| --- | --- |
| `vp run studio` | Remotion Studio |
| `vp run render` | `out/bank-shortcut-en.mp4`, `out/bank-shortcut-es.mp4` (1080×1920) |
| `vp run render:promo` | `out/promo-dark.mp4` (1080×1920) for socials, cut from the web films in `src/web` (needs `ffmpeg`). The site itself draws those films live with Stageshow (`apps/web/src/components/home/films`), so nothing here renders into `apps/web` |
| `vp run broll` | `apps/web/public/brand-kit/broll/*.mp4`, the B-roll on tryoutlayr.com/brand: each web film in light and dark (1080×1080) plus `promo-dark` (needs `ffmpeg`). Re-run when a film changes, then `vp run brand-kit` in `apps/web` to rebuild the download-all zip |
| `vp run loops` | `apps/native/assets/images/recipe/bank-*.webp` (needs `ffmpeg` and `img2webp`) |

`public/clips/get-shortcut.mp4`, `turn-on.mp4` and `logged.mp4` were recorded on the iPhone 17 Pro Max simulator with argent. `pick-banks.mp4` is a screen recording from a real phone, because the simulator has no bank apps to pick. Re-record and re-render when the Settings screen or the shared shortcut changes.
