# Web billing

Web Pro is sold through Stripe Checkout with Stripe Managed Payments as merchant of record, and RevenueCat's Stripe integration grants the `pro` entitlement. RevenueCat Web Billing cannot do this: it allows one price per currency, and 73 regions pay different USD amounts.

## How a purchase flows

1. The paywall posts the plan to `POST /billing/checkout` on the Convex site. That route takes the country from Cloudflare's `cf-ipcountry`, so a caller cannot choose a price. `billing.createCheckout` is internal for the same reason.
2. Convex finds or creates the Stripe customer by `metadata.app_user_id`, looks the price up by lookup key and returns a Checkout URL.
3. Stripe returns to `/app?checkout=<session>`. `billing.confirmCheckout` checks the session belongs to the caller, posts it to RevenueCat's `POST /v1/receipts` and mirrors the subscriber.
4. Renewals and cancellations reach RevenueCat from Stripe, and Convex through the RevenueCat webhook.

## The catalog

`packages/money/src/pro-prices.ts` is the only price table. Each distinct plan, currency and amount is one Stripe price, lookup key `pro_<plan>_<currency>_<minor units>`, tax inclusive, and one RevenueCat product attached to `pro`.

RevenueCat keys Stripe products by price id. A purchase on a price it has no product for, including `price_data` at checkout, is recorded but grants nothing. So every price change needs the script, before the table change ships:

```sh
cd packages/backend
STRIPE_SECRET_KEY=... REVENUECAT_V2_SECRET_KEY=... REVENUECAT_PROJECT_ID=proj4796fe85 REVENUECAT_STRIPE_APP_ID=... \
  node scripts/stripe-catalog.ts
```

It is idempotent. A live key also needs `--live`. The RevenueCat key needs write on Products and Entitlements.

US Stripe accounts cannot charge GHS, IQD or JOD, so Ghana, Iraq and Jordan pay in USD: their local tier converted at the 8 November 2026 rate. Adaptive Pricing does not cover them, so they see USD with no Stripe conversion fee, though their card issuer may charge its own. Managed Payments takes no tax liability for Iraq or Jordan, so any indirect tax there stays with us. It also refuses buyers in its restricted countries, Russia and China among them.

## Environments

| | Sandbox | Live |
|---|---|---|
| Stripe account | `acct_1UZajI6VQIlEIn29` | `acct_1UZaGc5mqHV6IxIj` |
| RevenueCat app, project `proj4796fe85` | `app0bee759e68` | `app66679adc15` |

Stripe test mode does not support Managed Payments; use the sandbox. Sandbox events go to the `Convex | Staging` webhook, not production. Test with a throwaway user and delete the RevenueCat customer afterwards.

Convex needs `STRIPE_SECRET_KEY` and `REVENUECAT_STRIPE_PUBLIC_KEY`, plus the existing `REVENUECAT_SECRET_KEY`.

## Going live

1. Run the script with the live key and `--live`.
2. In the live Stripe config in RevenueCat, turn on Use Managed Payments, Track new purchases from server notifications with metadata key `app_user_id`, and set the Subscription management URL to the Stripe portal link. Without tracking, a buyer who closes the tab before returning stays locked until Restore.
3. Live events reach Convex through the `Convex | Production (Stripe)` webhook, scoped to the Stripe app. RevenueCat refuses two webhooks with one URL, so it adds `?app=stripe`.
4. Set the two Convex variables on production.
5. In Stripe, set the support email, which is where refund requests escalate, and add the Terms and Privacy links in Checkout settings. A refund request left unanswered for 48 hours can be refunded by Stripe without us.
6. Merge the legal changes and send the [policy email](./policy-change.md) before their effective date.

## Traps

- Managed Payments forces Adaptive Pricing. A buyer whose location differs from the session currency sees a local price with a 4% conversion fee, and can switch back.
- Prices must set `tax_behavior=inclusive`. The default adds tax on top of the amount shown.
- A Stripe cancellation can take two hours to reach RevenueCat. Re-posting the receipt updates it at once, which `billing.plan` does for Stripe subscribers, so the plan page is current after the portal.
- Customers are found through Stripe's search API, which can lag about a minute behind a new customer.
