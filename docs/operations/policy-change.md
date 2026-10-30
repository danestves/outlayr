# Announcing a policy change

A change to the Privacy Policy or the Terms of Use reaches people three ways: the site, a sheet
in the app, and an email to every confirmed account. The sheet and the email read the same
notice from `POLICY_NOTICES`, so the app needs no update.

1. Edit the document in `apps/web/content/legal/en` and `apps/web/content/legal/es`, including
   the effective date in its `description`, and set the same day in `LEGAL_DAYS` in
   `apps/web/src/lib/site.ts`.
2. Append a notice to `POLICY_NOTICES` in `packages/backend/confect/legal.ts`: the document,
   `effectiveAtMs` as UTC midnight of that day, and the changes in en, es, fr and pt, one short
   label each with an optional detail. Pick a day after the deploy, so the notice arrives first.
3. Merge, then run **Deploy the backend** for `production`. Once it is live, the app shows the
   sheet on its next launch to anyone who installed before that day, until they tap Got it.
4. Email the account holders, from `packages/backend`:

   ```sh
   vp exec convex run --prod mailDelivery:notifyPolicy '{"document":"privacy"}'
   ```

   It sends 50 at a time and schedules the next page itself; the counts it prints cover the
   first page only. Running it again sends only to accounts that have not received this notice,
   so a rerun retries the failures. Follow the rest in the Convex logs (`[mail] not sent`).
