# Guest purchases

On mobile, Pro can be bought or restored signed out. The paywall creates a Better Auth anonymous user (a guest) first, and RevenueCat bills that id. Signing in later moves the purchase to the account.

## Model

- The app treats a guest as signed out: `useAuthSession().accountId` is null, so sync, Notion, referrals and account settings stay off. `billingId` (the account id, or the guest id) is what RevenueCat and the paywall follow. `useAiGate()` opens receipt scan, voice entry and plan scan to a guest with Pro, and background merchant suggestions run for it too.
- `lib/convex.ts` keeps `cloudSession` as `"account" | "guest" | null`. AI transports only need a session; anything that writes account data asks `isCloudAccount()`.
- The Convex provider is keyed by `accountId`, not `billingId`. A guest made mid-checkout keeps the paywall mounted; sign-in and sign-out still remount the tree.
- On the backend, `optionalUserId` and `requireUserId` refuse a guest, so nothing that stores account data accepts one. RevenueCat, the enrichment queue, capture lookup and AI use `optionalBillingId` / `liveIdentity`, which accept it; `insertJob` and the AI gate then require Pro for a guest. Stripe checkout refuses guests. Guest sign-ins share a global limiter.

## Hand-off

1. The user signs in or verifies an email. Better Auth's anonymous plugin runs `onLinkAccount`, which runs `guests.retire`: it erases the guest's upstream RevenueCat customer and PostHog person, purges the mirror, usage counters, voice threads and anything else keyed to the guest, and the plugin deletes the user. RevenueCat only queues a customer delete, so `retire` repeats with backoff capped at 6 hours, for 20 attempts (about three days), until a DELETE answers 404. After that it retries once a day and a PostHog alert emails Daniel; see [the runbook](../operations/guest-retirement.md). Each pass purges the mirror again, and one more purge runs 3 hours after the 404, past RevenueCat's webhook retries, since the TRANSFER webhook from the device's sync can recreate the guest there.
2. The device logs RevenueCat in to the account, then calls `syncPurchasesForResult`. Once RevenueCat has deleted the guest, no other customer holds the receipt, so it should follow the account under either transfer setting; neither path has been tried with a store sandbox purchase yet, and the Test Store can't try it (see Traps). If the sync runs first, the default setting still transfers it; under "keep with original" the sync finds no Pro and the claim retries on later foregrounds and launches until the delete lands.

`revenuecat-service` writes a claim marker to AsyncStorage once a guest holds Pro. The first sign-in after it binds the marker to that account before RevenueCat logs in, and the marker is cleared only when the sync reports Pro. A claim RevenueCat wasn't ready for retries with backoff for about an hour while the account stays signed in, and a failed login or a kill mid hand-off retries on the next launch or foreground, and a later sign-in to a different account never runs the sync.

## Analytics

The device never identifies as the guest. Its events, `purchase_started` and `purchase_finished` included, stay on the install's anonymous PostHog ID, and `usePostHogIdentity` calls `identify(accountId)` on sign-in, which merges that ID into the account's person. A purchase made as a guest therefore lands in the account's funnels once that install signs in with Share analytics on, as the privacy policy promises ("once you sign in, these events are linked to your Outlayr account ID"). Signed in while it was off, the SDK sends no `$identify` and the purchase stays anonymous. A guest purchase is a `purchase_finished` with `outcome = pro` and `$is_identified = false`; a later `$identify` counts sign-ins, not successful claims, and restores send no event.

The PostHog person `retire` erases is the guest id itself, which only server-side AI records carry (when Share analytics is on). Signing in on another install doesn't join the purchase by itself.

## Traps

- **Never `identify` or `alias` the guest id on the device.** If the guest id ever resolves to the install's or the account's person, `retire`'s `bulk_delete` on that distinct id deletes that person and all its events. It would also break the policy's promise to delete the analytics linked to the anonymous account.

- **The Test Store can't test the hand-off.** On Android its billing wrapper keeps no purchase on the device, so the claim's sync has no receipt to send and the restore setting never applies. A guest's Test Store Pro is lost on sign-in: in a run against a local backend, `retire` got its 404 on the second pass about a minute after sign-in and purged the mirror, and the account stayed Free. Prove a transfer with an App Store or Play sandbox purchase.
- **The standalone `/delete-anonymous-user` endpoint is blocked** in the auth `before` hook. It would skip `guests.retire`, and the plugin's `disableDeleteAnonymousUser` option would also stop the delete on sign-in.
- **A failed Apple sign-in calls `signOut()`.** That ends the guest session too. The receipt stays with the store, so Restore brings Pro back on a new guest.
- **Restore as a guest on a device whose receipt belongs to an account** transfers it to the guest under RevenueCat's default setting. Signing in to that account moves it back.
- **A guest that never signs in stays.** Nothing sweeps abandoned guests; the privacy policy says it is kept until sign-in or a deletion request.
