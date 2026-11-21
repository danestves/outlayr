# Stuck guest retirement

`guests.retire` erases a guest's RevenueCat customer and PostHog person when the guest signs in (see [guest purchases](../internals/guest-purchases.md)). It backs off for 20 attempts, about three days. If an erase still fails after that, it keeps retrying once a day and sends one `guest_retirement_stuck` event from `outlayr-backend`. The PostHog alert **Guest retirement stuck** (hourly, on the insight [Stuck guest retirements](https://us.posthog.com/project/560285/insights/3jBS6sSO)) emails Daniel. Production keeps no Convex log history, so this alert is the only signal.

The event carries only which erase is failing: `customer: false` is RevenueCat, `analytics: false` is PostHog. The guest ID stays on our servers, in the pending `guests:retire` job, because the privacy policy promises that a signed-in guest's analytics are deleted.

## Fix the cause

Three days of failures is not a blip.

- RevenueCat: check `REVENUECAT_SECRET_KEY` still works, and whether the customer still shows in the RevenueCat dashboard. A delete that never answers 404 means RevenueCat never processed it.
- PostHog: check `POSTHOG_PERSONAL_API_KEY` can still delete persons in project `POSTHOG_PROJECT_ID`. Personal keys can expire or lose scopes.

Once the cause is fixed, the next daily attempt finishes the job. Nothing else needs doing.

## Finish it now

The dashboard's Schedules page lists the pending `guests:retire` job with its `guestId` and `attempt`. To skip the wait, run it with that `guestId`. It only deletes, so a duplicate run does no harm. Get the admin key from Daniel as a file and run it from a scratch directory, as in [policy-change.md](./policy-change.md), because `packages/backend` picks up the local `.env.local`:

```sh
CONVEX_SELF_HOSTED_URL=https://api.tryoutlayr.com CONVEX_SELF_HOSTED_ADMIN_KEY="$(cat <key file>)" \
  <repo>/packages/backend/node_modules/.bin/convex run guests:retire '{"guestId": "<guestId>"}'
```

A run without `attempt` starts the backoff over and alerts again if it gets stuck. Cancel the old daily job on the Schedules page once a run succeeds, or leave it: its next pass finds nothing left and stops.
