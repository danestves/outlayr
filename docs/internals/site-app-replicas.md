# Site app replicas

The marketing site (`apps/site`) draws app screens as DOM, not screenshots. The kit is `apps/site/src/components/app-ui/`. A replica is a port of an `apps/native` component. It uses the same class names, spacing and copy as the native component, plus any constant measured from the native source or from a simulator capture. When the two disagree, the native source wins; a measurement fills in only what the source leaves to iOS, such as bars, glass and the status bar.

## Where things come from

- **Canvas.** `AppScreen` (402 × 874) and `AppFragment` (any size) in `canvas.tsx` draw 1 CSS px per iOS point and scale as one unit through `--app-scale`, so a replica never reflows. With `fit`, a replica fills the width of its container and keeps its ratio. The root is `role="img"` with a localized `label`. Everything inside it is `aria-hidden` and `inert`. Replicas are static markup: no effects, no measuring, nothing to hydrate. No `useId` either: a page keeps a replica's server markup without rendering it, so the renderer's id counter would shift for everything after it and the whole page would fail to hydrate. Derive an SVG id from what it draws instead, as `chart-burndown.tsx` does.
- **Tokens.** `app-tokens.mjs` reads the theme from `apps/native/global.css` into Tailwind, scoped to `[data-app-replica]`. `theme="light" | "dark"` sets `data-app-theme`, independent of the site. Values iOS draws itself, such as glass, tab bar, badge and sheet backdrop, are variables in `app-theme.css`.
- **Fonts.** On Apple devices `ui-rounded` and `SF Pro` are the real faces. Elsewhere, Nunito (`App Rounded`) and Geist (`App Sans`) stand in. They are self-hosted from `@fontsource-variable`, with `size-adjust` and ascent overrides so their metrics match SF per weight. Geist Mono takes the native font's own line metrics.
- **Icons.** Hugeicons, imported by path. Category tiles use `@hugeicons-pro/core-solid-rounded`, as native does. Native stroke-rounded pro icons map to the free set's icons of the same name. Tab bar and toolbar symbols are the native SVGs in `apps/native/assets`, drawn as CSS masks.
- **Logos.** `public/media/logos/<domain>.webp` is the tile the app would store for that merchant or account: the image from the logo Worker, plated by the app's own `logoPlate`. `logos.json` holds each tile's glow color, which the app saves as `imageColor`. `node apps/screenshots/scripts/bake-site-logos.mjs [domain ...]` rebuilds every tile and adds the domains given. A merchant outside `MERCHANT_LOGOS` in `ledger.ts` draws its category tile, as in the app. The simulator references show larger marks on white, because the screenshot seed flattens a logo instead of plating it.
- **Ori.** `app-ui/ori/voice-{light,dark}.webp` are the native sprite sheets (`apps/native/assets/images/ori`) with every cell the site never shows left transparent, which halves their weight. The grid and cell size are unchanged. A replica that shows a new cell draws nothing until that cell is copied in from the native sheet.
- **Strings.** The `native` block of `apps/site/src/content/app-ui.content.ts` copies native keys and their translations; `useReplica().t(key)` reads it. Each family of screens keeps its keys in `apps/site/src/content/app-ui/<family>.ts`, spread into that block. The label a replica announces is site copy, not native copy: it sits in the same module as `<family>Labels` and lands in the `labels` block. `strings.test.ts` fails when one of them drifts from `apps/native/src/content`.
- **Data.** `ledger.ts` is the screenshot seed (`apps/screenshots/scripts/seed-sim-ledger.mjs`, region `us`), typed, with `DEMO_NOW` on 12 Sep 2026. Figures come from `@outlayr/money` and the native domain functions themselves. `ledger.test.ts` checks the money math.

## Text on the iOS grid

React Native on iOS rounds every text box up to a device pixel (a third of a point) and centers the line inside it. Chrome rounds ascent, descent and paint offsets to whole CSS pixels. At 1 px per point, that puts baselines up to 1 pt off. So `[data-app-replica]` renders at `zoom: 3` and scales back by a third. All of Chrome's rounding then lands on a third of a point, as on a device. The rule for `div > span` in `app-theme.css` then moves each span onto the iOS baseline, `(line height + ascent - descent) / 2`, using the SF metrics from `type.ts`. Text that must sit on a measured baseline belongs in a `span` directly inside a `div`. A decorative element should be a `div`.

## Motion inside a replica

Safari rasterizes a composited layer at its own layout size times the device pixel ratio and ignores any scale on its ancestors (WebKit enables root-relative scale only for layer-based SVG). Inside the zoom 3 canvas, one full-screen layer on a 3x iPhone is 3618 × 7866 px, about 110 MB. Any opacity, transform or filter animation or transition, or `will-change`, makes such a layer. The capture films stacked enough of them to crash the tab. So motion inside a replica animates a registered custom property (`--cue`, `--sweep` in `capture.css`), which never composites, and the property it drives reads that variable.

## Adding a screen or a fragment

1. Port the native component into `<screen>.tsx` with the same structure. Reuse `chrome.tsx` (nav header, tab bar, FAB, glass), `parts.tsx` (sheet, settings section and rows, scope chip, button, home indicator), `list.tsx`, `tile.tsx` and `amount.tsx`.
2. Copy each native key it shows into the `native` block. The drift test confirms the copy matches.
3. Export `<Name>Screen` with a localized label, as in `log.tsx`. For a part of a screen, wrap it in `AppFragment` with its own width, height and label. Either way, take `CanvasProps` and pass them on, so every replica accepts `fit`, `scale` and `className`.
4. To open it alone, export it from a `<family>.viewer.tsx` beside it, in a `screens` map as `log.viewer.tsx` does. The key is its name in the viewer url, and a state of a screen gets its own key. The site never imports these files.
5. To show it on the home page, export it from `apps/site/src/components/home/replicas.ts` and render it through `Replica`. See "On a page".

## On a page

A replica is static, so a page sends its HTML and none of its code. `apps/site/src/components/home/replica.tsx` does this for the home page.

- `replicas.ts` exports the replicas the page shows. Nothing imports it but one dynamic `import()`, so they build into a chunk of their own.
- The home route awaits `loadReplicas()` in `beforeLoad`. On the server that always loads the chunk, and every replica renders into the HTML.
- In the browser, `Replica` renders an empty `dangerouslySetInnerHTML` with `suppressHydrationWarning` until the chunk is loaded. On hydration, that keeps the server's markup as it is, so the chunk is never fetched.
- `loadReplicas()` does nothing while kept replicas are on screen. A link to a section of the same page then costs nothing. A visitor who arrives from another page gets the chunk first, on hover, and the replicas render in the browser.
- A `Replica` that mounts with no server markup to keep loads the chunk itself. That covers a remount after an error, a fast refresh, or a change of locale without a document load.

A slot renders `<Replica>{({ LogScreen }, locale) => <LogScreen locale={locale} theme={theme} />}</Replica>`. Kept markup never renders again, so whatever else a slot passes must stay the same while the page is mounted. `replica.tsx` imports `app-theme.css`, because the stylesheet must load even when the chunk does not.

The dev server works the same way, so an edit to a replica shows on the home page only after a reload. Use the viewer while porting.

## Opening a replica alone

In `apps/site`, run `vp dev --config replicas.config.ts`. The index at `http://localhost:4320/` links every screen, theme and locale; for example, `?screen=log&theme=dark&locale=de` (add `scale`, `scrollY`, or `fit` with a container width in px, if needed). The viewer has its own config, so `vp build` never includes it.

## Fidelity check

The tool and the simulator references live on talos, outside the repo: `~/scratch/outlayr-site-proposals/source/tools/fidelity/` and `refs/iphone/<id>-<theme>.png` (1206 × 2622). With the viewer running, `node fidelity.mjs log dark en` renders the replica in Chrome at 3x (`CHROME_PATH`, default `~/.agent-browser/chromium/chrome`). It writes `out/<id>-<theme>-side.png` and `-diff.png`, prints the share of mismatched pixels, and gives the worst offset in points for each band of text, tiles, dividers and bars. The target is every band within 1 pt. A new screen needs its bands in `bands/<screen>.mjs`.

Known gaps:

- Yoga rounds a node against its parent, so a 1 pt hairline can paint 0.67 pt and shift the rows below by a third of a point.
- Glass is a flat fill with a rim.
- Safari on macOS uses macOS metrics for `ui-rounded`, which the rise rule does not model.

## When a native screen changes

Update its port in the same change, or soon after. The drift test catches copy, but nothing catches layout, color or a new element. Then take a fresh simulator capture into `refs/iphone`, run the fidelity check in both themes, and fix any band over 1 pt.
