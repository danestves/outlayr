---
name: policy-notice
description: Decide whether a change needs a policy email, an in-app notice, new consent, or nothing. Use before filing a PR or merging, before any deploy or /release, and whenever a diff touches apps/web/content/legal, POLICY_NOTICES, or what data Outlayr collects, sends, shares, or keeps, its plans, or its prices.
---

# Policy notice check

Report one verdict with its reason. This skill never sends anything. `notifyPolicy` reaches every account and can't be taken back, so it needs Daniel's explicit go-ahead for that send. Neither `/release` nor a merge approval counts.

This is an engineering checklist, not legal advice. When a case isn't clearly covered, the verdict is **ASK DANIEL**.

## What we promised

The Privacy Policy is stricter than the Terms, and the stricter promise wins:

- **Privacy, `## Changes`:** "Before a change takes effect, the app shows what changes, and if you have an account, we email you too."
- **Privacy, `### Emails we send`:** "Notice before this policy or our Terms of Use change."
- **Terms, `## Changes to these terms`:** a material change gets notice "in the app, on this website, or by email". On its own this would allow skipping email, but the Privacy Policy lines above don't.

So every substantive change to either document needs an email, sent before its effective date. Breaking a promise to announce changes is what the FTC called deceptive in Gateway Learning. If those lines are reworded, update this skill in the same PR.

## 1. Look at the change

Use the range being shipped: `origin/main...HEAD` for a PR, the commits `decide.sh` lists for a release.

```sh
git diff --name-only origin/main...HEAD -- apps/web/content/legal apps/web/src/lib/site.ts packages/backend/confect/legal.ts
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
| **DOCS MISSING** | Any question above is yes, but the documents don't say it yet. | Update privacy or terms in en and es, then check again. |
| **CONSENT, THEN EMAIL** | Data goes to a new third party or AI provider, or data already collected gets a materially different use. New features sending a new kind of data to an allowed AI provider: ask Daniel whether the existing permission covers it. | Ask in the app before the data flows, and don't apply the change to old data without that permission. Email alone isn't enough. Then follow **EMAIL**. |
| **ADVANCE NOTICE** | Pro loses something material (Terms: "in advance"), or Outlayr or Pro is shutting down (Terms: try for 30 days). | Tell Daniel the required lead time before scheduling. Then follow **EMAIL**. |
| **EMAIL** | Any other substantive change to privacy or terms, including one that favors people or fixes a wrong statement. | Add a `POLICY_NOTICES` entry and follow [the runbook](../../../docs/operations/policy-change.md). |
| **NOTHING** | Typos, formatting, or a translation fix with the same meaning, or no effect on either document. | Keep the effective date as it is. Say why in the PR's legal line. |

A store-managed price rise on an existing subscription is handled by the store, per Terms `### Price changes`. It still needs **EMAIL** if the Terms text changes.

## 3. Check the date

These traps come from how the notice code works:

- **The email must arrive before the effective date.** Date the notice the next UTC day after the email at the earliest, because `effectiveAtMs` is UTC midnight and Caracas evenings are already the next day in UTC. Use a later date when **ADVANCE NOTICE** applies. A notice dated today is already late. If the send can't finish in time, ask Daniel before anything goes out, and move the date if nothing has.
- **A date freezes once it's emailed.** Emails dedupe on `<document>:<effectiveAtMs>`, and the sheet compares dates. Anything added to a sent notice misses everyone already emailed and everyone who tapped Got it, so it needs a new date.
- **Only the latest day gets emailed.** `notifyPolicy` sends only notices with the newest `effectiveAtMs`. Dating a newer notice first means an unsent older one never goes out, so send it first or move its changes into the newer one.
- **Two changes close together share one date.** To avoid two emails in a row, merge them under the same future date, before that date is emailed.
- **The sheet doesn't replace the email.** It reaches people only when they open a recent app. People who don't open the app, or run a version older than the sheet, only hear by email.
- **All the dates match.** The effective date in en and es, `LEGAL_DAYS`, and `effectiveAtMs`.

Whether a date has been emailed isn't in the repo. It's in `mailState.notices` on production, so ask Daniel unless he has given you production access.

Keep the email to the change itself. The account emails have no unsubscribe link because they aren't marketing, so never add feature promotion.

## 4. Report

Add this to the PR description, or to your message when there's no PR:

```
Policy notice: <VERDICT>. <One-line reason>.
Effective <date>. Email: <not needed | needs Daniel's go-ahead, send before <date>>.
```

After a merge or deploy with a pending email, repeat it in your final message. Otherwise the email gets forgotten once the PR is closed.
