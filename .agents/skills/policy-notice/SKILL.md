---
name: policy-notice
description: Decide whether a change needs a policy email, an in-app notice, new consent, or nothing. Use before filing a PR or merging, before any deploy or /release, and whenever a diff touches apps/site/content/legal, POLICY_NOTICES, or what data Outlayr collects, sends, shares, or keeps, its plans, or its prices.
---

# Policy notice check

Report one verdict with its reason. This skill never sends anything. `notifyPolicy` reaches every account and can't be taken back, so it needs Daniel's explicit go-ahead for that send. Neither `/release` nor a merge approval counts.

This is an engineering checklist, not legal advice. When a case isn't clearly covered, the verdict is **ASK DANIEL**.

## What we promised

From 1 January 2027, Privacy `## Changes` and Terms `## Changes to these terms` promise:

- **Notice:** a change to what we already collect, who receives it, how we use it, how long we keep it, or people's rights and obligations gets at least 30 days' notice in the app and by email. Privacy also caps these emails at one a month, unless a change can't wait.
- **New optional features:** described in the policy from the day they ship, explained in the app on first use, and listed in the next email.
- **A different use of existing data:** ask in the app first.
- **Can't wait:** a security problem or a legal requirement can have shorter notice.
- **Corrections:** a fix to a wrong statement applies right away and is listed in the next email.

Until then, the 9 November 2026 wording applies: every material change, meaning anything affecting those same things, needs an email before its effective date. Hold such changes for the December email where you can. Breaking a promise to announce changes is what the FTC called deceptive in Gateway Learning. If those lines are reworded, update this skill in the same PR.

## 1. Look at the change

Use the range being shipped: `origin/main...HEAD` for a PR, the commits `decide.sh` lists for a release.

```sh
git diff --name-only origin/main...HEAD -- apps/site/content/legal apps/site/src/lib/site.ts packages/backend/confect/legal.ts
git diff origin/main...HEAD --stat
```

Read the diff even if no legal file changed. A missing policy edit is the failure this check exists to catch. Ask:

- Do we collect, send, share, or infer anything new, or send it to a new recipient?
- Does existing data get a new use, a longer retention, or become visible to other people?
- Did a provider, the operator, a legal basis, or how people exercise their rights change?
- Did an existing statement turn out to be wrong?
- Do plans, limits, AI behavior, invites, liability, or disputes change?

## 2. Pick the verdict

Take the first row that matches:

| Verdict | When | Do |
| --- | --- | --- |
| **ASK DANIEL** | The change could alter the operator, sell or transfer data, or reach someone under the age limit, or you can't tell which row fits. | Stop before merging and name the question. |
| **DOCS MISSING** | Any question above is yes, but the documents don't say it yet. | Update privacy or terms in en, es, fr and pt, then check again. |
| **CONSENT, THEN EMAIL** | Data goes to a new third party or AI provider, or data already collected gets a materially different use. New features sending a new kind of data to an allowed AI provider: ask Daniel whether the existing permission covers it. | Ask in the app before the data flows, and don't apply the change to old data without that permission. Email alone isn't enough. Then follow **EMAIL**. |
| **ADVANCE NOTICE** | Pro loses something material (Terms: "in advance"), or Outlayr or Pro is shutting down (Terms: try for 30 days). | Tell Daniel the required lead time before scheduling. Then follow **EMAIL**. |
| **EMAIL** | Any other change that needs notice under the promises above. | Add a `POLICY_NOTICES` entry to the next monthly email, dated at least 30 days after it, and follow [the runbook](../../../docs/operations/policy-change.md). |
| **NEXT EMAIL** | From 1 January 2027: a new optional feature, or a fix to a wrong statement. A serious correction goes to **ASK DANIEL**. | Update the documents and `LEGAL_DAYS` now, and add it to the next monthly email. Don't send one for it alone. |
| **SITE ONLY** | A change with a new effective date that isn't material, such as clearer wording that changes no practice, or a better free plan. If in doubt, it's **EMAIL**. | Update the date in the documents and `LEGAL_DAYS`, with no `POLICY_NOTICES` entry. |
| **NOTHING** | Typos, formatting, or a translation fix with the same meaning, or no effect on either document. | Keep the effective date as it is. Say why in the PR's legal line. |

A store-managed price rise on an existing subscription is handled by the store, per Terms `### Price changes`. It still needs **EMAIL** if the Terms text changes.

## 3. Check the date

These traps come from how the notice code works:

- **The email must arrive at least 30 days before the effective date.** `effectiveAtMs` is UTC midnight, and Caracas evenings are already the next day in UTC, so count from the UTC day of the send. A shorter gap needs Daniel's go-ahead and a reason that can't wait. If the send can't finish in time, ask Daniel before anything goes out, and move the date if nothing has.
- **One email a month.** Check `mailState.notices` or ask Daniel when the last one went out. A second email inside a month needs a reason that can't wait.
- **A date freezes once it's emailed.** Emails dedupe on `<document>:<effectiveAtMs>`, and the sheet compares dates. Anything added to a sent notice misses everyone already emailed and everyone who tapped Got it, so it needs a new date.
- **Only the latest day gets emailed.** `notifyPolicy` sends only notices with the newest `effectiveAtMs`. Dating a newer notice first means an unsent older one never goes out, so send it first or move its changes into the newer one.
- **Bump `postedAtMs` with every change.** A new install skips notices posted before it, because it signs up under the version already on the site. Set it to the UTC midnight after the change ships; a stale one hides the change from everyone who installed since.
- **Changes in the same month share one date.** Merge them under the same future date, before that date is emailed.
- **The sheet doesn't replace the email.** It reaches people only when they open a recent app. People who don't open the app, or run a version older than the sheet, only hear by email.
- **All the dates match.** The effective date in en, es, fr and pt, `LEGAL_DAYS`, and `effectiveAtMs`.

Whether a date has been emailed isn't in the repo. It's in `mailState.notices` on production, so ask Daniel unless he has given you production access.

Keep the email to the change itself. The account emails have no unsubscribe link because they aren't marketing, so never add feature promotion.

## 4. Report

Add this to the PR description, or to your message when there's no PR:

```
Policy notice: <VERDICT>. <One-line reason>.
Effective <date>. Email: <not needed | needs Daniel's go-ahead, send before <date>>.
```

After a merge or deploy with a pending email, repeat it in your final message. Otherwise the email gets forgotten once the PR is closed.
