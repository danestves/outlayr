# SEO audit, 2026-11-19

[SEOmator CLI](https://github.com/seo-skills/seo-audit-skill) 8.0.1, 398 rules in 20 categories, run against the marketing site (`apps/site`). Per rule: pass 100, warn 50, fail 0. The overall score is the weighted mean of the category scores.

## Score

| Run | Target | Score | Grade | Pages |
| --- | --- | --- | --- | --- |
| Production baseline | `https://tryoutlayr.com` | 95 | A | 260 |
| Local build of `main` (7d7ad64ff) | `http://127.0.0.1:4317` | 90 | A | 260 |
| Local build of this branch | `http://127.0.0.1:4318` | 91 | A | 260 |

Production can only be audited again after a deploy. The before and after for this branch are therefore two local production builds (`vp build`, then `node .output/server/index.mjs`) crawled with the same command. Locally, every page fails the rules that need HTTPS, a public hostname, HTTP/2 or Cloudflare's compression (`security-https`, `security-ssl-*`, `links-localhost`, `core-canonical-http-mismatch`, `crawl-sitemap-domain`, `perf-brotli`, `perf-http2`). That is why the local scores sit below production. Those rules fail the same way on both local builds, so they cancel out of the comparison.

## Categories

Score, then pass / warn / fail checks summed over all pages.

| Category | Production | Local main | Local branch |
| --- | --- | --- | --- |
| core | 99 · 6071/122/46 | 93 · 5308/376/301 | 93 · 5308/376/301 |
| technical | 99 · 4382/288/10 | 99 · 4382/288/10 | 99 · 4382/288/10 |
| perf | 89 · 4235/888/77 | 84 · 3471/1652/77 | **86** · 3725/1398/77 |
| links | 98 · 6432/588/0 | 86 · 5916/849/255 | 86 · 5918/847/255 |
| images | 94 · 3140/500/0 | 94 · 3140/500/0 | 94 · 3146/494/0 |
| security | 90 · 5459/1041/260 | 68 · 4420/1040/1300 | **69** · 4680/780/1300 |
| crawl | 100 · 9874/6/0 | 92 · 7570/265/260 | 92 · 7570/265/260 |
| schema | 87 · 4271/416/238 | 87 · 4271/416/238 | **92** · 4355/565/5 |
| a11y | 94 · 8117/969/25 | 94 · 8122/964/25 | 94 · 8122/964/25 |
| content | 90 · 6015/630/366 | 88 · 5007/617/371 | 88 · 5007/617/371 |
| social | 93 · 2042/268/25 | 93 · 2042/268/25 | 93 · 2042/268/25 |
| eeat | 90 · 3191/709/0 | 90 · 3191/709/0 | 90 · 3191/709/0 |
| url | 100 · 3625/15/0 | 97 · 3370/270/0 | 97 · 3370/270/0 |
| mobile | 97 · 1774/12/29 | 97 · 1774/12/29 | 97 · 1774/12/29 |
| i18n | 100 · 3373/2/5 | 90 · 2865/510/5 | 90 · 2865/510/5 |
| legal | 100 · 260/0/0 | 100 · 260/0/0 | 100 · 260/0/0 |
| js | 100 · 780/0/0 | 100 · 780/0/0 | 100 · 780/0/0 |
| redirect | 100 · 2079/1/0 | 100 · 2079/1/0 | 100 · 2079/1/0 |
| htmlval | 99 · 2844/5/11 | 99 · 2844/5/11 | 99 · 2844/5/11 |
| geo | 84 · 2583/733/64 | 84 · 2578/738/64 | **90** · 2833/483/64 |

Every rule this branch changes has the same status on production as on local main, so each fix applies to production unchanged.

## Core Web Vitals, mobile

One page per locale on production, with `--cwv --mobile`. Lab data from Playwright's bundled headless Chromium. `seomator self doctor` reports "No Chrome/Chromium found" because it only looks in system paths, but the CWV runner launched the bundled browser and measured. INP is never measured in a lab run: it needs real interaction. Use field data (CrUX or PostHog) for it.

| Page | Score | LCP | CLS | FCP | TTFB |
| --- | --- | --- | --- | --- | --- |
| `/` | 92 | 1.90 s | 0.000 | 1.90 s (warn) | 775 ms |
| `/es` | 92 | 1.02 s | 0.001 | 1.02 s | 390 ms |
| `/pt` | 92 | 0.72 s | 0.000 | 0.72 s | 387 ms |
| `/fr` | 92 | 0.77 s | 0.000 | 0.77 s | 443 ms |
| `/de` | 92 | 0.69 s | 0.000 | 0.69 s | 363 ms |

`/` was the first request of the run and the only slow one (`perf-response-time` 1001 ms against a 1000 ms limit). The other four answered in about 400 ms, which points to a cold edge or server, not the page. The home pages also fail these rules in the CWV runs, beyond what the crawl reports: `perf-unused-js` (about 535 KiB loaded but not run during load, mostly the first-party `module-*.js` and `Schema-*.js` chunks) and `a11y-axe-other` (WCAG AAA `color-contrast-enhanced` on `.hz-lead`, `.hz-proof`, `.hz-plan-note` and `.hz-source-license`).

## Failing rules

Pages failing each rule. The appendix lists every URL.

| Category | Rule | Prod | Local main | Local branch |
| --- | --- | --- | --- | --- |
| core | `core-canonical-to-homepage` | 1 | 1 | 1 |
| core | `core-title-present`, `core-title-length`, `core-title-unique`, `core-description-present`, `core-canonical-present`, `core-viewport-present`, `core-favicon-present`, `core-h1-present`, `core-h1-single` | 5 each | 5 each | 5 each |
| technical | `technical-www-redirect`, `technical-bad-content-type` | 5 each | 5 each | 5 each |
| perf | `perf-dom-size`, `perf-page-weight` | 6 each | 6 each | 6 each |
| perf | `perf-lazy-above-fold` | 60 | 60 | 60 |
| perf | `perf-lcp-hints` | 5 | 5 | 5 |
| security | `security-csp-xss` | 260 | 260 | 260 |
| schema | `schema-article` | 84 | 84 | **0** |
| schema | `schema-required-fields` | 144 | 144 | **0** |
| schema | `schema-product` | 5 | 5 | **0** |
| schema | `schema-present` | 5 | 5 | 5 |
| a11y | `a11y-link-text` | 15 | 15 | 15 |
| a11y | `a11y-video-captions`, `a11y-main-landmark` | 5 each | 5 each | 5 each |
| content | `content-description-pixel-width` | 181 | 181 | 181 |
| content | `content-text-html-ratio` | 164 | 164 | 164 |
| content | `content-word-count` | 6 | 11 | 11 |
| content | `content-mime-type`, `content-duplicate-description`, `content-heading-hierarchy` | 5 each | 5 each | 5 each |
| social | `social-og-title`, `social-og-description`, `social-og-image`, `social-og-url`, `social-twitter-card` | 5 each | 5 each | 5 each |
| mobile | `mobile-horizontal-scroll` | 23 | 23 | 23 |
| mobile | `mobile-font-size` | 6 | 6 | 6 |
| i18n | `i18n-lang-attribute` | 5 | 5 | 5 |
| htmlval | `htmlval-size-limit` | 6 | 6 | 6 |
| htmlval | `htmlval-missing-doctype` | 5 | 5 | 5 |
| geo | `geo-schema-drift` | 54 | 54 | 54 |
| geo | `geo-semantic-html`, `geo-content-structure` | 5 each | 5 each | 5 each |

`content-word-count` fails on 5 more pages locally than on production because a local request carries no `cf-ipcountry`, so the country-specific parts of those pages render empty.

### What each one is, and its fix

**Fixed in this branch**

- `schema-article`, `schema-required-fields` (guides and help articles, all locales): the `Article` JSON-LD had no `datePublished`. `article()` now requires it. Guides take it from `GUIDES_PUBLISHED` in `lib/site.ts`: the date of the first commit that added the guide, or the page's own checked date when that is earlier. Help articles take `HELP_PUBLISHED`. A test keeps any guide's `datePublished` from landing after its `dateModified`.
- `schema-product` (`/pricing`, all locales): every `Offer` now has `availability: InStock`.

**Not fixed: a crawler false positive**

- 34 rules on the five `/templates/*.csv` downloads (every `core-*` title, description, canonical, viewport, favicon and h1 rule, `technical-*`, `schema-present`, `a11y-main-landmark`, `content-mime-type`, `content-duplicate-description`, `content-heading-hierarchy`, every `social-*`, `i18n-lang-attribute`, `htmlval-missing-doctype`, `geo-semantic-html`, `geo-content-structure`, and 5 of the 6 `content-word-count` fails). These are CSV spreadsheets served as `text/csv`. SEOmator's non-HTML filter skips `.pdf` and images but not `.csv`, and it ignores Content-Type, so it scores a spreadsheet as a web page. `technical-bad-content-type` and `content-mime-type` say this outright. The fix belongs in SEOmator.
- `perf-lazy-above-fold` (60 pages) and `perf-lcp-hints` (`/brand`): the rule calls the first three `<img>` in DOM order "above the fold". On these pages those are the store badges further down the page, lazy on purpose. The real hero images are not lazy.
- `core-canonical-to-homepage` (`/download`): `/download` is a `noindex` device router that answers with a 302 picked from the visitor's user agent, by default to the home page. The crawler followed it and read the home page's canonical. Intended.

**Not fixed: needs a decision (see follow-ups)**

- `security-csp-xss` (every page): the CSP has no `script-src`. A useful one needs nonces from the server render plus allowances for the scripts Cloudflare injects (challenge platform) and PostHog. Getting it wrong blanks the site, so it needs testing on the real edge before it ships.
- `perf-dom-size`, `perf-page-weight`, `htmlval-size-limit`, `mobile-font-size` (home pages, and `/download`, which redirects to the home page): about 761 KB of HTML and 5,154 DOM nodes, mostly the real app UI drawn as code (about 316 KB of inline SVG and 240 KB of `style` attributes). The small type and the overflow are inside the scaled phone replica. Shrinking it changes the signed-off home page.
- `mobile-horizontal-scroll` (23 pages): the rule reads fixed widths from markup: `width` attributes on screenshots (880 to 1200 px, which the stylesheet caps with `max-width: 100%`) and the 428 px phone frame around the app replicas. It does not account for stylesheet caps or the scale on the frame. I did not check for real sideways scroll on a phone, so treat it as unconfirmed rather than a pass.
- `content-text-html-ratio` (164 pages): the same inline app UI, plus a JSON-LD graph on every page. Only cutting markup or adding copy moves it.
- `content-description-pixel-width` (181 pages): meta descriptions wider than about 920 px, so Google truncates them. Fixing it means rewriting descriptions in five locales.
- `content-word-count` (`/de/guides`): 78 words. Needs German intro copy.
- `geo-schema-drift` (54 pages): the site-wide JSON-LD graph on every page names "Daniel Esteves" (`Person`) and describes the source code (`SoftwareSourceCode`) and the app (localized description). Neither string appears on pages without a byline or the home copy. Either a visible byline or a smaller graph on those pages fixes it.
- `a11y-link-text` (15 es/fr guides): source citations whose link text is a bare domain.
- `a11y-video-captions` (`/brand`): silent b-roll clips. Captions would be empty. Marking them decorative or adding a text track is a design call.

## Fixes that moved warns, not fails

- `perf-cache-policy` (255 warns to 0): HTML pages had no `Cache-Control`. Pages are drawn per visitor country (prices, logos, demo), so the server now sends `private, no-cache` on HTML unless a route sets its own policy. This also keeps any shared cache from serving one country's prices to another.
- `security-coop` (260 warns to 0): added `Cross-Origin-Opener-Policy: same-origin` to the security headers.
- `geo-llms-txt` (260 warns to 5): every page links `/llms.txt` with `rel="service-doc"`. The 5 left are the CSV files.
- `images-dimensions` (6 warns to 0): merchant logos on the home page get `width` and `height` attributes. Their inline style already set the size, so nothing moves.
- `links-external-valid` (2 warns to 0): a source link in the open-source guide pointed at a file that moved (`packages/money/src/money-manager/archive.ts`).
- `schema-required-fields` warns went up (111 to 255) because pages that failed for a missing required field now pass that check and warn about optional ones instead.
- `perf-page-weight` warns went up by one (34 to 35): `/guides/best-open-source-expense-tracker-apps` grew past 100 KB (102,544 bytes) from the added JSON-LD date.

Why some categories did not move: images and links each turned their last warns into passes, but a few warns out of about 3,600 and 6,800 checks do not change a rounded score. Security went from 68 to 69 only, because `security-csp-xss` still fails on every page and, locally, the HTTPS rules fail too.

## Follow-ups

**Design and product**

- Home page weight: about 761 KB of HTML from the app UI drawn as code. Behind `perf-dom-size`, `perf-page-weight`, `htmlval-size-limit`, `content-text-html-ratio`, `mobile-font-size` and part of `perf-unused-js`.
- Visible author byline on guides and blog posts, or drop `Person` from the graph on pages without one (`geo-schema-drift`, `eeat-author-byline` warns).
- Meta descriptions under about 920 px in all five locales (181 pages), plus the title and description length warns.
- WCAG AAA contrast on `.hz-lead`, `.hz-proof`, `.hz-plan-note` and `.hz-source-license` (`a11y-axe-other`).
- Table captions (`a11y-table-caption` warns), descriptive text for citation links, German copy for `/de/guides`, share buttons (`social-share-buttons`), breadcrumbs on top-level pages.

**DNS, Cloudflare and edge**

- A real `script-src` CSP: nonces in the server render, plus the Cloudflare challenge script and PostHog. Test on production before enforcing, or ship it as `Content-Security-Policy-Report-Only` first.
- HSTS `includeSubDomains` and `preload`: applies to every subdomain, and preload is hard to undo.

**Third party**

- Cloudflare's `/cdn-cgi/challenge-platform` script is served without a cache policy and shows up in `perf-unused-js`.
- SEOmator scores `.csv` downloads as HTML pages (34 rules on 5 URLs).

## How it was run

```sh
npm install -g --allow-scripts=better-sqlite3 @seomator/seo-audit   # 8.0.1
seomator audit https://tryoutlayr.com --format json --crawl -m 300 -o prod-crawl.json
seomator audit https://tryoutlayr.com/ --cwv --mobile --format json -o prod-cwv-mobile-en.json   # and /es, /pt, /fr, /de
seomator audit http://127.0.0.1:4317 --format json --crawl -m 300 -o local-main-crawl.json      # vp build of origin/main
seomator audit http://127.0.0.1:4318 --format json --crawl -m 300 -o local-branch-crawl.json    # vp build of this branch
```

The `.llm.xml` files are the same stored audits exported through `seomator serve` (`/api/audits/<id>/export?format=llm`). The JSON reports are gzipped because each one is about 50 MB. Files in this folder:

- `prod-crawl.json.gz`, `prod-crawl.llm.xml`: production crawl.
- `prod-cwv-mobile-{en,es,pt,fr,de}.json.gz`: production home pages with CWV, mobile.
- `local-main-crawl.json.gz`, `local-main-crawl.llm.xml`: local build of `main`.
- `local-branch-crawl.json.gz`, `local-branch-crawl.llm.xml`: local build of this branch.

## Appendix: every URL each failing rule hits on production

Paths are grouped by locale: `/guides/x (en, es)` means `/guides/x` and `/es/guides/x`.

### `core-canonical-to-homepage` (1)

`/download`

### `core-title-present` (5)

`/templates/expense-tracker-template.csv`, `/templates/modele-budget-mensuel.csv`, `/templates/planilha-controle-financeiro.csv`, `/templates/plantilla-control-de-gastos.csv`, `/templates/vorlage-haushaltsbuch.csv`

### `core-title-length` (5)

`/templates/expense-tracker-template.csv`, `/templates/modele-budget-mensuel.csv`, `/templates/planilha-controle-financeiro.csv`, `/templates/plantilla-control-de-gastos.csv`, `/templates/vorlage-haushaltsbuch.csv`

### `core-description-present` (5)

`/templates/expense-tracker-template.csv`, `/templates/modele-budget-mensuel.csv`, `/templates/planilha-controle-financeiro.csv`, `/templates/plantilla-control-de-gastos.csv`, `/templates/vorlage-haushaltsbuch.csv`

### `core-canonical-present` (5)

`/templates/expense-tracker-template.csv`, `/templates/modele-budget-mensuel.csv`, `/templates/planilha-controle-financeiro.csv`, `/templates/plantilla-control-de-gastos.csv`, `/templates/vorlage-haushaltsbuch.csv`

### `core-viewport-present` (5)

`/templates/expense-tracker-template.csv`, `/templates/modele-budget-mensuel.csv`, `/templates/planilha-controle-financeiro.csv`, `/templates/plantilla-control-de-gastos.csv`, `/templates/vorlage-haushaltsbuch.csv`

### `core-favicon-present` (5)

`/templates/expense-tracker-template.csv`, `/templates/modele-budget-mensuel.csv`, `/templates/planilha-controle-financeiro.csv`, `/templates/plantilla-control-de-gastos.csv`, `/templates/vorlage-haushaltsbuch.csv`

### `core-h1-present` (5)

`/templates/expense-tracker-template.csv`, `/templates/modele-budget-mensuel.csv`, `/templates/planilha-controle-financeiro.csv`, `/templates/plantilla-control-de-gastos.csv`, `/templates/vorlage-haushaltsbuch.csv`

### `core-h1-single` (5)

`/templates/expense-tracker-template.csv`, `/templates/modele-budget-mensuel.csv`, `/templates/planilha-controle-financeiro.csv`, `/templates/plantilla-control-de-gastos.csv`, `/templates/vorlage-haushaltsbuch.csv`

### `core-title-unique` (5)

`/templates/expense-tracker-template.csv`, `/templates/modele-budget-mensuel.csv`, `/templates/planilha-controle-financeiro.csv`, `/templates/plantilla-control-de-gastos.csv`, `/templates/vorlage-haushaltsbuch.csv`

### `technical-www-redirect` (5)

`/templates/expense-tracker-template.csv`, `/templates/modele-budget-mensuel.csv`, `/templates/planilha-controle-financeiro.csv`, `/templates/plantilla-control-de-gastos.csv`, `/templates/vorlage-haushaltsbuch.csv`

### `technical-bad-content-type` (5)

`/templates/expense-tracker-template.csv`, `/templates/modele-budget-mensuel.csv`, `/templates/planilha-controle-financeiro.csv`, `/templates/plantilla-control-de-gastos.csv`, `/templates/vorlage-haushaltsbuch.csv`

### `perf-dom-size` (6)

`/` (en, es, pt, fr, de), `/download`

### `perf-page-weight` (6)

`/` (en, es, pt, fr, de), `/download`

### `perf-lazy-above-fold` (60)

`/about` (en, es, pt, fr, de), `/brand` (en, es, pt, fr, de), `/compare` (en, es, pt, fr, de), `/guides` (en, es, pt, fr, de), `/guides/expense-tracker-template` (en, es, pt, fr, de), `/help` (en, es), `/tools` (en, es, pt, fr, de), `/tools/50-30-20-budget-calculator` (en, es, pt, fr, de), `/tools/dolar-bcv-hoy` (en, es), `/tools/dolar-hoy-argentina` (en, es), `/tools/dolar-hoy-bolivia` (en, es), `/tools/installment-calculator` (en, es, pt, fr, de), `/tools/loan-calculator` (en, es), `/tools/split-expenses-calculator` (en, es, pt, fr, de), `/tools/subscription-cost-calculator` (en, es, pt, fr, de)

### `perf-lcp-hints` (5)

`/brand` (en, es, pt, fr, de)

### `security-csp-xss` (260)

`/` (en, es, pt, fr, de), `/about` (en, es, pt, fr, de), `/blog` (en, es), `/blog/bank-texts-that-log-themselves` (en, es), `/blog/haiku-first-ai-suggestions` (en, es), `/blog/moving-a-react-native-app-to-effect` (en, es), `/blog/reading-bank-notifications-with-ai` (en, es), `/blog/the-home-page-is-the-real-app` (en, es), `/blog/two-currencies-and-30-captures-free` (en, es), `/blog/voice-entries-in-any-language` (en, es), `/blog/web-deploys-from-9-minutes-to-under-3` (en, es), `/blog/when-bs-could-mean-two-currencies` (en, es), `/brand` (en, es, pt, fr, de), `/compare` (en, es, pt, fr, de), `/compare/copilot` (en, es, pt, fr, de), `/compare/everydollar` (en, es, pt, fr, de), `/compare/fintonic` (en, es, pt, fr, de), `/compare/goodbudget` (en, es, pt, fr, de), `/compare/monarch` (en, es, pt, fr, de), `/compare/monefy` (en, es, pt, fr, de), `/compare/money-lover` (en, es, pt, fr, de), `/compare/pocketguard` (en, es, pt, fr, de), `/compare/rocket-money` (en, es, pt, fr, de), `/compare/spendee` (en, es, pt, fr, de), `/compare/wallet` (en, es, pt, fr, de), `/compare/ynab` (en, es, pt, fr, de), `/delete-account` (en, es, pt, fr, de), `/download`, `/guides` (en, es, pt, fr, de), `/guides/50-30-20-rule` (en, es), `/guides/ai-expense-tracker` (en, es), `/guides/apple-pay-expense-tracker` (en, es), `/guides/best-budget-apps` (en, es), `/guides/best-budget-apps-canada` (en, es, fr), `/guides/best-budget-apps-france` (en, es, fr), `/guides/best-expense-tracker-apps` (en, es), `/guides/best-expense-tracker-apps-brazil` (en, es, pt), `/guides/best-expense-tracker-apps-latin-america` (en, es), `/guides/best-multi-currency-budget-apps` (en, es), `/guides/best-open-source-expense-tracker-apps` (en, es), `/guides/best-subscription-tracker-apps` (en, es), `/guides/budget-app-without-bank-account` (en, es), `/guides/budget-categories` (en, es), `/guides/budget-planner` (en, es), `/guides/cancel-app-store-subscription` (en, es), `/guides/cancel-chatgpt-subscription` (en, es), `/guides/cancel-google-play-subscription` (en, es), `/guides/expense-tracker-template` (en, es, pt, fr, de), `/guides/expense-tracker-venezuela` (en, es), `/guides/how-much-do-budget-apps-cost` (en, es), `/guides/how-to-cancel-a-subscription` (en, es), `/guides/how-to-pay-cashea` (en, es), `/guides/how-to-track-expenses` (en, es), `/guides/mint-alternative` (en, es), `/guides/multi-currency-expense-tracker` (en, es), `/guides/receipt-scanner` (en, es), `/guides/subscription-tracker` (en, es), `/guides/track-money-sent-home` (en, es), `/guides/voice-expense-tracker` (en, es), `/guides/what-is-rocket-money` (en, es), `/guides/ynab-alternatives` (en, es), `/help` (en, es), `/help/can-i-track-expenses-in-several-currencies` (en, es), `/help/does-outlayr-link-my-bank` (en, es), `/help/how-do-i-add-an-expense-by-voice` (en, es), `/help/how-do-i-scan-a-receipt` (en, es), `/help/how-do-i-track-an-installment-purchase` (en, es), `/help/how-do-subscription-reminders-work` (en, es), `/help/how-does-apple-pay-logging-work` (en, es), `/open` (en, es, pt, fr, de), `/pricing` (en, es, pt, fr, de), `/privacy` (en, es, pt, fr, de), `/support` (en, es, pt, fr, de), `/templates/expense-tracker-template.csv`, `/templates/modele-budget-mensuel.csv`, `/templates/planilha-controle-financeiro.csv`, `/templates/plantilla-control-de-gastos.csv`, `/templates/vorlage-haushaltsbuch.csv`, `/terms` (en, es, pt, fr, de), `/tools` (en, es, pt, fr, de), `/tools/50-30-20-budget-calculator` (en, es, pt, fr, de), `/tools/dolar-bcv-hoy` (en, es), `/tools/dolar-hoy-argentina` (en, es), `/tools/dolar-hoy-bolivia` (en, es), `/tools/installment-calculator` (en, es, pt, fr, de), `/tools/loan-calculator` (en, es), `/tools/split-expenses-calculator` (en, es, pt, fr, de), `/tools/subscription-cost-calculator` (en, es, pt, fr, de)

### `schema-product` (5)

`/pricing` (en, es, pt, fr, de)

### `schema-required-fields` (144)

`/compare/copilot` (en, es, pt, fr, de), `/compare/everydollar` (en, es, pt, fr, de), `/compare/fintonic` (en, es, pt, fr, de), `/compare/goodbudget` (en, es, pt, fr, de), `/compare/monarch` (en, es, pt, fr, de), `/compare/monefy` (en, es, pt, fr, de), `/compare/money-lover` (en, es, pt, fr, de), `/compare/pocketguard` (en, es, pt, fr, de), `/compare/rocket-money` (en, es, pt, fr, de), `/compare/spendee` (en, es, pt, fr, de), `/compare/wallet` (en, es, pt, fr, de), `/compare/ynab` (en, es, pt, fr, de), `/guides/50-30-20-rule` (en, es), `/guides/ai-expense-tracker` (en, es), `/guides/apple-pay-expense-tracker` (en, es), `/guides/best-budget-apps` (en, es), `/guides/best-budget-apps-canada` (en, es, fr), `/guides/best-budget-apps-france` (en, es, fr), `/guides/best-expense-tracker-apps` (en, es), `/guides/best-expense-tracker-apps-brazil` (en, es, pt), `/guides/best-expense-tracker-apps-latin-america` (en, es), `/guides/best-multi-currency-budget-apps` (en, es), `/guides/best-open-source-expense-tracker-apps` (en, es), `/guides/best-subscription-tracker-apps` (en, es), `/guides/budget-app-without-bank-account` (en, es), `/guides/budget-categories` (en, es), `/guides/budget-planner` (en, es), `/guides/cancel-app-store-subscription` (en, es), `/guides/cancel-chatgpt-subscription` (en, es), `/guides/cancel-google-play-subscription` (en, es), `/guides/expense-tracker-template` (en, es, pt, fr, de), `/guides/expense-tracker-venezuela` (en, es), `/guides/how-much-do-budget-apps-cost` (en, es), `/guides/how-to-cancel-a-subscription` (en, es), `/guides/how-to-pay-cashea` (en, es), `/guides/how-to-track-expenses` (en, es), `/guides/mint-alternative` (en, es), `/guides/multi-currency-expense-tracker` (en, es), `/guides/receipt-scanner` (en, es), `/guides/subscription-tracker` (en, es), `/guides/track-money-sent-home` (en, es), `/guides/voice-expense-tracker` (en, es), `/guides/what-is-rocket-money` (en, es), `/guides/ynab-alternatives` (en, es), `/help/can-i-track-expenses-in-several-currencies` (en, es), `/help/does-outlayr-link-my-bank` (en, es), `/help/how-do-i-add-an-expense-by-voice` (en, es), `/help/how-do-i-scan-a-receipt` (en, es), `/help/how-do-i-track-an-installment-purchase` (en, es), `/help/how-do-subscription-reminders-work` (en, es), `/help/how-does-apple-pay-logging-work` (en, es)

### `schema-article` (84)

`/guides/50-30-20-rule` (en, es), `/guides/ai-expense-tracker` (en, es), `/guides/apple-pay-expense-tracker` (en, es), `/guides/best-budget-apps` (en, es), `/guides/best-budget-apps-canada` (en, es, fr), `/guides/best-budget-apps-france` (en, es, fr), `/guides/best-expense-tracker-apps` (en, es), `/guides/best-expense-tracker-apps-brazil` (en, es, pt), `/guides/best-expense-tracker-apps-latin-america` (en, es), `/guides/best-multi-currency-budget-apps` (en, es), `/guides/best-open-source-expense-tracker-apps` (en, es), `/guides/best-subscription-tracker-apps` (en, es), `/guides/budget-app-without-bank-account` (en, es), `/guides/budget-categories` (en, es), `/guides/budget-planner` (en, es), `/guides/cancel-app-store-subscription` (en, es), `/guides/cancel-chatgpt-subscription` (en, es), `/guides/cancel-google-play-subscription` (en, es), `/guides/expense-tracker-template` (en, es, pt, fr, de), `/guides/expense-tracker-venezuela` (en, es), `/guides/how-much-do-budget-apps-cost` (en, es), `/guides/how-to-cancel-a-subscription` (en, es), `/guides/how-to-pay-cashea` (en, es), `/guides/how-to-track-expenses` (en, es), `/guides/mint-alternative` (en, es), `/guides/multi-currency-expense-tracker` (en, es), `/guides/receipt-scanner` (en, es), `/guides/subscription-tracker` (en, es), `/guides/track-money-sent-home` (en, es), `/guides/voice-expense-tracker` (en, es), `/guides/what-is-rocket-money` (en, es), `/guides/ynab-alternatives` (en, es), `/help/can-i-track-expenses-in-several-currencies` (en, es), `/help/does-outlayr-link-my-bank` (en, es), `/help/how-do-i-add-an-expense-by-voice` (en, es), `/help/how-do-i-scan-a-receipt` (en, es), `/help/how-do-i-track-an-installment-purchase` (en, es), `/help/how-do-subscription-reminders-work` (en, es), `/help/how-does-apple-pay-logging-work` (en, es)

### `schema-present` (5)

`/templates/expense-tracker-template.csv`, `/templates/modele-budget-mensuel.csv`, `/templates/planilha-controle-financeiro.csv`, `/templates/plantilla-control-de-gastos.csv`, `/templates/vorlage-haushaltsbuch.csv`

### `a11y-link-text` (15)

`/guides/best-budget-apps` (en, es), `/guides/best-budget-apps-canada` (en, es, fr), `/guides/best-expense-tracker-apps` (en, es), `/guides/best-multi-currency-budget-apps` (en, es), `/guides/how-much-do-budget-apps-cost` (en, es), `/guides/mint-alternative` (en, es), `/guides/ynab-alternatives` (en, es)

### `a11y-video-captions` (5)

`/brand` (en, es, pt, fr, de)

### `a11y-main-landmark` (5)

`/templates/expense-tracker-template.csv`, `/templates/modele-budget-mensuel.csv`, `/templates/planilha-controle-financeiro.csv`, `/templates/plantilla-control-de-gastos.csv`, `/templates/vorlage-haushaltsbuch.csv`

### `content-text-html-ratio` (164)

`/` (en, es, pt, fr, de), `/blog` (en, es), `/blog/two-currencies-and-30-captures-free` (en, es), `/blog/web-deploys-from-9-minutes-to-under-3` (en, es), `/brand` (en, es, pt, fr, de), `/compare` (en, es, pt, fr, de), `/compare/copilot` (en, es, pt, fr, de), `/compare/everydollar` (en, es, pt, fr, de), `/compare/fintonic` (en, pt, fr, de), `/compare/goodbudget` (en, pt, de), `/compare/monarch` (en, es, pt, fr, de), `/compare/monefy` (en, es, pt, de), `/compare/money-lover` (en, es, pt, de), `/compare/pocketguard` (en, es, pt, fr, de), `/compare/rocket-money` (en, es, pt, fr, de), `/compare/spendee` (en, es, pt, fr, de), `/compare/wallet` (en, es, pt, fr, de), `/compare/ynab` (en, es, pt, fr, de), `/delete-account` (en, es, pt), `/download`, `/guides` (pt, fr, de), `/guides/50-30-20-rule`, `/guides/budget-planner`, `/guides/cancel-app-store-subscription` (en, es), `/guides/cancel-chatgpt-subscription` (en, es), `/guides/cancel-google-play-subscription` (en, es), `/guides/expense-tracker-template` (en, es, pt, fr, de), `/guides/how-much-do-budget-apps-cost` (en, es), `/guides/how-to-cancel-a-subscription` (en, es), `/guides/subscription-tracker` (en, es), `/guides/voice-expense-tracker` (en, es), `/help` (en, es), `/help/can-i-track-expenses-in-several-currencies` (en, es), `/help/does-outlayr-link-my-bank` (en, es), `/help/how-do-i-add-an-expense-by-voice` (en, es), `/help/how-do-i-scan-a-receipt` (en, es), `/help/how-do-i-track-an-installment-purchase` (en, es), `/help/how-do-subscription-reminders-work` (en, es), `/help/how-does-apple-pay-logging-work` (en, es), `/open` (en, es, pt, fr, de), `/pricing` (en, es, pt, fr, de), `/support` (en, es, pt), `/tools` (en, es, pt, fr, de), `/tools/50-30-20-budget-calculator` (en, es, pt, fr, de), `/tools/dolar-bcv-hoy` (en, es), `/tools/dolar-hoy-argentina` (en, es), `/tools/dolar-hoy-bolivia` (en, es), `/tools/installment-calculator` (en, pt, de), `/tools/loan-calculator` (en, es), `/tools/split-expenses-calculator` (en, es, pt, fr, de), `/tools/subscription-cost-calculator` (en, es, pt, fr, de)

### `content-description-pixel-width` (181)

`/` (en, es, pt, de), `/about` (en, es, pt, fr, de), `/blog/bank-texts-that-log-themselves` (en, es), `/blog/haiku-first-ai-suggestions` (es), `/blog/moving-a-react-native-app-to-effect` (en, es), `/blog/reading-bank-notifications-with-ai` (en, es), `/blog/the-home-page-is-the-real-app` (en, es), `/blog/two-currencies-and-30-captures-free` (en, es), `/blog/voice-entries-in-any-language` (en, es), `/blog/web-deploys-from-9-minutes-to-under-3` (es), `/brand` (fr, de), `/compare` (fr), `/compare/copilot` (es, pt, fr, de), `/compare/everydollar` (en, es, pt, fr, de), `/compare/fintonic` (en, es, pt, fr, de), `/compare/goodbudget` (en, es, pt, fr, de), `/compare/monarch` (en, es, pt, fr, de), `/compare/monefy` (en, es, pt, fr, de), `/compare/money-lover` (en, es, pt, fr, de), `/compare/pocketguard` (en, es, pt, fr, de), `/compare/rocket-money` (en, es, pt, fr, de), `/compare/spendee` (en, es, pt, fr, de), `/compare/wallet` (en, es, pt, fr, de), `/compare/ynab` (en, es, pt, fr, de), `/delete-account` (es, pt, fr, de), `/download`, `/guides/50-30-20-rule` (en, es), `/guides/apple-pay-expense-tracker` (en, es), `/guides/best-budget-apps` (en, es), `/guides/best-budget-apps-canada` (es, fr), `/guides/best-budget-apps-france` (en, es), `/guides/best-expense-tracker-apps` (en, es), `/guides/best-expense-tracker-apps-brazil` (en, es), `/guides/best-expense-tracker-apps-latin-america` (en, es), `/guides/best-multi-currency-budget-apps` (en, es), `/guides/best-open-source-expense-tracker-apps`, `/guides/budget-app-without-bank-account` (en, es), `/guides/budget-planner` (es), `/guides/cancel-app-store-subscription` (en, es), `/guides/cancel-google-play-subscription` (en, es), `/guides/expense-tracker-template` (en, es, de), `/guides/expense-tracker-venezuela` (en, es), `/guides/how-much-do-budget-apps-cost` (es), `/guides/how-to-cancel-a-subscription`, `/guides/how-to-pay-cashea` (en, es), `/guides/mint-alternative` (en, es), `/guides/multi-currency-expense-tracker` (en, es), `/guides/subscription-tracker` (en, es), `/guides/track-money-sent-home` (en, es), `/guides/voice-expense-tracker` (en, es), `/guides/what-is-rocket-money`, `/guides/ynab-alternatives`, `/help/can-i-track-expenses-in-several-currencies` (es), `/help/does-outlayr-link-my-bank` (en, es), `/help/how-do-i-track-an-installment-purchase` (en, es), `/help/how-do-subscription-reminders-work` (es), `/help/how-does-apple-pay-logging-work` (en, es), `/open` (fr, de), `/pricing` (es, pt, fr, de), `/privacy` (en, es, pt, fr, de), `/support` (es, fr, de), `/terms` (en, es, pt, fr, de), `/tools` (en, es, pt), `/tools/dolar-hoy-argentina` (es), `/tools/dolar-hoy-bolivia` (en, es), `/tools/installment-calculator` (en, es, pt, fr, de), `/tools/loan-calculator` (en, es), `/tools/split-expenses-calculator` (pt, fr), `/tools/subscription-cost-calculator` (fr, de)

### `content-word-count` (6)

`/guides` (de), `/templates/expense-tracker-template.csv`, `/templates/modele-budget-mensuel.csv`, `/templates/planilha-controle-financeiro.csv`, `/templates/plantilla-control-de-gastos.csv`, `/templates/vorlage-haushaltsbuch.csv`

### `content-mime-type` (5)

`/templates/expense-tracker-template.csv`, `/templates/modele-budget-mensuel.csv`, `/templates/planilha-controle-financeiro.csv`, `/templates/plantilla-control-de-gastos.csv`, `/templates/vorlage-haushaltsbuch.csv`

### `content-duplicate-description` (5)

`/templates/expense-tracker-template.csv`, `/templates/modele-budget-mensuel.csv`, `/templates/planilha-controle-financeiro.csv`, `/templates/plantilla-control-de-gastos.csv`, `/templates/vorlage-haushaltsbuch.csv`

### `content-heading-hierarchy` (5)

`/templates/expense-tracker-template.csv`, `/templates/modele-budget-mensuel.csv`, `/templates/planilha-controle-financeiro.csv`, `/templates/plantilla-control-de-gastos.csv`, `/templates/vorlage-haushaltsbuch.csv`

### `social-og-title` (5)

`/templates/expense-tracker-template.csv`, `/templates/modele-budget-mensuel.csv`, `/templates/planilha-controle-financeiro.csv`, `/templates/plantilla-control-de-gastos.csv`, `/templates/vorlage-haushaltsbuch.csv`

### `social-og-description` (5)

`/templates/expense-tracker-template.csv`, `/templates/modele-budget-mensuel.csv`, `/templates/planilha-controle-financeiro.csv`, `/templates/plantilla-control-de-gastos.csv`, `/templates/vorlage-haushaltsbuch.csv`

### `social-og-image` (5)

`/templates/expense-tracker-template.csv`, `/templates/modele-budget-mensuel.csv`, `/templates/planilha-controle-financeiro.csv`, `/templates/plantilla-control-de-gastos.csv`, `/templates/vorlage-haushaltsbuch.csv`

### `social-twitter-card` (5)

`/templates/expense-tracker-template.csv`, `/templates/modele-budget-mensuel.csv`, `/templates/planilha-controle-financeiro.csv`, `/templates/plantilla-control-de-gastos.csv`, `/templates/vorlage-haushaltsbuch.csv`

### `social-og-url` (5)

`/templates/expense-tracker-template.csv`, `/templates/modele-budget-mensuel.csv`, `/templates/planilha-controle-financeiro.csv`, `/templates/plantilla-control-de-gastos.csv`, `/templates/vorlage-haushaltsbuch.csv`

### `mobile-font-size` (6)

`/` (en, es, pt, fr, de), `/download`

### `mobile-horizontal-scroll` (23)

`/` (en, es, pt, fr, de), `/brand` (en, es, pt, fr, de), `/download`, `/guides/50-30-20-rule` (en, es), `/guides/apple-pay-expense-tracker` (en, es), `/guides/budget-categories` (en, es), `/guides/budget-planner` (en, es), `/guides/multi-currency-expense-tracker` (en, es), `/guides/subscription-tracker` (en, es)

### `i18n-lang-attribute` (5)

`/templates/expense-tracker-template.csv`, `/templates/modele-budget-mensuel.csv`, `/templates/planilha-controle-financeiro.csv`, `/templates/plantilla-control-de-gastos.csv`, `/templates/vorlage-haushaltsbuch.csv`

### `htmlval-size-limit` (6)

`/` (en, es, pt, fr, de), `/download`

### `htmlval-missing-doctype` (5)

`/templates/expense-tracker-template.csv`, `/templates/modele-budget-mensuel.csv`, `/templates/planilha-controle-financeiro.csv`, `/templates/plantilla-control-de-gastos.csv`, `/templates/vorlage-haushaltsbuch.csv`

### `geo-schema-drift` (54)

`/` (en, es, pt, fr, de), `/brand` (de), `/compare` (en, es, pt, fr, de), `/delete-account` (en, es, pt, fr, de), `/download`, `/guides` (en, es, pt, fr, de), `/help` (en, es), `/open` (en, es, pt, fr, de), `/pricing` (en, es, pt, fr, de), `/privacy` (en, es, pt, fr, de), `/support` (en, es, pt, fr, de), `/terms` (en, es, pt, fr, de), `/tools` (en, es, pt, fr, de)

### `geo-semantic-html` (5)

`/templates/expense-tracker-template.csv`, `/templates/modele-budget-mensuel.csv`, `/templates/planilha-controle-financeiro.csv`, `/templates/plantilla-control-de-gastos.csv`, `/templates/vorlage-haushaltsbuch.csv`

### `geo-content-structure` (5)

`/templates/expense-tracker-template.csv`, `/templates/modele-budget-mensuel.csv`, `/templates/planilha-controle-financeiro.csv`, `/templates/plantilla-control-de-gastos.csv`, `/templates/vorlage-haushaltsbuch.csv`

