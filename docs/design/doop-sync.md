# Doop sync: the web app's design contract

The Doop canvas "Outlayr" ([qglUCf5arb](https://doop.design/c/qglUCf5arb)) is the source of the web app's look. This page maps it onto `apps/app`: which canvas page owns which route, which token holds which value, which parts screens build from, and what still sits outside the contract.

## Where things live

- **Tokens:** `packages/shared/src/tokens.css`. Values come from the canvas's web tokens and nowhere else. `apps/app/src/index.css` consumes them: it maps them onto PanelUI's names (`--primary`, `--card` and so on) and holds no palette of its own.
- **Themes:** light is the default, with no attribute. Dark applies under `data-theme="dark"`. The web app's dark palette is scoped to `.app-shell` and the toast viewport, because `:root[data-theme="dark"]` already holds the phone's dark palette that apps/site's phone mockups draw with.
- **Parts:** PanelUI (`panelui-web` 0.18.0) is the parts layer. The app's own primitives in `apps/app/src/components/ui/` sit on top of it, only where they add something.
- **Motion:** duration and easing tokens in `tokens.css`. The CSS set is at the end of `apps/app/src/index.css`, and the router helper is in `apps/app/src/lib/motion.ts`.

## Canvas pages and routes

Routes are under `apps/app/src/routes/_account/`. `_app.*` routes render inside the shell.

| Canvas page                 | Page id      | Routes                                                                                                              |
| --------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------- |
| Web · Shell                 | `7KupwDA5td` | `_app.tsx` (sidebar, mobile bar, account menu in `components/dashboard/shell/`)                                     |
| Web · Dashboard             | `HfIDjLuShD` | `_app.index.tsx`                                                                                                    |
| Web · Transactions          | `XO5q1eAfdH` | `_app.transactions.tsx`                                                                                             |
| Web · Accounts              | `qisCCWc3p7` | `_app.accounts.index`, `_app.accounts.$accountId`, `_app.accounts.net-worth`, `_app.accounts.reorder`               |
| Web · Insights              | `hlIrwxvsMW` | `_app.insights.tsx`, `.index`, `.breakdown`, `.cash-flow`, `.recap`, `.reports`, `.year`                            |
| Web · Budgets               | `8mH9DgzlD6` | `_app.budgets.index`, `_app.budgets.$categoryId`, `_app.budgets.plan.index`, `_app.budgets.plan.$month`             |
| Web · Goals                 | `JpZxYcBdVS` | `_app.goals.index`, `_app.goals.$goalId`                                                                            |
| Web · Recurring             | `gWRKa_Mx2L` | `_app.recurring.tsx`                                                                                                |
| Web · Debts                 | `2M1qilxpFv` | `_app.debts.index`, `_app.debts.$accountId`                                                                         |
| Web · Installments          | `mKwTPMZqHD` | `_app.installments.index`, `_app.installments.$planId`                                                              |
| Web · Import                | `O0WA88jgve` | `_app.import.tsx`, `.index`, `.file`, `.money-manager`                                                              |
| Web · Rules                 | `NWLFtZUGXl` | `_app.rules.tsx`                                                                                                    |
| Web · Settings              | `cAQm5WCbBG` | `_app.settings.tsx` and every `_app.settings.*` route, Categories and Connections included                          |
| Web · Auth                  | `OKW6CGtdAM` | `login.tsx` (Auth), `connect.tsx` (Connect), `_app.settings.invite` (Invite). Adopt and Gate have no route by name. |
| Web · Onboarding            | `XMSTfgK1hY` | `_app.onboarding.tsx` (the shell's `bare` mode)                                                                     |
| Web · Paywall and plan      | `3iIQtL_Hr7` | `_app.settings.plan` and `components/dashboard/paywall/`                                                            |
| Light directions | No page id (not on any listed page) | Dashboard light options `cgpdU-FFVt` (Light A · Stone), `LlUImwwLuX` (Light B · Paper), `0uc2btKt7Q` (Light C · White cards). None is marked final. The light user menu `KohDfR9VkA` is on Web · Shell. |
| Home and empty state directions | `eQNbgbXMLU`, `R85gNQJcgO` | Explorations, no route                                                                                |
| Archive                     | `vZwe78FPJq` | No route                                                                                                            |

`__root.tsx`, `_account.tsx`, `health.ts`, `api/auth/$.ts` and `photos/$.ts` have no canvas page.

## Colour tokens

Utilities read `bg-app-*`, `text-app-*` and `border-app-*`. "Uses" counts files under `apps/app/src`, `index.css` included.

| Canvas token   | CSS variable               | Light                                 | Dark                                           | Uses |
| -------------- | -------------------------- | ------------------------------------- | ---------------------------------------------- | ---- |
| bg             | `--color-app-bg`           | `#f1f0ea`                             | `#131209`                                      | 4    |
| group          | `--color-app-group`        | `#f7f6f0`                             | `#1c1b13`                                      | 5    |
| ink            | `--color-app-ink`          | `#17150f`                             | `#fafaf9`                                      | 5    |
| muted          | `--color-app-muted`        | `#6b6557`                             | `#a8a29e`                                      | 8    |
| rule           | `--color-app-rule`         | `#dcd8cc`                             | `#2e2d24`                                      | 3    |
| fill           | `--color-app-fill`         | `#e4e2dc`                             | `#26251b`                                      | 37   |
| strong         | `--color-app-strong`       | `#cdc8b9`                             | `#3a392e`                                      | 25   |
| tint           | `--color-app-tint`         | `#c2371b`                             | `#e2643f`                                      | 55   |
| on-tint        | `--color-app-on-tint`      | `#ffffff`                             | `#17150f`                                      | 2    |
| income         | `--color-app-income`       | `#00714a`                             | `#3fd99b`                                      | 37   |
| spend          | `--color-app-spend`        | `#c0402e`                             | `#e06a57`                                      | 27   |
| warn           | `--color-app-warn`         | `#8f6200`                             | `#e0b04f`                                      | 13   |
| warning-fill   | `--color-app-warning-fill` | `#8f6200`                             | `#fdcc41`                                      | 1 (PanelUI `--warning`) |
| info           | `--color-app-info`         | `#2f6d99`                             | `#2f6d99` (the canvas has no dark value)       | 1 (PanelUI `--info`) |
| input          | `--color-app-input`        | `#f1f0ea`                             | `color-mix(in oklab, #2e2d24 30%, transparent)` | 0    |
| segment        | `--color-app-segment`      | `#f1f0ea`                             | `#2e2d24`                                      | 0    |
| ring           | `--color-app-ring`         | `#17150f0f`                           | `#ffffff1a`                                    | 0    |
| band           | `--color-app-band`         | `color-mix(in oklab, #f7f6f0, #000 5%)` | `color-mix(in oklab, #1c1b13, #000 14%)`     | 0    |
| panel-shadow   | `--color-app-panel-shadow` | `#0000000d`                           | `#00000033`                                    | 0 (through `--shadow-app-panel`) |
| ghost          | `--color-app-ghost`        | `#cdc8b9`                             | `#4a4839`                                      | 13   |
| sheet dim      | `--opacity-app-sheet-dim`  | `0.28`                                | `0.5`                                          | 1    |

The tokens with no uses are new in this phase. The screen phases adopt them.

### App-only extensions

These names are not canvas tokens. Each one is kept, with a comment in `tokens.css`, because folding it into the token it resembles would change how a screen looks.

| Name                       | Light       | Dark        | Why it stays                                                                                                 |
| -------------------------- | ----------- | ----------- | ------------------------------------------------------------------------------------------------------------ |
| `--color-app-hover`        | `#17150f05` | `#ffffff08` | The light-theme guide's hover fill. The values match the guide, which has no token for it.                     |
| `--color-app-float`        | `#fffefb`   | `#26251b`   | Older than the canvas's floating surfaces, which use group (and the selected segment, which uses segment). Moving to them is a visual change. |
| `--color-app-shadow-far`   | `#1c191738` | `#000c`     | The light-theme guide's popover shadow pair, which `--shadow-app-*` is built from.                            |
| `--color-app-shadow-near`  | `#1c19171f` | `#0006`     | As above.                                                                                                      |
| `--color-app-track`, `--color-app-chip` | `#d6d4ce`, `#c6d8cc` | phone palette | apps/site's. The web app does not use them.                                                    |

`--color-app-scrim` had no consumer in `apps/app`, so it was removed. PanelUI's dialog backdrop is `bg-black/40`, which is the canvas's `#0006`.

## Type, radius, spacing and shadow

These scales are derived from the canvas guides (web-app-v2 base CSS and the component guide), not read from tokens. The canvas has no named scale, so the names are the code's.

| Type token          | Size / line height | Radius token     | Value | Spacing token             | Value | Use                     |
| ------------------- | ------------------ | ---------------- | ----- | ------------------------- | ----- | ----------------------- |
| `text-app-micro`    | 11 / 16            | `rounded-app-xs` | 6     | `app-control-sm`          | 32    | Button and Input `sm`   |
| `text-app-caption`  | 12 / 16            | `rounded-app-sm` | 8     | `app-control`             | 36    | Button and Input `md`   |
| `text-app-label`    | 13 / 18            | `rounded-app-md` | 10    | `app-control-lg`          | 44    | Button and Input `lg`   |
| `text-app-body`     | 14 / 20            | `rounded-app-lg` | 12    | `app-row`                 | 44    | Key-value row           |
| `text-app-title`    | 15 / 20            | `rounded-app-xl` | 16    | `app-header`              | 52    | Page header             |
| `text-app-heading`  | 18 / 24            | `rounded-app-2xl` | 20   | `app-bar`                 | 64    | Mobile bar              |
|                     |                    | `rounded-app-3xl` | 24   | `app-gutter`              | 24    | Main padding            |
|                     |                    |                  |       | `app-sidebar`             | 232   | Sidebar width           |

Fonts: `--font-app-sans` is Geist and `--font-app-mono` is Geist Mono, from the canvas tokens.

Shadows are plain custom properties, not `@theme` entries, because Tailwind inlines a theme shadow's literal value and the dark scope could not reach it. Use them as `shadow-(--shadow-app-popover)` or `var()`.

| Shadow                | Value                                                                       |
| --------------------- | --------------------------------------------------------------------------- |
| `--shadow-app-popover` | `0 16px 32px -12px var(--color-app-shadow-far), 0 4px 12px var(--color-app-shadow-near)` |
| `--shadow-app-dialog`  | `0 24px 48px -12px var(--color-app-shadow-far)`                             |
| `--shadow-app-segment` | `0 1px 2px var(--color-app-shadow-near)`                                    |
| `--shadow-app-panel`   | `0 1px 2px var(--color-app-panel-shadow)` (the band frame's panel)          |
| `--shadow-app-tint`    | `inset 0 1px 0 #ffffff33` (the tint button's highlight)                     |

`apps/app/src/lib/utils.ts` registers the `app-` scales with tailwind-merge, so `cn()` resolves `text-muted-foreground text-app-label` and `h-9 h-app-control` correctly. PanelUI merges a part's `className` with its own tailwind-merge, which does not know these names: on a PanelUI part, `text-app-*` beside a text colour drops one of the two, and `rounded-app-*` or `h-app-*` beside the part's own radius or height is decided by CSS order. Put type tokens on an element you own until PanelUI takes a merge config.

## Motion

The canvas names five transitions. The code spells them the same way.

| Canvas name  | Where the canvas uses it                       | Duration token                         | Easing token          | In code |
| ------------ | ---------------------------------------------- | -------------------------------------- | --------------------- | ------- |
| `push-left`  | Drill-down. Back plays it in reverse.          | `--duration-app-push` (450ms)          | `--ease-app-slide`    | Router: `viewTransition("push-left")`, and `{ back: true }` for back. Element: `data-motion="push-left"`, plus `data-back`. |
| `slide-up`   | A sheet coming in, a speed dial opening        | `--duration-app-slide` (450ms)         | `--ease-app-slide`    | PanelUI Sheet. Element: `data-motion="slide-up"`. |
| `slide-down` | A sheet going out                              | `--duration-app-slide` (450ms)         | `--ease-app-slide`    | PanelUI Sheet. Element: `data-motion="slide-down"`. |
| `dissolve`   | A segment swap                                 | `--duration-app-dissolve` (200ms)      | `--ease-app-dissolve` | Router: `viewTransition("dissolve")`. Element: `data-motion="dissolve"`. |
| `instant`    | Menus, period and filter menus                 | `--duration-app-instant` (0ms)         | none                  | `MenuContent`. Router: `viewTransition("instant")` returns `false`. Element: `data-motion="instant"`. |

- **Values:** the canvas names the transitions but gives no timing. The durations and easings are what PanelUI already ships: Sheet's 450ms `cubic-bezier(0.32, 0.72, 0, 1)` and Dialog's 200ms `cubic-bezier(0.2, 0, 0, 1)`. `push-left` reuses the slide timing.
- **Reduced motion:** under `prefers-reduced-motion: reduce`, every duration token is 0ms, and a global rule at the end of `index.css` zeroes every animation and transition, PanelUI's own included. Everything plays as `instant`.
- **Route transitions:** they animate the content pane (`app-content`) only. The sidebar holds still.
- **No looping motion:** web-app-v2 forbids anything that keeps repainting, so there are no spinners, pulse or shimmer. A skeleton is a static block on the raised surface, and progress is a static bar with a figure.
- **`useTransition`:** it is not used as a name because it would shadow React's hook. The router helper is `viewTransition`.

## Shell

The chrome every ledger page shares, from the canvas page `Web · Shell`:

- **Frame:** `shell/sidebar.tsx` (Ledger, Plan and Tools, folding to the rail), `shell/top-bar.tsx` (page filters, the period control and Add entry), `shell/mobile-bar.tsx` (drawer, title, search, account sheet and Add entry).
- **Palette:** `shell/command-palette.tsx`, opened by `mod+k`, the sidebar's Search and the mobile bar. Its open state lives in `shell/palette-open.ts`, because those triggers sit outside the ledger's providers.
- **Global states:** `shell/status.tsx` holds the offline bar, the sync card and the session expired dialog. The sync card shows only while a backlog drains after the connection dropped, so an ordinary save never flashes it.
- **Error pages:** `components/error-page.tsx`. The 404 renders in the shell as `/_account/_app`'s not-found component, and the crash page is the router's default error component. The wave illustration is static.

## Primitives

| Part         | Use                                                    | Notes                                                                                                   |
| ------------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Button       | `panelui-web/button`                                   | Sizes `sm`, `md`, `lg` are 32, 36 and 44, as the canvas has them. Do not use `loading`: it draws a spinner. |
| IconButton   | `@/components/ui/icon-button`                          | A Hugeicon and a required `label`. Sizes `sm`, `md`, `lg` are 32, 36 and 44. Ghost by default.          |
| Input, Field | `@/components/ui/text-field`                           | Field, Label, Input, description and error in one. Use `panelui-web/field` and `/input` directly for anything else. |
| Money        | `@/components/ui/money-field`                          | PanelUI CurrencyInput with the app's currencies, number locale and translated labels.                  |
| Card         | `panelui-web/frame`                                    | The canvas's Frame family: `default`, `plain`, `band` (CardFrame) and `inset`.                          |
| Dialog       | `@/components/ui/dialog-content` inside `Dialog`       | Carries the shell's tokens into the portal. Create and edit open in a dialog.                           |
| Sheet        | `@/components/ui/sheet-content` inside `Sheet`         | Carries the shell's tokens. Detail opens in a right sheet. PanelUI's slide is `slide-up` / `slide-down`. |
| Menu         | `@/components/ui/menu-content` inside `Menu`           | Carries the shell's tokens and opens `instant`. Menus are 240 to 300px wide.                            |
| Confirm      | `@/components/ui/confirm-dialog`                       | PanelUI AlertDialog with the shell's tokens. Deleting an entry and the session expiry use it.           |
| Tabs         | `panelui-web/tabs`                                     | A segment swap is `dissolve`.                                                                           |
| Toast        | `panelui-web/toast`                                    | The viewport sits outside the shell and gets the same token scope.                                      |
| Table        | `panelui-web/table`                                    |                                                                                                         |

The shell is on the primitives: the account menu and the period menu use `MenuContent`, the account sheet uses `SheetContent` and the mobile bar uses `IconButton`. The 46 routes are not migrated yet.

### Amount fields that move onto MoneyField

These still use `AmountInput` (`components/dashboard/accounts/fields.tsx`) or a bare `inputMode="decimal"` input. Each one moves in its screen's phase:

- `AmountInput`: `recurring/dialogs.tsx` (2), `recurring/schedule-form.tsx`, `transactions/entry-form.tsx` (the entry sheet's editor only; the Add entry dialog is on MoneyField), `transactions/transfer-dialog.tsx` (the sent amount, whose currency the account fixes), `accounts/check-dialog.tsx`, `accounts/purchase-form.tsx`
- Bare decimal inputs: `debts/fields.tsx`, `debts/debt-dialogs.tsx`, `budgets/budget-dialogs.tsx`, `accounts/account-form.tsx`, `accounts/account-detail.tsx`, `onboarding/first-entry.tsx`, `import/money-manager/overview.tsx`, `import/file-done.tsx`, `settings/plan.tsx`
- Not amount entry, so they stay as they are: `transactions/toolbar.tsx` (a filter) and `settings/currency-converter.tsx` (a converter, closer to Exchange). The transfer flow already uses Exchange.

## Off contract

These are known and left for the screen phases:

- **Hand-drawn classes:** 27 `.dash-*` classes in `apps/app/src/index.css` (`dash-btn`, `dash-seg`, `dash-menu`, `dash-chip`, `dash-check` and others) redraw parts PanelUI has. Their shadows now read the tokens.
- **Arbitrary values:** about 1,360 arbitrary Tailwind values and 245 inline `style={...}` props under `apps/app/src`.
- **Hard-coded colours:** 42 hex colours in 21 non-test source files, such as the recap share card and the insights samples.
- **Raw controls:** 35 files with a raw `<button>` and 14 with a raw `<input>`. The account sheet's sign-out row stays a raw `<button>` until there is a row part, because Button's ghost hover and weight would change the row.
- **Spinners:** Button `loading` draws a spinner in `settings/invite.tsx`, `settings/plan.tsx`, `settings/account.tsx` and `settings/about/suggest.tsx`.
- **Menu timing:** every menu except the account and period menus still fades for 150ms. The canvas says menus are `instant`, and screens get it by moving to `MenuContent`.
- **Hand-placed scope:** 74 files put `app-shell ph-no-capture` on portaled content by hand. `DialogContent`, `SheetContent` and `MenuContent` replace that.
- **Accent inside the shell:** `accentCss` (`lib/accent.ts`) writes the tint and on-tint on `:root`. The shell scope sets `--color-app-on-tint` again in both themes, and `--color-app-tint` again in dark, so inside the shell a non-default accent shows as vermilion in dark and keeps the default on-tint. This was already the case before this phase.
- **Pages outside the shell:** `login` and `connect`, and any portal without `app-shell`, read the phone's dark palette from `:root`. So does `html` itself, whose background is `--color-app-bg`.
- **Duplicate block on the site:** apps/site keeps its own copy of the `.app-shell` palette, which matches these values.
