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
| `--color-app-count`, `--color-app-on-count` | tint 18% over bg; tint with 35% ink | same mixes | The canvas's Transactions badge mixes. Declared in `index.css`'s `@theme inline`, so they resolve per element under an accent or dark scope. |

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
| `text-app-figure`   | 24 / 32            | `rounded-app-3xl` | 24   | `app-gutter`              | 24    | Main padding            |
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
- **Review badge:** the sidebar's Transactions row counts live entries flagged `unreviewed` (`shell/review-count.ts`), read from the subscribed ledger with no extra query. It shows nothing until the whole ledger has loaded and nothing at zero, as the canvas's `count=""` does; folded, it is a tint dot.
- **Global states:** `shell/status.tsx` holds the offline bar, the sync card and the session expired dialog. The sync card shows only while a backlog drains after the connection dropped, so an ordinary save never flashes it.
- **Error pages:** `components/error-page.tsx`. The 404 renders in the shell as `/_account/_app`'s not-found component, and the crash page is the router's default error component. The wave illustration is static.

## Dashboard

From the canvas page `Web · Dashboard`, under `components/dashboard/home`:

- **Period:** the top bar's Month, Quarter and Year segments write a `range` search param: `2026-11` for a month, `2026-11/quarter` for the three months ending there, `2026-11/year` for January through it. `filters.range` is what every card reads; `filters.period` stays the month for screens that only know months. Arrows step a quarter by three months and a year by a year.
- **Ranges per card:** budgets sum each started month's limit and spending (`rangeBudgets`), Every day draws a 7-row grid for a quarter and twelve monthly bars for a year (`everyMonth`).
- **Setup:** a new ledger shows the setup strip in place of the totals. Only the strip and the card for the current step get a primary button; the cards that fill themselves (Spent of income, Every day) have none.
- **Loading:** `home-pending.tsx` draws static `bg-app-fill` blocks in the real layout, with the real labels and column headers.
- **Empty:** `home/empty.tsx` is the web-app-v2 empty pattern: one icon tile, a title, one line, then the actions. No illustrations.

## Transactions

From the canvas page `Web · Transactions`, under `components/dashboard/transactions`:

- **Tabs:** All, Expenses, Income, Transfers, To review and Uncategorized share one period and one set of filters; a tab only narrows what they return (`model.ts` `inTab`). Saved views follow as `view:` tabs. The list under the tabs dissolves on a swap.
- **Saved views:** `saved-views.ts` keeps them in the ledger's `appMeta` as JSON (`webSavedViews`), so they sync with the account. A view holds its filters, and, with "Keep sort and columns", the sort and the column layout.
- **Columns:** density and hidden columns are per browser (`columns.ts`, localStorage). The frame's drag handles are drawn but rows don't reorder.
- **Date:** the period chip opens the dashboard's `PeriodPicker` in a scoped context that writes the page's own `span`, `from` and `to`, so the list's coverage check keeps working.
- **Pages:** 15 rows a page with a footer that totals the tab (In, Out and Net on All; per day and Spent on Expenses; Moved and Fees on Transfers).
- **Drawer:** the entry sheet's amount is MoneyField. A recurring entry links to its schedule (`/recurring?item=`), an installment payment to its plan.
- **Loading:** the real screen over the sampled ledger inside a static skullet skeleton.

## Accounts

From the canvas page `Web · Accounts`, under `components/dashboard/accounts`:

- **Tiles:** an institution logo is `AccountTile size="logo"`, 34px on the 10px radius with a 1px border. The guide's .5px border has no class.
- **Amounts:** the check dialog, the account form and the purchase form use MoneyField, locked to the account's currency. CurrencyInput takes magnitudes only, so a balance that can sit below zero (`signed-money.tsx`) puts a "Negative balance" switch in the field's detail line.
- **Purchase form:** Total runs full width, with Upfront and Each under it. Each follows the split until it is typed, and goes back to following it when cleared.
- **Motion:** a row, Open, net worth and reorder push left, and every way back (the back button, cancel, done, archive, delete) reverses. Range and sort swaps dissolve.
- **Confirms:** archive and delete stay a Dialog with their facts and an undo toast, as the guide draws them, not the plain AlertDialog.
- **Empty:** the list and an account with no transactions use the dashboard's one-icon `Empty`. The frames' ghost rows are not drawn.
- **Loading:** `accounts-pending.tsx` draws the real screen over the sampled ledger inside a static skullet skeleton.

## Budgets

From the canvas page `Web · Budgets`, under `components/dashboard/budgets`:

- **Amounts:** the limit dialog, the plan editor and the trim dialog use MoneyField, locked to the ledger's currency. A limit stored in another currency opens at its converted value, rounded to the ledger's decimals.
- **Motion:** a category name, Open, Plan and a plan month push left, and every way back (the back button, the crumb, deleting the overall limit from its page) reverses. The month and year steppers dissolve the body under the bar.
- **Menus:** 240 wide, the guide's floor, where the frames draw them near 200.
- **Dialogs:** the limit, delete and trim dialogs are `md` (448). The year plan editor is `lg` (576), where it was a hand-set 560.
- **Confirms:** deleting a limit stays a Dialog with an undo toast, as the guide draws it.
- **Empty:** no data, no budgets yet, a month not started, an empty plan month or year and a period with no spending use the dashboard's one-icon `Empty`. No budgets yet still names the person's top three categories. The frames' ghost art is not drawn and its SVGs are gone.
- **Charts:** app SVGs. The used bar for a closed plan month reads `--color-app-ghost`, where it was a hand-set hex. SVG text keeps `style={{ textAnchor }}`: the JSX prop renders as a lowercase `textanchor` attribute the browser ignores, which clipped the axis labels and the pace pill.
- **Loading:** `budgets-pending.tsx` draws the real screen over the sampled ledger inside a static skullet skeleton.
- **Raw controls:** the plan month's category name and the plan chart's per-month focus targets stay raw buttons: a Button part would add hover chrome and padding the frames do not draw.

## Goals

From the canvas page `Web · Goals`, under `components/dashboard/goals`:

- **Amounts:** the goal form and add money use MoneyField, locked to the goal's currency. Add money keeps its sent and arrives pair when the account's currency differs.
- **Motion:** a goal row, the road and Open push left, and every way back (the back button, the crumb, deleting from the detail page) reverses.
- **Menus:** 240 wide on `MenuContent`. The form's own selects keep the shell scope at `z-60`, above the dialog.
- **Confirms:** delete stays a Dialog with an undo toast, as the guide draws it.
- **Empty:** no goals and the detail's no-exchange-rate chart use the dashboard's one-icon `Empty`. The frames' terrain art is not drawn and its SVGs are gone.
- **Charts:** inline `style` stays only for plot geometry and bar heights, which come from the data.
- **Loading:** `goals-pending.tsx` draws the real screen over the sampled ledger inside a static skullet skeleton.

## Recurring

From the canvas page `Web · Recurring`, under `components/dashboard/recurring`:

- **Amounts:** the schedule form, the log dialog and the confirm dialog use MoneyField, locked to the schedule's currency.
- **Motion:** the tab body dissolves on a tab swap. The detail drawer is a `SheetContent` and slides with PanelUI's Sheet. Dialogs and menus are instant.
- **Drawer:** a right sheet on wide screens and a full bottom sheet on narrow ones. It sets `showClose={false}` because its header draws its own close, as the guide says.
- **Menus:** the row menu, the filter menus and sort are 240 wide on `MenuContent`.
- **Dialogs:** pause and delete stay 420 and the log dialog 440, as the frames draw them. The confirm dialog is `md` (448) and the schedule form 520, `md` on its custom schedule view.
- **Segments:** expense or income and the custom schedule's units are PanelUI Tabs, where they were raw buttons.
- **Empty:** nothing set up yet, nothing detected, nothing paused and no filter match use the dashboard's one-icon `Empty`. The frames' ghost table is not drawn.
- **Loading:** `recurring-pending.tsx` draws the real screen over the sampled ledger inside a static skullet skeleton.
- **Raw controls:** the calendar's day cells and side lists, the pause choices (each row holds a date button, which a RadioCard cannot nest), the hidden date inputs behind the day fields and the stepper's number stay raw: a part would add chrome the frames do not draw.

## Debts

From the canvas page `Web · Debts`, under `components/dashboard/debts`:

- **Amounts:** new debt, something I owe, pay back and the second leg (the account's currency, or USD when no rate covers the day) use MoneyField, each on its own row. Pay back's chips fill the amount. An on-credit entry still gets the amount as text, written by `plainAmount`.
- **Due strip:** the next 14 days of installments, with Open installments on the right, as the frame draws it.
- **Motion:** a name, a card's Open and the row link push left, and every way back (the back button, the crumb, deleting from the detail page) reverses. The table dissolves on a tab swap.
- **Menus:** the row, the bar and the person picker are 240 wide on `MenuContent`. The form's selects keep the shell scope at `z-60`, above the dialog.
- **Dialogs:** every flow is `md` (448) on `DialogContent`. Delete stays a dialog with an undo toast.
- **Empty:** no debts and a detail with no movements use the dashboard's one-icon `Empty`. The frame's ghost rows are not drawn.
- **Payoff bar:** the late share is `bg-app-warn/55`, where it mixed warn into the track by hand. Widths stay inline: they come from the data.
- **Loading:** `debts-pending.tsx` draws the real screen over the sampled ledger inside a static skullet skeleton.
- **Raw controls:** the hidden date input behind the day field stays raw: the button opens its picker.

## Installments

From the canvas page `Web · Installments`, under `components/dashboard/installments`:

- **Amounts:** pay, pay all, edit an installment and the late fee use MoneyField, each on its own row. The amount the source account leaves in its own currency follows the day's rate until it is typed over. The scan and purchase forms were already moved in the Accounts phase.
- **Motion:** an order, a coming-up row and Open push left, and every way back (the back button, the crumb, deleting the whole order from its page) reverses. Orders and Paid off dissolve on a tab swap.
- **Menus:** the row, the bar and the schedule row menus are 240 wide on `MenuContent`. Add and remove late fee are link Buttons, where they were raw buttons.
- **Dialogs:** every flow is `md` (448) on `DialogContent`. Deleting one installment and deleting what is pending end in an undo toast.
- **Empty:** no orders uses the dashboard's one-icon `Empty` with Import a screenshot and New purchase. The frame's ghost table is not drawn.
- **Loading:** `installments-pending.tsx` draws the real screen over the sampled ledger inside a static skullet skeleton.

## Insights

From the canvas page `Web · Insights`, under `components/dashboard/insights`:

- **Tabs:** the bar is PanelUI Tabs (`underline`) whose triggers are router links, where it was hand-built links. A tab swap, a period step, a Breakdown view and a Reports choice dissolve.
- **Motion:** a row, a card's onward link, a sankey node and a Year month push left, and the cash flow drill's back link reverses.
- **Menus:** the Reports toolbar, saved and library menus are 240 wide on `MenuContent`. The toolbar's submenus keep the shell scope and open instant by hand.
- **Dialogs:** save, rename, export and share a report are `md` (448) on `DialogContent`. The recap share dialog is 680, as the frame draws it. Deleting a report is a destructive `ConfirmDialog`.
- **Empty:** a quiet cash flow, a quiet drill, a young year, nothing to break down, no recap, a quiet standout, no reports and a report with no data use the dashboard's one-icon `Empty`. The frames' ghost charts and tables are not drawn. The history card stays: it shows how far the ledger is from a usual, not an empty panel.
- **Recap card:** the canvas card reads its colours from the shell's tokens when it is drawn, so it follows the theme it was opened in. A category with no colour gets `--color-app-muted`.
- **Samples:** the sample overview takes its category colours from the suggested category presets, where it had hand-set hex.
- **Tables:** Breakdown's columns are the frame's widths as shares of the card, so the last column and the chevrons stay inside it. Tags read `#name`, and the untagged row has no bar.
- **Sankey:** a bar thinner than its two-line label still gets 18px of height, so labels do not overlap.
- **Loading:** `insights-pending.tsx` draws the real screen over the sampled ledger inside a static skullet skeleton.
- **Raw controls:** the row and stretched-link targets stay raw buttons: a part would add chrome the frames do not draw.

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

- `AmountInput`: `transactions/transfer-editor.tsx`
- Bare decimal inputs: `onboarding/first-entry.tsx`, `import/money-manager/overview.tsx`, `import/file-done.tsx`, `settings/plan.tsx`
- Not amount entry, so they stay as they are: `transactions/filter-row.tsx` (the amount filter) and `settings/currency-converter.tsx` (a converter, closer to Exchange). The transfer flow already uses Exchange.

## Off contract

These are known and left for the screen phases:

- **Hand-drawn classes:** 20 `.dash-*` classes in `apps/app/src/index.css` (`dash-btn`, `dash-seg`, `dash-menu`, `dash-chip`, `dash-check` and others) redraw parts PanelUI has. Their shadows now read the tokens.
- **Arbitrary values:** about 1,360 arbitrary Tailwind values and 245 inline `style={...}` props under `apps/app/src`.
- **Hard-coded colours:** 20 hex colours in 11 non-test source files, such as the identity picker and the provider icons.
- **Raw controls:** 35 files with a raw `<button>` and 14 with a raw `<input>`. The account sheet's sign-out row stays a raw `<button>` until there is a row part, because Button's ghost hover and weight would change the row.
- **Spinners:** Button `loading` draws a spinner in `settings/invite.tsx`, `settings/plan.tsx`, `settings/account.tsx` and `settings/about/suggest.tsx`.
- **Menu timing:** every menu except the account, period, dashboard filter, Transactions, Accounts, Goals, Recurring, Debts, Installments and Insights menus still fades for 150ms. The canvas says menus are `instant`, and screens get it by moving to `MenuContent`.
- **Hand-placed scope:** 74 files put `app-shell ph-no-capture` on portaled content by hand. `DialogContent`, `SheetContent` and `MenuContent` replace that.
- **Accent inside the shell:** `accentCss` (`lib/accent.ts`) writes the tint and on-tint on `:root`. The shell scope sets `--color-app-on-tint` again in both themes, and `--color-app-tint` again in dark, so inside the shell a non-default accent shows as vermilion in dark and keeps the default on-tint. This was already the case before this phase.
- **Pages outside the shell:** `login` and `connect`, and any portal without `app-shell`, read the phone's dark palette from `:root`. So does `html` itself, whose background is `--color-app-bg`.
- **What syncs:** `settings/sync.tsx` lists what syncs and what stays on each phone. No frame has it yet: it fills the Sync frames' right column, where the canvas draws a Devices table the app doesn't have.
- **Duplicate block on the site:** apps/site keeps its own copy of the `.app-shell` palette, which matches these values.
