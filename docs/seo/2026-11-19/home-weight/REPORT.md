# Home page weight, 2026-11-19

Follow-up to [the SEO audit](../REPORT.md): what the home page downloads, what this change cut, and what still weighs. Sizes are kB (1000 bytes).

## How it was measured

- **SEOmator 8.0.1**, the audit the first report used: `seomator audit <url>/ --cwv --mobile --format json -o <file>`. Raw output: `before-prod-cwv-mobile.json.gz` (live site), `before-local-cwv-mobile.json.gz` (`main` built locally), `after-local-cwv-mobile.json.gz` (this branch built locally).
- **Payload by type**: a Playwright script (below) that loads the page as a Pixel 7 or at 1440 × 900, waits for network idle, then scrolls the whole page so the lazy images and the dusk scene load too. It logs every response's bytes over the wire and decoded. Raw output: `network-{live,main,branch}-{mobile,desktop}.json.gz`. `load:` rows are the first load, `scroll:` rows came in while scrolling.
- Local builds: `vp build` in `apps/site`, then `node .output/server/index.mjs`, the command production runs. They have no PostHog token, so PostHog and Cloudflare's scripts never load there; the live rows include both.
- talos was swapping under other worktrees' builds while the branch was measured (load average 40 to 80). SEOmator's timings (TTFB, LCP, response time) are noise on that run and are not compared. Byte counts are not affected.

<details>
<summary>weigh.mjs</summary>

```js
// node weigh.mjs <url> <mobile|desktop> <out.json>, with SEOMATOR_DIR set to seomator's install dir (for its Playwright)
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
const require = createRequire(process.env.SEOMATOR_DIR + "/package.json");
const { chromium, devices } = require("playwright");
const [url, mode = "mobile", out] = process.argv.slice(2);
const browser = await chromium.launch();
const ctx = await browser.newContext(mode === "mobile" ? devices["Pixel 7"] : { viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const rows = [];
let phase = "load";
page.on("requestfinished", async (req) => {
  const res = await req.response();
  if (!res) return;
  const sizes = await req.sizes().catch(() => null);
  let decoded = 0;
  try { decoded = (await res.body()).length; } catch {}
  rows.push({ phase, url: req.url(), type: req.resourceType(), ctype: res.headers()["content-type"] ?? "", encoding: res.headers()["content-encoding"] ?? "", transfer: sizes?.responseBodySize ?? 0, decoded });
});
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
phase = "scroll";
const h = await page.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < h; y += 400) { await page.evaluate((v) => window.scrollTo(0, v), y); await page.waitForTimeout(60); }
await page.waitForLoadState("networkidle");
await page.waitForTimeout(1500);
const dom = await page.evaluate(() => document.getElementsByTagName("*").length);
await browser.close();
const kind = (r) => ({ document: "html", script: "js", stylesheet: "css", font: "font", image: "image" })[r.type] ?? "other";
const sum = {};
for (const r of rows) { const k = `${r.phase}:${kind(r)}`; sum[k] ??= { n: 0, transfer: 0, decoded: 0 }; sum[k].n++; sum[k].transfer += r.transfer; sum[k].decoded += r.decoded; }
writeFileSync(out, JSON.stringify({ url, mode, dom, sum, rows }, null, 1));
```

</details>

## Payload, Pixel 7, whole page scrolled

Over the wire / decoded, with the file count.

| | Live (before) | `main`, local | Branch, local |
| --- | --- | --- | --- |
| Total | **1,144** / 2,862 | **2,158** / 2,158 | **1,342** / 1,984 |
| HTML | 66 / 782 (1) | 780 / 780 (1) | 780 / 780 (1) |
| JS | 498 / 1,361 (40) | 674 / 674 (31) | 204 / 675 (31) |
| CSS | 44 / 198 (4) | 198 / 198 (4) | 34 / 198 (4) |
| Fonts | 115 / 113 (4) | 113 / 113 (4) | 113 / 113 (4) |
| Images | 418 / 408 (23) | 392 / 392 (22) | 211 / 218 (22) |
| DOM nodes | 5,245 | 5,246 | 5,246 |

Desktop (1440 × 900) differs by under 10 kB in every column: live 1,152, `main` 2,162, branch 1,346.

Live HTML is small over the wire because Cloudflare compresses it (zstd). The local server sends HTML uncompressed in both builds, so the 780 there is not what a visitor downloads.

### Biggest files

| File | Live | Branch |
| --- | --- | --- |
| Ori sprite sheet, `voice-light-*.webp` | 340.6 | 165.6 |
| posthog-js, `module-*.js` | 108.4 gzip | not loaded locally |
| Entry chunk, `index-*.js` | 100.9 gzip | 80.7 br |
| HTML | 66.3 zstd (781.9 raw) | 780.1 raw |
| `posthog-recorder.js` | 68.0 | not loaded locally |
| Nunito, latin variable | 39.5 | 39.1 |
| Effect, `Schema-*.js` | 34.5 gzip | 29.3 br |
| Geist, latin variable | 29.8 | 29.4 |
| `link-*.js` | 23.9 gzip | 20.4 br |
| Geist Mono | 23.5 | 23.1 |
| `_-_locale_-*.js` | 22.5 gzip | 18.5 br |
| Cloudflare `main.js` | 22.4 | not loaded locally |
| Instrument Serif | 21.8 | 21.0 |
| `index-*.css` | 21.3 gzip | 16.5 br |

## What changed

1. **Ori sprite sheet, 340 → 166 kB (light) and 379 → 183 kB (dark).** The site showed the native sheets, an 8 × 6 grid of 384 px cells. It draws 21 of the 48 cells (0, 3, 19, 22 to 39). The site now has its own copy in `app-ui/ori/` with the other 27 cells transparent, same grid and cell size, re-encoded as WebP quality 90 (about 50 dB PSNR against the original on the cells shown). The largest a cell renders is 294 device px (iPhone 15 Pro Max), so smaller cells would have cut little and were not used. `docs/internals/site-app-replicas.md` says how to add a cell.
2. **Brotli and gzip copies of every static asset**, `compressPublicAssets` in the Nitro config. The node server picks `.br` or `.gz` from `Accept-Encoding` and keeps the immutable cache header. JS 674 → 204 kB and CSS 198 → 34 kB over the wire locally. Live already got gzip from Cloudflare, so there the gain is gzip → brotli, about 15 to 20 % per file (table above), if Cloudflare passes the origin's brotli through.

Tried and dropped: starting PostHog after the load event when idle. On the live site posthog-js is already requested 160 to 170 ms after the load event (two runs, Pixel 7, with PostHog and Cloudflare requests aborted), so the change moved nothing. The measured branch build still had it; it was inert there because local builds have no PostHog token.

## SEOmator, mobile with `--cwv`

| | Live (before) | `main`, local | Branch, local |
| --- | --- | --- | --- |
| Overall | 94 | 89 | 89 |
| Performance | 80 | 79 | 80 |

The only rule that changed between `main` and the branch: `perf-asset-compression`, warn (24 uncompressed text assets) → pass. `perf-text-compression` and `perf-brotli` still warn locally because they look at the HTML, which Cloudflare compresses in production. The live run scores higher overall than either local run because a local server fails the HTTPS, HTTP/2 and HSTS rules, and its canonical, hreflang and sitemap URLs point at tryoutlayr.com instead of `127.0.0.1`.

## What still weighs, and why

- **HTML, 780 kB raw, 5,246 DOM nodes** (`perf-page-weight` and `perf-dom-size` fail). Most of it is the app replicas: about 317 kB of inline SVG and 242 kB of `style` attributes, pixel-matched to iOS (see `docs/internals/site-app-replicas.md`). Trimming that markup risks the fidelity the replicas exist for, and even an aggressive dedupe would leave about 430 kB, still over the 300 kB fail line. Over the wire it is 66 kB.
- **posthog-js, 108 kB gzip, plus the recorder, 68 kB.** Loaded from `packages/shared` analytics, after the load event already. It is most of `perf-unused-js` on live (355 KiB fail live, 233 KiB warn locally without it).
- **Effect `Schema`, 29 kB br**, in the entry chunk through `__root.tsx` and the shared analytics module.
- **Fonts, 113 kB.** Three faces are preloaded and all three set text on the first screen; each is already a latin variable subset with `font-display: swap`.
- `perf-lcp-hints` and `perf-lazy-above-fold` warn about the App Store badge and a hero logo. The real LCP element is the headline text (about 380 ms locally), and the lazy logo sits below the fold on phones.

## Follow-ups (need Daniel)

- After deploy, check that Cloudflare forwards the origin's `content-encoding: br` for `/assets/*` instead of re-encoding as gzip. That is a Cloudflare setting, not in this change.
- `/cdn-cgi/challenge-platform/.../precursor` has no cache policy (`perf-asset-cache-policy`). Cloudflare serves it.
- Replica markup is the only way under 300 kB of HTML. A design call: fewer replicas above the fold, or simpler ones.
- Effect `Schema` and floating-ui (from panelui-web, used by the header) in the entry chunk. Moving them out touches `packages/shared`, outside this change.
- Starting PostHog on first interaction instead of after load would take it out of the audit's window. A product call: visitors who never interact would go uncounted.
- Safari and iOS were not tested here (no WebKit on talos). The change does not touch the dusk scene's CSS or JS.
