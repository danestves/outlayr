# Merchant logos

The app reads logos from `https://logos.tryoutlayr.com/merchants/<domain>`, a Worker in `apps/logos`. It serves only the `merchants/` folder of the `outlayr-files` bucket, because that bucket also holds users' private photos, so never turn on public access for the bucket.

A stored logo answers with an `ETag` and a 30 day `max-age`. A missing logo is looked up once, stored, and served from R2 from then on. Lookups try Google and DuckDuckGo, then the merchant's site, then Wikidata.

Deploy the Worker before shipping an app version that reads from it:

```sh
vp run --filter @outlayr/logos deploy
node apps/logos/scripts/seed.mjs
```

The seed asks for every merchant in `apps/native/src/domain/merchant-map.ts`.

## Replacing a logo

A lookup never overwrites an object, so a logo placed by hand stays. Overwrite it, then purge `https://logos.tryoutlayr.com/merchants/<domain>` from the Cloudflare cache so people get it before the 30 days run out:

```sh
vp dlx wrangler@4.152.0 r2 object put outlayr-files/merchants/<domain> --file logo.png --content-type image/png --remote
```

To remove a logo at a brand's request, delete the object the same way with `r2 object delete`, and purge the url. A removed domain can be looked up again, so store a replacement if it must not come back.
