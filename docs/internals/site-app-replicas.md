# Site app replicas

The marketing site (`apps/site`) draws app screens as DOM, not screenshots. The kit is `apps/site/src/components/app-ui/`, apart from the older `app-ui.tsx`, which keeps its own styles. A replica is a port of an `apps/native` component. It uses the same class names, spacing and copy as the native component, plus any constant measured from the native source or from a simulator capture. When the two disagree, the native source wins; a measurement fills in only what the source leaves to iOS, such as bars, glass and the status bar.

## Where things come from

- **Canvas.** `AppScreen` (402 × 874) and `AppFragment` (any size) in `canvas.tsx` draw 1 CSS px per iOS point and scale as one unit through `--app-scale`, so a replica never reflows. The root is `role="img"` with a localized `label`. Everything inside it is `aria-hidden` and `inert`. Replicas are static markup: no effects, no measuring, nothing to hydrate.
- **Tokens.** `app-tokens.mjs` reads the theme from `apps/native/global.css` into Tailwind, scoped to `[data-app-replica]`. `theme="light" | "dark"` sets `data-app-theme`, independent of the site. Values iOS draws itself, such as glass, tab bar, badge and sheet backdrop, are variables in `app-theme.css`.
- **Fonts.** On Apple devices `ui-rounded` and `SF Pro` are the real faces. Elsewhere, Nunito (`App Rounded`) and Geist (`App Sans`) stand in. They are self-hosted from `@fontsource-variable`, with `size-adjust` and ascent overrides so their metrics match SF per weight. Geist Mono takes the native font's own line metrics.
- **Icons.** Hugeicons, imported by path. Category tiles use `@hugeicons-pro/core-solid-rounded`, as native does. Native stroke-rounded pro icons map to the free set's icons of the same name. Tab bar and toolbar symbols are the native SVGs in `apps/native/assets`, drawn as CSS masks.
- **Strings.** The `native` block of `apps/site/src/content/app-ui.content.ts` copies native keys and their translations; `useReplica().t(key)` reads it. `strings.test.ts` fails when one of them drifts from `apps/native/src/content`.
- **Data.** `ledger.ts` is the screenshot seed (`apps/screenshots/scripts/seed-sim-ledger.mjs`, region `us`), typed, with `DEMO_NOW` on 12 Sep 2026. Figures come from `@outlayr/money` and the native domain functions themselves. `ledger.test.ts` checks the money math.

## Text on the iOS grid

React Native on iOS rounds every text box up to a device pixel (a third of a point) and centers the line inside it. Chrome rounds ascent, descent and paint offsets to whole CSS pixels. At 1 px per point, that puts baselines up to 1 pt off. So `[data-app-replica]` renders at `zoom: 3` and scales back by a third. All of Chrome's rounding then lands on a third of a point, as on a device. The rule for `div > span` in `app-theme.css` then moves each span onto the iOS baseline, `(line height + ascent - descent) / 2`, using the SF metrics from `type.ts`. Text that must sit on a measured baseline belongs in a `span` directly inside a `div`. A decorative element should be a `div`.

## Adding a screen or a fragment

1. Port the native component into `<screen>.tsx` with the same structure. Reuse `chrome.tsx` (nav header, tab bar, FAB, glass), `parts.tsx` (sheet, settings section and rows, scope chip, button, home indicator), `list.tsx`, `tile.tsx` and `amount.tsx`.
2. Copy each native key it shows into the `native` block. The drift test confirms the copy matches.
3. Export `<Name>Screen` with a localized label, as in `log.tsx`. For a part of a screen, wrap it in `AppFragment` with its own width, height and label.
4. Register it in `SCREENS` in `apps/site/replicas.config.ts` to open it alone.

## Opening a replica alone

In `apps/site`, run `vp dev --config replicas.config.ts`. The index at `http://localhost:4320/` links every screen, theme and locale; for example, `?screen=log&theme=dark&locale=de` (add `scale` or `scrollY` if needed). The viewer has its own config, so `vp build` never includes it.

## Fidelity check

The tool and the simulator references live on talos, outside the repo: `~/scratch/outlayr-site-proposals/source/tools/fidelity/` and `refs/iphone/<id>-<theme>.png` (1206 × 2622). With the viewer running, `node fidelity.mjs log dark en` renders the replica in Chrome at 3x (`CHROME_PATH`, default `~/.agent-browser/chromium/chrome`). It writes `out/<id>-<theme>-side.png` and `-diff.png`, prints the share of mismatched pixels, and gives the worst offset in points for each band of text, tiles, dividers and bars. The target is every band within 1 pt. A new screen needs its bands in `fidelity.mjs`.

Known gaps:

- Yoga rounds a node against its parent, so a 1 pt hairline can paint 0.67 pt and shift the rows below by a third of a point.
- Glass is a flat fill with a rim.
- Merchants without a file in `public/media/logos` get the no-logo tile.
- Safari on macOS uses macOS metrics for `ui-rounded`, which the rise rule does not model.

## When a native screen changes

Update its port in the same change, or soon after. The drift test catches copy, but nothing catches layout, color or a new element. Then take a fresh simulator capture into `refs/iphone`, run the fidelity check in both themes, and fix any band over 1 pt.
