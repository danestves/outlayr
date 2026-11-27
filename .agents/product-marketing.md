# Product Marketing Context

**Document version:** v3
**Last updated:** 2026-11-26

## Product Overview
**One-liner:** An expense tracker and budget app where you log a purchase in one sentence.
**What it does:** You log a purchase by typing one sentence, saying it, or scanning the receipt. Budgets, savings goals, subscriptions, accounts, and insights update as you log. In the mobile app, entries live on the phone first and sync is optional; the web app works from the synced ledger.
**Product category:** Expense tracker / budget app / money manager (App Store: Finance, Productivity).
**Product type:** Consumer app on iPhone and Android, with a web app at app.tryoutlayr.com.
**Business model:** Freemium. Free tracker; Outlayr Pro as monthly, yearly, or one-time purchase. Prices vary by country and are not published on the site.

## Target Audience
**Target users:** Anyone, wherever they live, who wants to know where their money goes but quit trackers because logging is tedious. Outlayr is for everyone. No market is the default.
**Who that includes (write for all of them, not one):**
- Students and first jobbers learning to budget on a small, irregular income.
- Families and couples sharing a household budget.
- Freelancers and remote workers paid in one currency and spending in another.
- Travelers, expats and people who send money home.
- People in cash-heavy economies, and anyone whose spending is not in a bank feed.
- People paying in installments: Klarna, Afterpay, Affirm, meses sin intereses, Cashea.
- Anyone drowning in subscriptions.
**Primary use case:** Log daily spending fast enough that the habit sticks.
**Jobs to be done:**
- Know what is left this month before it runs out.
- Keep every account, card, and currency in one place.
- Save toward a dated goal and know if they are on pace.
**Use cases:**
- Logging a coffee in seconds by voice or one typed sentence.
- Scanning a grocery receipt instead of typing it.
- Tracking subscriptions and paychecks that repeat.
- Holding accounts in different currencies (for example a salary in EUR, savings in USD, a trip in JPY).

## Problems & Pain Points
**Core problem:** Manual trackers take too long per entry, so people stop logging and lose the picture of the month.
**Why alternatives fall short:**
- Spreadsheets are slow on a phone and don't warn you about pace.
- Many trackers are forms with six fields per purchase.
**What it costs them:** Overspending noticed at the end of the month, not during it.
**Emotional tension:** Not knowing where the money went.

## Competitive Landscape
**Entity sentence (use it everywhere):** "Outlayr is an open source mobile expense tracker, budget app, and subscription tracker, made by danestves LLC." Spanish: "Outlayr es una app móvil de código abierto para controlar tus gastos, tu presupuesto y tus suscripciones, hecha por danestves LLC." Search results for "Outlayr" go to outlayr.com, an unrelated payments company, and to apps named "Outlay".
**Direct (each has a page under /compare, facts dated and linked to the rival's own site):**
- Rocket Money: subscription manager, US only, cancellation by its team is Premium. Deepest "alternative" demand.
- YNAB, Monarch, Copilot: paid, bank-synced, US-centric (Copilot USD only; Monarch US and Canada).
- EveryDollar (US-only mobile app, USD only), PocketGuard (paid, bank sync).
- Spendee, Wallet by BudgetBakers: multi-currency, named most often in Spanish AI answers, bank sync in Premium.
- Mint: shut down; "reimagined on Credit Karma" per Intuit. Served by /guides/mint-alternative (CSV import).
**Secondary:** Spreadsheets and notes apps. Flexible, but slow to log and give no pace or projection.
**Indirect:** Banking apps. Show transactions per bank, not a single picture across accounts and currencies.

## Differentiation
**Key differentiators:**
- The add form is one sentence with tappable words.
- Three ways to capture: type, voice, receipt scan.
- Budgets project where the current pace ends, in plain words.
- 165 currencies with the rate from the day of each purchase.
**Why customers choose us:** Logging is fast enough to keep doing.

## Objections
| Objection | Response |
|-----------|----------|
| Is it free? | The tracker is free; Pro raises limits and adds sync. |
| Is my data private? | The ledger stays on the phone unless you turn on sync or use server features. No ads, never sold; usage analytics and crash reports go to PostHog, never amounts or merchants. |
| Is it on Android? | Yes, on Google Play. |
| Is it on iPhone? | Yes, on the App Store. |

**Anti-persona:** People who want automatic bank-feed syncing.

## Markets
**Rule:** Global first. Headlines, store listings, examples and mockups speak to everyone; no single country is the frame.
- Country-specific content is welcome as one market among many: a page about the BCV rate, meses sin intereses in Mexico, or Klarna in Germany. It lives on its own page or guide. A general listing may name a local feature in one line, never as the headline or the main example.
- A general example rotates regions and currencies (USD, EUR, GBP, INR, BRL, MXN, JPY, NGN...). Never let one country's banks, apps or currency stand for "the user".
- Every new content batch covers several regions. If a plan lists only one country, it is not done.
- Venezuela, where Outlayr started, stays a supported market (BCV and Binance rates, bank texts, Cashea). It is not the positioning.

## Search Targets
| Intent | App Store | Web |
|---|---|---|
| Subscription tracker / manager | Name "Subscription Tracker: Outlayr" (winnable: top-10 median 258 ratings) | /guides/subscription-tracker, /compare/rocket-money |
| Expense tracker / budget app | Combinations across name, subtitle, keywords (long game: medians 16k to 19k) | Home, /guides/budget-planner |
| "<rival> alternative" | No App Store demand; Apple Ads brand keywords only | /compare/<rival>, titled "<Rival> Alternative" |
| Spanish | "control de gastos", "presupuesto y suscripciones" | "app para controlar gastos gratis" (es home title) |
Never target "budget app without bank linking" style queries: they can only be won by marketing the absence of bank linking.

## Customer Language
**Words to use:** log, entry, ledger, the month, what is left, pace, one sentence.
**Words to avoid:** seamless, effortless, take control of your finances, unlock, supercharge, all-in-one. Do not market the absence of bank linking.
**Glossary:**
| Term | Meaning |
|------|---------|
| Capture | One voice entry or one receipt scan (free: 30 every 30 days, Pro: 500) |
| Log | The main list of entries |
| Ledger | All of a user's entries, accounts, budgets, and goals |

## Brand Voice
**Tone:** Plain, specific, calm.
**Style:** Short sentences, concrete verbs, numbers shown in monospace. No em dashes, no exclamation points, American English.
**Personality:** Precise, warm, quiet, trustworthy.

## Proof Points
**Metrics:** None published yet. Never invent user counts, ratings, or testimonials.
**Value themes:**
| Theme | Proof |
|-------|-------|
| Fast logging | One-sentence form, voice entry, receipt scan (shown in the live demo and App Store preview) |
| Privacy | Local-first storage; no ad SDKs; PostHog analytics without amounts, merchants, or notes |

## Goals
**Business goal:** Downloads on the App Store and Google Play.
**Conversion action:** Tap a store badge.
**Current metrics:** Live on the App Store and Google Play.

## Changelog
*Newest first. One line per revision: what changed and why.*
- v3 (2026-11-26): Global first. The audience is everyone, a Markets section keeps any one country out of the general pitch, and the iPhone app is live.
- v2.3 (2026-10-22): Google Play is public while Apple review is pending, so the site shows the App Store as coming soon.
- v2.2 (2026-10-21): Android is live on Google Play, so the site and goals stop calling it coming soon.
- v2.1 (2026-10-09): Entity sentence names the subscription tracker too, with its Spanish form, matching /about, the home FAQ, and llms.txt.
- v2 (2026-10-07): Direct competitors, the entity sentence, and search targets, from the ASO and web search research.
- v1 (2026-09-24) — Initial context, drafted from the codebase, App Store listing, and site copy.
