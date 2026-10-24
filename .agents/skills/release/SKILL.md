---
name: release
description: Release what main has merged since the last release on a channel, choosing an OTA update (xprem, from GitHub Actions), a new store build (rnd on GitHub Actions, then TestFlight or Google Play), or a backend-only deploy.
argument-hint: preview|production [ios|android]
arguments: [channel, platform]
disable-model-invocation: true
---

# Release main to `$channel`

Running `/release preview` or `/release production`, with `android` after it for Android, is the go-ahead. Decide, dispatch, wait, verify, and report without asking again. The only exceptions are the stops this file names.

If the channel above isn't exactly `preview` or `production`, ask which one and stop. The build profile, update channel, and GitHub environment share that name, so one word selects all three, including the Convex deployment that receives the functions.

The platform is `$platform`. Empty means `ios`. If it's neither `ios` nor `android`, ask which one and stop. The runtime fingerprint is per platform, so each platform gets its own verdict; to ship both, run the skill once per platform. Both stores have production users, so a change both platforms show needs both runs.

## 1. Check out main

The fingerprint hashes the local checkout, and every workflow runs `main` on GitHub, so it has to be a clean `origin/main`:

```sh
git status --porcelain            # must be empty; never stash other work to get there, stop and ask
git switch --detach origin/main && vp i
```

## 2. Decide

```sh
.agents/skills/release/decide.sh $channel $platform
```

The script is read-only. It prints:

- the newest finished store build on the channel
- the last OTA on that build's runtime
- every commit merged since the later of the two
- the app and backend files those commits touched
- the fingerprint check against the build
- for a build, its version and the commits that set it
- a verdict, with the exact command to run

| Verdict | Action |
| --- | --- |
| `NOTHING TO SHIP` | Report and stop. If the fingerprint differs, say that the next app change will need a build. |
| `BACKEND ONLY` | Dispatch `deploy-backend.yml`. The app bundle doesn't import `packages/backend`, so there's nothing to publish. |
| `OTA` | Write the message (step 3), then dispatch `update.yml` with the build's version it prints. |
| `BUILD` | Dispatch `eas-build.yml` with the command it prints, which carries the version, then ship the binary (step 4). The printed fingerprint diff names the native source that forced it. |
| `FIRST BUILD` | **Stop and ask.** No GitHub store build exists on this channel, so this binary would move testers onto a different backend, and every earlier EAS build stops receiving OTAs from this one on. Run `gh variable get EXPO_PUBLIC_CONVEX_URL --env $channel` and name the backend the binary would call. Check the setup below. |

Before dispatching, read the commit list against the verdict. The file classification is a heuristic, but the fingerprint check is not. On Android it relies on a patched `@expo/fingerprint` that sees the Expo modules; `decide.sh` exits if the fingerprint lists none, and that is a stop to report, never one to work around. If a commit contradicts the verdict, for example a user-visible change that the path rules missed, stop and explain instead of dispatching.

### Version

Both platforms and both channels share one version line, so a version names the same changes in either store. The run names carry each build's version; runs without one shipped 1.0.0. `decide.sh` picks the build's version in this order:

1. While this platform's newest version isn't live, the build keeps it. On iOS that's until App Store Connect approves it (TestFlight, in review, or pulled from review all keep it). On Android it's until a build of it is on the production track; the internal track keeps it.
2. Once it's live, the build takes the newest version on any store build if this platform hasn't built it yet and adds no app change of its own since. That's Android catching up to an iOS 1.2.4.
3. Otherwise it bumps from that newest version, by the conventional commits that touched this platform's app since its own build of it: `feat!` or `fix!` is major, `feat` is minor, anything else is patch. `refactor!` and `chore!` break code, not the app, so they don't count.

Step 1 asks `asc` and `play.ts status`, so a build verdict needs both logged in. If either fails, `decide.sh` exits rather than guess.

A platform can skip numbers, for example Android going from 1.2.3 to 1.2.5. Neither store cares. A major is a **stop and ask**: name the commits that made it, because the app may not have changed enough to deserve one.

Before an `OTA` or `BUILD`, run `node --import tsx scripts/licenses.ts --check` from `apps/native`. If it reports the open source licenses list as stale, **stop and ask**: a dependency change shipped without regenerating it, and the fix is a PR, not an edit on detached main.

## 3. Message

The in-app What's new sheet shows `message` verbatim, split on `\n`:

- One line per change a user would notice, written in their words: "Typing in the transaction form no longer stutters".
- No bullet marks, semicolons, or em dashes. English only.
- Leave out chores, tests, refactors, backend-only work, and changes only the other platform shows.

Store notes cover the same changes, once in English and once in Spanish, as plain text with a little personality:

- One short line on what the release is about, a blank line, then one `•` line per change.
- Lead with what the person gets, or the question they'd ask: "Owe the plumber for today's job? Log it and pick when you'll pay".
- No emoji, semicolons, or em dashes.
- Play: a production Android build, at most 500 characters each. `play.ts notes` replaces them while the release is in review.
- App Store: the version's What's New, for en-US and es-MX, set before that version goes to review. Apple refuses it on a first version. The App Store version has to carry the build's version: create it with `asc versions create` when a build starts a new one.

  ```sh
  asc apps info edit --app 6801652978 --version <version> --platform IOS --locale en-US --whats-new "$(cat notes-en.txt)"
  asc apps info edit --app 6801652978 --version <version> --platform IOS --locale es-MX --whats-new "$(cat notes-es.txt)"
  ```

## 4. Dispatch and wait

From `apps/native`, run the command the verdict printed (with the message filled in for an OTA) in a background shell. Every verdict dispatches a GitHub run, which `gh workflow run` prints the URL of; watch it to the end:

```sh
gh workflow run update.yml -f channel=$channel -f platform=ios -f version=1.2.4 -f message=$'First change\nSecond change'
gh run watch <run id> --exit-status
```

A `BUILD` dispatches `.github/workflows/eas-build.yml` on `main`, which deploys Convex and then builds. The command names the ref because the checkout is detached; `rnd build` would dispatch the local branch name, `HEAD`, and GitHub rejects it. Watch the run like an OTA, then ship it:

```sh
gh run download <run id> -n application-archive -D build   # the .ipa or .aab
rnd() { npx -y -p @react-native-feel/deploy@0.3.0 rnd "$@"; }
# iOS only: upload to App Store Connect and add it to TestFlight's Internal group.
# The submit profile carries only App Store Connect details, so it serves both channels.
rnd submit -p ios --profile production --path build/<name>.ipa --groups Internal
```

rnd can't submit to Play, so Android uploads with `play.ts`. Preview lands on the internal track, rolled out to testers. Production goes to Google's review and then to every user:

```sh
node ../../.agents/skills/release/play.ts upload build/<name>.aab preview
node ../../.agents/skills/release/play.ts upload build/<name>.aab production "$(cat notes-en.txt)" "$(cat notes-es.txt)"
node ../../.agents/skills/release/play.ts notes "$(cat notes-en.txt)" "$(cat notes-es.txt)"   # replace them later
```

Rough durations: backend about 3 minutes, OTA about 5, a store build about 35 including the backend. If a run fails, read `gh run view <runId> --log-failed`, and on iOS the `xcode-logs` artifact. Report the failing step and don't retry blindly.

## 5. Verify and report

- **OTA**: the Publish step logs the new update's id per platform. Ask xprem what the build gets. `<build runtime>` is the full `hash` in the build run's `fingerprint` artifact, whose first 8 characters `decide.sh` printed:

  ```sh
  curl -s https://ota.hephaestus.sh/manifest -H 'expo-protocol-version: 1' -H 'expo-app-id: f076a9e9-ec12-464d-85eb-772c4d0efce5' \
    -H "expo-channel-name: $channel" -H "expo-platform: $platform" -H "expo-runtime-version: <build runtime>" | grep -o '"id":"[^"]*"' | head -1
  ```

  It must print that id. Anything else means the update landed on a runtime no build has and reached nobody.
- **Build**: the run's `fingerprint` artifact holds the runtime OTAs target from now on; `decide.sh` reads it. On iOS, `rnd submit:status -p ios` lists the new TestFlight build. On Android, `play.ts status` lists the new versionCode on its track.
- **Backend**: a `SUCCESS` run is the check.

Report the verdict, the commits it shipped, the run id, the version, the update group or build number, and the runtime.

## Build setup

Before a `FIRST BUILD`, confirm each of these exists and name any that don't:

- rnd is logged in on this machine: `EAS_GITHUB_TOKEN=$(gh auth token) rnd login`, then `rnd whoami`.
- The repository secrets listed at the top of `.github/workflows/eas-build.yml`: `gh secret list`. `rnd credentials` reports which signing ones the repo holds.
- `asc auth status` shows an App Store Connect key, for iOS submits.
- `~/.config/outlayr/play-publisher.json` holds the play-publisher service account key, for Android uploads; `play.ts status` proves it works. Play Console grants it production releases.
- The `production` and `preview` GitHub environments: `gh variable list --env $channel` and `gh secret list --env $channel`. The Convex deploy key is an environment secret; everything the app reads is a variable.
- `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` among those variables, for Android. The workflow checks it before it deploys.

## Traps

- Never run `eoas publish` from the laptop. Only the workflow sets `EAS_BUILD_PROFILE` and exports the GitHub environment, so a local publish lands under a runtime no binary has, or bundles the wrong backend URL.
- Never deploy Convex from the laptop. The workflows take the target from the GitHub environment, and a local `.env.local` doesn't.
- Compare against the last build, never the last OTA. An OTA inherits its build's runtime.
- An OTA replaces the app's `Constants.expoConfig`, version included, so `update.yml` needs its build's version. Without it, Settings and the review prompt see whatever `app.config.ts` falls back to.
- An OTA reaches only builds with the same runtime. Devices on older builds keep their JS.
- The file lists skip what only the other platform builds from: `.android.` siblings on iOS, `app-intents/` and `targets/` on Android. The fingerprint doesn't, so an App Intents change can make Android's fingerprint differ with nothing to ship.
- The runtime can change with no native edit: `apps/native/package.json` scripts are hashed, and adding any workspace package can re-hash pnpm peer directories. The fingerprint catches both, the file list doesn't.
- `app.config.ts` reads environment variables, so they're part of the fingerprint. `decide.sh` loads the channel's GitHub variables and skips the local `.env`, which holds development values.
