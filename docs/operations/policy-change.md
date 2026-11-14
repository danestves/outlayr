# Announcing a policy change

The `policy-notice` skill decides whether a change needs this. A change that needs notice reaches people three ways: the site, a sheet
in the app, and an email to every confirmed account, at most one email a month. The sheet and the email read the same
notice from `POLICY_NOTICES`, so a new notice needs no app release. App versions from before the
sheet show nothing until they update.

1. Edit the document in `apps/site/content/legal/` in en, es, fr and pt, including
   the effective date in its `description`, and set the same day in `LEGAL_DAYS` in
   `apps/site/src/lib/site.ts`.
2. Append a notice to `POLICY_NOTICES` in `packages/backend/confect/legal.ts`: the document,
   `effectiveAtMs` as UTC midnight of that day, and the changes in en, es, fr and pt, one short
   label each with an optional detail. Use a day at least 30 days after the email, because the documents promise that much notice. A change that can't wait may use less, with Daniel's go-ahead. If the PR waits, update the date before merging. Once a date has been emailed, new changes need a new date.
3. Merge, then run **Deploy the backend** for `production`. Once it is live, the app shows the
   sheet on its next launch to anyone who installed before that day, until they tap Got it.
4. With Daniel's go-ahead, email the account holders. Production is self-hosted, and `--prod` targets an empty cloud project. Get the admin key from Daniel as a file, so it stays out of shell history, then run this from a scratch directory whose `package.json` lists `convex`, because `packages/backend` picks up the local `.env.local`:

   ```sh
   CONVEX_SELF_HOSTED_URL=https://api.tryoutlayr.com CONVEX_SELF_HOSTED_ADMIN_KEY="$(cat <key file>)" \
     <repo>/packages/backend/node_modules/.bin/convex run mailDelivery:notifyPolicy '{}'
   ```

   It sends the notices with the latest `effectiveAtMs`: when both documents change that day, each
   account gets one email covering both. The app merges everything someone hasn't seen into one sheet. It sends 50 at a time and schedules the next page itself; the counts it prints cover the
   first page only. Running it again sends only what an account has not received, so a rerun
   retries the failures. Rerun only once no `notifyPolicy` is left under Schedules in the
   dashboard, or two runs can email the same account twice. Follow the rest in the Convex logs
   (`[mail] not sent`).
