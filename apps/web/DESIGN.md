# tryoutlayr.com design system

The site follows the elaya `landing-page-design` and `redesign-existing-projects` skills
(github.com/elayadesign/ai-design-skills, github.com/elayadesign/redesign-skill). Every value
below comes from them or from the app's own palette. Do not invent new ones.

## Type

- One family: Geist (`font-sans`). Geist Mono (`font-mono`) only for figures, labels and data.
- Tailwind's default scale only (`text-xs` … `text-9xl`). No arbitrary sizes.
- Weights 400, 500, 600, 700. Never 800 or 900. No italics anywhere.
- Page heroes: `hero-text` gradient, `max-w-[680px]`, `tracking-tighter`, meaningful line breaks.
- Section headings: `text-4xl md:text-5xl font-semibold tracking-tight`.
- Body: `text-base`/`text-lg`, `text-muted` for secondary copy, measure under 65ch.
- Mono labels: `font-mono text-xs uppercase tracking-widest text-muted`.
- Copy: sentence case, no hyphens inside sentences, no exclamation marks, no AI clichés.

## Color

Tokens live in `src/index.css` and switch on `html[data-theme="dark"]`.

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

Backgrounds are flat. The only gradient is the hero heading text. A fixed grain layer sits over
everything (`body::before`).

## Space and shape

- Spacing steps only: 0, 2, 4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96px
  (`0.5 1 2 3 4 6 8 10 12 16 20 24`).
- Container: `CONTAINER` from `src/lib/layout.ts` (`max-w-7xl px-6 md:px-12`).
- Sections: `py-24`. Inner pages start with `pt-24` + `mt-16` to clear the floating nav.
- Radius: Tailwind values. A shape inside another with a gap under 32px uses
  `inner = outer − gap` when that is above 2px (`rounded-3xl p-2` → `rounded-2xl`).
- Cards are `bg-surface rounded-3xl` with no border and no shadow. Elevation is only for
  floating glass (`glass` utility).

## Motion

- Easing: `ease-fluid` = `cubic-bezier(0.32, 0.72, 0, 1)`. The `fluid` utility runs it for
  700ms on color, opacity and transforms. Never `ease`, `linear`, or bouncy curves.
- Reveals: add `data-reveal` to any element. It fades up 4rem (and un-blurs from 12px on
  `md+`) over 1000ms when it scrolls in. Stagger with `delay-100`, `delay-150`, `delay-200` …
- Tagline words: wrap each word in `<span data-word>`; it lights from 30% to 100% as it crosses
  a line 60% down the viewport.
- Spotlight borders: `data-spot` on a rounded card.
- One global `IntersectionObserver` (`src/lib/motion.ts`) drives all of it. Never listen to
  `scroll`. Animate only `opacity` and `transform`; blur is desktop only so phones hold 60fps.
- Everything collapses to static under `prefers-reduced-motion`.

## Components

- Nav: the floating glass island (`site-header.tsx`), a morphing hamburger and a full-screen
  blurred menu on phones. No store badge in the nav.
- Store CTAs: `StoreBadges`, the Google Play badge plus the official Apple badge shown disabled
  with "Coming soon" until App Store review passes. Never a custom store button.
- Icons: `Icon` from `src/components/icon.tsx` (Phosphor regular paths). Add new ones from
  `@phosphor-icons/core` the same way. No other icon set.
- Footer: logo and tagline, three short link columns, language links, theme and cookie selects.
