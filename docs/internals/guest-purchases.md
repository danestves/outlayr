# Guest purchases

On mobile, Pro can be bought or restored signed out. The paywall creates a Better Auth anonymous user (a guest) first, and RevenueCat bills that id. Signing in later moves the purchase to the account.

## Model

- The app treats a guest as signed out: `useAuthSession().accountId` is null, so sync, Notion, referrals and account settings stay off. `billingId` (the account id, or the guest id) is what RevenueCat, the paywall and the Convex provider follow.
- `lib/convex.ts` keeps `cloudSession` as `"account" | "guest" | null`. AI transports only need a session; anything that writes account data asks `isCloudAccount()`.
- The Convex provider is keyed by `accountId`, not `billingId`. A guest made mid-checkout keeps the paywall mounted; sign-in and sign-out still remount the tree.
- The backend spots a guest with `isGuest(identity)`: Better Auth puts `isAnonymous` in the Convex token. AI opens to a guest only with Pro, and referral redeem refuses guests. Guest sign-ins share a global limiter.

## Hand-off

1. The user signs in or verifies an email. Better Auth's anonymous plugin runs `onLinkAccount`, which runs `guests.retire`: it erases the guest's upstream RevenueCat customer and PostHog person, then purges the mirror and anything else keyed to the guest, and the plugin deletes the user.
2. The device logs RevenueCat in to the account, then calls `syncPurchasesForResult`. With the guest customer gone, the receipt follows the account whatever the dashboard's transfer setting says.

`revenuecat-service` holds `guestHeld` across the null gap a provisional sign-in leaves between guest and account, so the claim runs once, on the account.

## Traps

- **`guestHeld` lives in memory.** An app killed mid hand-off skips the claim; Restore on the paywall recovers the purchase.
- **A failed Apple sign-in calls `signOut()`.** That ends the guest session too. The receipt stays with the store, so Restore brings Pro back on a new guest.
- **Restore as a guest on a device whose receipt belongs to an account** transfers it to the guest under RevenueCat's default setting. Signing in to that account moves it back.
- **A guest that never signs in stays.** Nothing sweeps abandoned guests; the privacy policy says it is kept until sign-in or a deletion request.
