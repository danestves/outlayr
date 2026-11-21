---
name: verify
description: Prove an apps/native change works on a real device by replaying its feature from apps/native/src/features.ts and saving a screenshot. Use after a change that a user can see or touch, before filing its PR, and when asked to "verify", "prove it on device" or "attach proof".
---

# Verify

A passing suite proves the data layer, not the screen. Every feature a diff touches gets replayed on a device, and the PR carries the proof.

## The feature map

`apps/native/src/features.ts` lists what a user can reach: the words they use for it (`says`), the route it starts on (`link`, a typed expo-router `Href`, so a renamed route fails `check-types`), the steps, and what the run proves.

- Find the features your diff touches by route or by `says`.
- A feature your change adds or moves gets an entry, or an updated one, in the same PR.
- Steps target what a user sees: `label="..."` from the English copy in `src/content`, or a `testID` as `id="..."`. `see` waits for text to appear; that wait is the assertion.

## Run it

1. Get a device the way the repo's device rules say: in T3, `device_open` on the Simlock host, which returns an `agent-device` command bound to that device. Have the dev client running against your Metro first.
2. Replay the feature, passing the session flags from that command after `--`:

   ```sh
   cd apps/native && node --import tsx scripts/verify.ts <feature> -- --session <session> [--config <file>]
   ```

   It writes the replay script and `<feature>.png` under `$TMPDIR/outlayr-verify/<feature>/` and prints both paths.
3. On a divergence, agent-device prints the screen and ranked selector suggestions. Fix the app or the entry, not the wait.
4. Look at the screenshot before you claim anything. Then attach it to the PR with `gh pr edit <n> --attach <png>`.

Never close the app with `agent-device close`: it ends the lease.
