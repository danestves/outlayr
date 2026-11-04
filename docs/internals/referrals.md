# Referrals

Give a friend a month of Pro, get one back. The backend is `packages/backend/confect/referrals*.ts`.

## Rules

- A friend redeems one code ever, from an account under 7 days old that has never had Pro. "Never had Pro" asks RevenueCat and the mirror both: the mirror only knows what webhooks and syncs brought it.
- The inviter's month lands on the friend's third UTC day with a new synced entry, each counted day at least 20 hours after the last. `sync.push` counts it, so it needs no client report. Days come from the server clock: an offset taken from the client could be faked to cover three local days in one moment.
- An inviter earns at most 12 months in any 365 days. Lifetime owners earn nothing.

## Traps

- **A grant takes an absolute end.** The v1 promotional endpoint takes `end_time_ms`; `duration` is deprecated. RevenueCat treats an end within 2 hours of the active grant's end as a duplicate. Every grant therefore sends the user's latest reserved end (`referralRewards.promoEndsAt`), so a retry, or two grants racing, ask for the same thing.
- **A grant does not defer a store charge.** A month earned while a paid plan runs is banked in `referralRewards.bankedMonths` and granted after the plan ends.
- **`onEntitlementDeactivated` misses natural expiry.** convex-revenuecat 0.3.2 fires it only for an entitlement the mirror still counted active before the event. When an EXPIRATION lands, its `expiresAtMs` has already passed. Banked months wait on `releaseBanked` instead, scheduled an hour after the plan's end; a renewed plan banks them again from the new end.
- **Deleting an account forgets its invites.** `purgeUserBatch` removes the code, the invites both ways and the banked months, and RevenueCat erases the customer. A new account from the same person counts as new. A friend's invite that already earned a month stays without their id or name, so it still counts toward the inviter's 12.
- **The daily sweep resends any reserved month the mirror does not show as covered.** To revoke a referral month from the RevenueCat dashboard, also clear that user's `referralRewards.promoEndsAt`, or the sweep grants it again.
