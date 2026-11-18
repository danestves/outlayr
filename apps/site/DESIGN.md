# tryoutlayr.com design system

The site follows the elaya `landing-page-design` and `redesign-existing-projects` skills
(github.com/elayadesign/ai-design-skills, github.com/elayadesign/redesign-skill). Every value
below comes from them or from the app's own palette. Do not invent new ones.

## Type

- One family: Geist (`font-sans`). Geist Mono (`font-mono`) only for figures, labels and data.
- Tailwind's default scale only (`text-xs` … `text-9xl`). No arbitrary sizes. The home page is the
  exception: `horizon.css` sizes it from a 1440×900 frame through `--u`.
- Weights 400, 500, 600, 700. Never 800 or 900. No italics anywhere.
- Page heroes: solid `text-foreground`, `max-w-[680px]`, `tracking-tighter`, meaningful line breaks.
- Section headings: `text-4xl md:text-5xl font-semibold tracking-tight`.
- Body: `text-base`/`text-lg`, `text-muted` for secondary copy, measure under 65ch.
- Mono labels: `font-mono text-xs text-muted`, sentence case. Uppercase stays only inside components that render the app.
- Copy: sentence case, no hyphens inside sentences, no exclamation marks, no AI clichés.
- Headings, labels and buttons end without a period. Multi-sentence paragraphs keep theirs. Home page
  section headings are sentences and keep their period.
- Home headings are two-tone: `.hz-lead-in` sets the first words in `--hz-lead` (foreground mixed
  56% into the ground), the rest stays foreground.

## Color

Tokens live in `packages/shared/src/tokens.css` and switch on `html[data-theme="dark"]`.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `background` | `#ffffff` | `#131209` | page |
| `foreground` | `#0c0a09` | `#fafaf9` | text |
| `muted` | `#57534e` | `#a8a29e` | secondary text |
| `surface` | `#f5f5f4` | `#1c1b13` | cards, bands |
| `raised` | `#ffffff` | `#26251b` | chips inside a surface |
| `border` | `#e7e5e4` | `#2e2d24` | hairlines |
| `tint` | `#c2371b` | `#e2643f` | the one accent |
| `income` / `spend` | `#00714a` / `#c0402e` | `#3fd99b` / `#e06a57` | money only |

`app-*` tokens reproduce the iPhone app's own UI (`app-bg`, `app-group`, `app-ink`, `app-muted`,
`app-rule`, `app-fill`, `app-track`, `app-tint`, `app-income`, `app-spend`, `app-chip`). Use them
only inside components that render the app.

Backgrounds are flat, with no gradients and no texture layer. Gradients are allowed in three places
only: the home sky, sun and horizon glow (`--sky-*`, `--paint-*`, `--glow-*` in `horizon.css`), the
sunrise behind the home footer, and the wash at the top of the Get the app dialog.

### Home page skies

The home page is one day whatever the visitor's theme: day, sunset, night, then sunrise. Each band
sets `data-sky="day" | "night" | "sunrise"`, which remaps the `--color-*` tokens inside it, plus
`--hz-lead`, `--hz-glass`, `--hz-pill` and the shadows. Never force `html[data-theme]` for it. Fixed
chrome over the page (nav, install bar) reads the ground under it from `[data-night-ground]` with
`watchGround` and sets `data-ground`, never `data-sky`.

Its palette lives on `.hz-page`: `--hz-sun-*`, `--hz-dawn*`, `--hz-ember*`, `--hz-night`, `--hz-paper`,
and `--hz-hold-*`, the dark surfaces app replicas sit on at night. The scene tunables sit together
there too: `--pin-len` (sunset pin length, in viewports), `--sun-*`, `--afterglow`, `--night-nav`,
`--close-*`, `--rise-*` and `--scene-ms`.

## Space and shape

- Spacing steps only: 0, 2, 4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96px
  (`0.5 1 2 3 4 6 8 10 12 16 20 24`).
- Container: `CONTAINER` from `src/lib/layout.ts` (`max-w-7xl px-6 md:px-12`).
- Sections: `py-24`. Inner pages start with `pt-24` + `mt-16` to clear the floating nav.
- Radius: Tailwind values. A shape inside another with a gap under 32px uses
  `inner = outer − gap` when that is above 2px (`rounded-3xl p-2` → `rounded-2xl`).
- Cards are `bg-surface rounded-3xl` with no border and no shadow. Elevation is only for
  floating glass (`glass` utility). A card that is a link steps to `bg-border/50` on hover.
- Glass: blur (`glass` utility) only on the floating nav. Cards on the home night sky are
  translucent fills instead (`--hz-glass`, a `--hz-glass-rim` hairline and a `--hz-gleam` top
  edge), never blurred.

## Motion

- Easing: `ease-fluid` = `cubic-bezier(0.32, 0.72, 0, 1)`. The `fluid` utility runs it for
  700ms on color, opacity and transforms. Never `ease`, `linear`, or bouncy curves.
- Reveals: add `data-reveal` to any element. It fades up 4rem (and un-blurs from 12px on
  `md+`) over 1000ms when it scrolls in. Stagger with `delay-100`, `delay-150`, `delay-200` …
  The first block of each page (`main > :first-child`) and anything marked `data-reveal="now"`
  fade in from CSS at first paint instead, over 500ms, so the first screen never waits for
  hydration and its largest text lands sooner.
- Tagline words: wrap each word in `<span data-word>`; it lights from 30% to 100% as it crosses
  a line 60% down the viewport.
- One global `IntersectionObserver` (`src/lib/motion.ts`) drives all of it. Never listen to
  `scroll`. Animate only `opacity` and `transform`; blur is desktop only so phones hold 60fps.
- Everything collapses to static under `prefers-reduced-motion`.
- Home reveals: `data-reveal="group"` on a block and `.hz-r` on the children that move, with `--i`
  as the stagger step.
- Home scenes (hero sunrise, pinned sunset, closing sunrise) are CSS scroll-driven animations.
  Without `animation-timeline`, `playScene` sets `data-scene="on"` once and the keyframes run over
  `--scene-ms`. Pointer parallax (`sway`) only on fine pointers. Nothing animates continuously.

## Components

- Dashboard (`apps/app`) and `/r` report controls: `panelui-web`, imported by subpath (`panelui-web/button`) and styled with `className`.
  Its tokens are set on `.app-shell`, which any portaled popup also needs in its `className`. The site
  header's dialog and menu sheet use the site tokens instead, styled in `index.css` (`.get-app`, `.site-menu`).
- Dashboard and `/r` report chrome: `text-xs`, `text-sm` and `text-base` at weights 400 and 500, mono only on figures. Row tiles are `sm`.
  Category color belongs to charts and meters; a table row gets a small dot. Disabled actions stay `outline`, the accent
  never fills one. A change states what it compares to, on the line under its figure.
- Nav: the floating glass island (`site-header.tsx`) with Get the app on every page, and a top
  sheet menu on phones. On the home page it switches between a day and a night skin.
- Get the app (`GetAppButton`): on iPhone and Android it links to `/download`, which picks the store;
  everywhere else it opens a dialog with a QR code drawn in code (`DownloadQr`, encodes `/download`)
  and the store badges. `/download` from any other device lands on the home page's `#get-app` with
  its query kept. It never names a store.
- Store CTAs: `StoreBadges`, the official Google Play and App Store badges, wherever a store is
  named. Never a custom button that names a store.
- Icons: Hugeicons free set, imported by path from `@hugeicons/core-free-icons`, through `Icon` in
  `src/components/icon.tsx` or `HugeiconsIcon`. No other icon set.
- Category tiles (home): a Hugeicons glyph on a flat wash of the category's preset color
  (`categoryTile`), one soft shadow, no ring. Never another brand's logo.
- App replicas on the home page: one file per slot in `src/components/home/slots/`. The section
  owns the box (size, position, rotation, depth, reveal); the slot owns only its body.
- Footer: logo, tagline and the directory listings as plain text links, three short link columns,
  language links, theme and cookie selects, and the owners line. No third-party badge images. On
  the home page it sits on the sunrise (`data-sky="sunrise"`).
