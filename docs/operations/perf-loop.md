# Measuring render work

Perf changes to `apps/native` ship with a before/after table from the perf emulator. The table
comes from React's own profiler while a replayed Argent flow drives the app, on a fixed ledger,
so two builds are compared on the same taps and the same data.

## The pieces

- **Ledger.** `apps/native/scripts/perf/seed-ledger.ts` grows an archive exported from the app
  into about 3,000 entries over 540 days, spread over the template's accounts, with some foreign
  currency and income. It is seeded, so the same template gives the same rows; only the dates
  move with the day it runs. Restore it through Settings › Restore data.
- **Device.** An Android emulator with the dev build, the restored ledger, and a saved emulator
  snapshot (`perf-seeded`) on the Log tab. Each run loads the snapshot, so every run starts from
  the same disk.
- **Flows.** `apps/native/scripts/perf/flows/perf-*.yaml` are Argent flows that replay a path
  through the app:
  - `perf-log-scroll`: eight screens down the Log and back.
  - `perf-add-entry`: Budgets and back, then a new 12.50 entry through the form.
  - `perf-hide-amounts`: the Log's eye button six times, one `appMeta` setting write per tap.
    It shows which components re-render on a settings write.
  - `perf-search`: Search, then "carrefour" one key per step, one result list per keystroke.
  - `perf-accounts`: Settings, then the Accounts list. It only mounts the screen; it does not
    write while Accounts is open.
  - `perf-insights`: Insights on Year, then the Healthcare category (250 entries on the seed).
  - `perf-category-step`: the entry form's Category step, which mounts every category pill.
  - `perf-currency-search`: the entry form's currency picker, then "euro" in its search.
  - `perf-log-deep-write`: a 12.50 entry dated yesterday, after its setup flings 90 times down
    the Log. It shows what one write costs with over a year of the ledger loaded. The date must be
    a day the ledger already has, which holds the day after seeding.
  - `perf-log-page-deep`: 15 flings that load older days a few times, after its setup flings 45
    times, about six months down the Log. Profiling more flings than that times out reading the
    profile.
- **Script.** `apps/native/scripts/perf/measure.ts` runs the flow under the profiler, alternating
  two Metro servers (main and the change), and prints medians.

## Running it

1. Serve main on one Metro port and the change on another, each from its own checkout, against
   the same dev build. From each checkout's `apps/native`, build the dictionaries first, since
   the bundle reads them:

   ```sh
   vp exec intlayer build
   CI=1 vp exec expo start --dev-client --port 8090   # main
   CI=1 vp exec expo start --dev-client --port 8091   # the change
   ```

2. With the perf emulator booted and nothing else on the host, from `apps/native`:

   ```sh
   node --import tsx scripts/perf/measure.ts --flow perf-add-entry --base 8090 --pr 8091 --runs 3
   ```

Each run loads the snapshot, cold-starts the app on one port (a reload keeps dead debugger
sockets after a snapshot load), waits for the Log and ten more seconds for startup to settle, then
starts the profiler and replays the flow. A `<flow>-setup.yaml` next to the flow replays before the
profiler starts, for setup too long to profile: the profile of 90 flings closes the debugger
connection when it is read. Without the wait, a late startup commit (session,
entitlement, ledger adoption) can land in the profile and read as a render the flow caused.
The app reaches Metro at the emulator's host address, `10.0.2.2`, not through `adb reverse`: the
emulator's adb connection can drop mid-flow, and the profiler's debugger would go with it. Right
after a snapshot load the guest network can still time out reaching the host, so an app that has
not attached within 45 seconds is launched again.

A failed run is retried, and each failure leaves a `failed-<side>-<time>.png` screenshot next to
`--out`. With `--out`, each run also keeps argent's render causes for every `--components` entry
(which commit, how long, and why), which is where to look when a component row moves.

## Reading the table

- **Component renders** counts every component render React committed during the flow. It moves
  with fixes that touch many components, but a fix aimed at one screen can hide inside its noise.
- **`<name>` renders in slow commits**, one row per `--components` entry, counts the times that
  component rendered in a commit over 16 ms or next to one; argent keeps only those commits. This
  is the row a targeted fix should move. A 0 can also mean the component only rendered in fast
  commits, so a drop to 0 is a render removed or a commit made fast; the profile tells which.
  Names are the profiler's, verbatim, e.g. `Forget(RootStack)` or
  `Forget(Log(./(tabs)/(transactions)/index.tsx))`; list them with
  `argent run profiler-commit-query --device_id <device> --port <port> --mode by_index --commit_index <n>`
  on a slow commit from the flow.
- **React commits** and **Commits over 16 ms** show whether the work also arrives in fewer or
  shorter frames.
- **Flow time** includes the emulator and the host, so it is noisy.
- **JS thread CPU** and **UI thread CPU** are the CPU time the app's JS thread (`mqt_v_js`) and
  main thread spent during the flow, read from `/proc` in 10 ms ticks. They count work, not
  waiting, so host load moves them less than flow time. Argent reads the screen through the UI
  thread, so most of that row is argent's own cost; the JS row has none of it.
- **Frames**, **Janky frames** and **Frame time p50** to **p99** are Android's frame stats for the
  app (`dumpsys gfxinfo`), counted from the flow's first step. They cover the UI thread and the
  render thread only, so React work on the JS thread shows in them only when it delays a mount.
  The percentiles come from Android's histogram (1 ms buckets up to 32 ms, 50 ms buckets past
  150 ms), so they move in steps.

Numbers are only comparable within one invocation. Run main against itself first (`--pr` set to
the base port) to see the noise on the day; a change inside that noise is not a win. One such run
of `perf-add-entry`, on a host under load from other builds:

| Metric | main | main | Change |
|---|---|---|---|
| React commits | 80 | 79 | -1.3% |
| Component renders | 14179 | 14235 | 0.4% |
| Commits over 16 ms | 33 | 42 | 27.3% |
| Flow time (ms) | 69619 | 115276 | 65.6% |

Renders and commits barely move with host load; commits over 16 ms and flow time follow it. Only
read the last two from a quiet host.

## Production mode

The table above comes from a dev bundle under React's profiler, which overstates React's own cost:
dev React checks more on every render, and the profiler walks every commit. `--prod` replays the
same flow on a production bundle, to confirm that a win is still there for users. It cannot count
renders: React's profiler needs the dev bundle's DevTools hook. Find and size a fix in the dev
table, then confirm it here before calling it a win a user feels.

1. Serve each side with a production bundle, on the same dev build and snapshot:

   ```sh
   CI=1 vp exec expo start --dev-client --no-dev --minify --port 8090   # main
   CI=1 vp exec expo start --dev-client --no-dev --minify --port 8091   # the change
   ```

2. Add `--prod`:

   ```sh
   node --import tsx scripts/perf/measure.ts --flow perf-hide-amounts --base 8090 --pr 8091 --runs 3 --prod
   ```

It stops if a Metro serves the other kind of bundle (both flags are needed), and refuses
`--components`. No debugger attaches. The table keeps flow time, here the flow's wall-clock time,
plus the CPU and frame rows. **JS thread CPU** is the row to read: it is the work React and the
app do, and argent's screen reads do not touch it. Hermes collects garbage partly on its own
threads, so a change that moves allocation costs more than this row shows.

Main against itself on `perf-hide-amounts`, on talos:

| Metric | main | main | Change |
|---|---|---|---|
| Flow time (ms) | 49875 | 40700 | -18.4% |
| JS thread CPU (ms) | 2460 | 2340 | -4.9% |
| UI thread CPU (ms) | 21690 | 17570 | -19.0% |
| Frame time p99 (ms) | 750 | 650 | -13.3% |

Only the JS row holds still there. #1096 (showing amounts no longer rebuilds every digit strip),
9216c25e against 4e45c026, in both modes on talos the same day:

| Metric | Dev | Production |
|---|---|---|
| Component renders | 4128 to 2841, -31.2% | n/a |
| JS thread CPU (ms) | 8440 to 6420, -23.9% | 2640 to 2380, -9.8% |

Production JS does a third of the dev bundle's work on this flow, and the win shrinks with it, from
2 s of JS to a quarter of a second: twice the noise. Read a production change under about 10% of
JS CPU on talos as unconfirmed.

Its limits:

- The APK is the debug build. Its React Native core is unoptimized C++ (10.6 MB of code against
  4.2 MB in the release library), so mounting and layout cost more than on a phone, on both sides.
  A release APK would fix that, at a native build like the dev APK's per native change (about 25
  minutes on talos, built alone) plus a JS bundle swapped into it per side and an install per run.
  It is not worth it on talos, where the emulator itself is the bigger distortion.
- On talos the emulator draws in software, so nearly every frame is janky and p50 sits near 80 ms;
  the frame rows mean more on an emulator with a GPU, like the Mac lane's. Flows also run two to
  three times slower than on the Mac lane, and `perf-insights` cannot run on main before #1098 at
  all: while its 250 rows mount, argent's screen reads time out.

## Setting up the emulator

Once per host. The flows expect two accounts, a monthly budget (Budgets shows its burn-down chart)
and a Transport category budget with rollover.

1. Build the dev APK for the host's native ABI (`x86_64` on Linux, `arm64-v8a` on Apple silicon).
   `android/` is generated, and the native build needs no `.env`. From `apps/native`:

   ```sh
   CI=1 vp install --frozen-lockfile
   vp exec expo prebuild -p android --no-install
   cd android && ./gradlew assembleDebug -PreactNativeArchitectures=<abi>
   ```

   Over a non-interactive ssh, set `ANDROID_HOME` and `JAVA_HOME` first.
2. Create an AVD on the same ABI: a Pixel 9 on the `android-36` Google Play image, with
   `hw.ramSize=3072` and `hw.keyboard=yes` in its `config.ini` (avdmanager defaults to 2 GB and
   no keyboard). Boot it detached, with an explicit gRPC port, or Argent cannot find it, and in the
   time zone the ledger is seeded in:
   `nohup emulator -avd <name> -port 5580 -grpc 8580 -grpc-use-token -no-window -no-audio -timezone <zone> &`.
3. Install the APK (`adb -s emulator-5580 install -g <apk>`) and open it on a Metro from step 1
   of Running it:
   `adb shell am start -a android.intent.action.VIEW -d "exp+outlayr://expo-development-client/?url=http%3A%2F%2F10.0.2.2%3A8090" com.tryoutlayr.app`.
   The first open shows the dev menu. Turn its Tools button off (at the bottom; it covers the
   form's Save button), then go back.
4. Turn off stylus handwriting, which garbles typed text:
   `adb shell settings put secure stylus_handwriting_enabled 0`.
5. Onboard with USD (the default), AI and reminders declined, and no account. Analytics is not
   part of onboarding; turn it off at Settings › Device › Share analytics.
6. Without a ledger yet, add a few expenses, a second account (Settings › Accounts), a monthly
   budget, and a Transport budget with rollover on. Export a full archive (Settings › Export
   data), copy it to the host with `adb pull`, and seed it in the emulator's time zone:
   `TZ=<zone> node --import tsx scripts/perf/seed-ledger.ts --from <archive> --out perf-ledger.json`.
   A second host restores the first host's `perf-ledger.json` instead, so both measure the same
   rows.
7. Push it and restore it from Settings › Restore data › Restore from an archive:
   `adb push perf-ledger.json /sdcard/Download/`. The file picker opens on Recent; the file is
   under Downloads.
8. Scroll every tab to the top (Budgets keeps its scroll position, and the flow waits for its
   burn-down chart), leave the app on the Log, and save the snapshot:
   `adb emu avd snapshot save perf-seeded`.

### An emulator on another machine

The emulator can run on a second machine. Run both Metros there too: copy both checkouts over
(rsync without `node_modules`, then `vp install`), start them as above, copy `measure.ts` and
`flows/`, and run `node measure.ts …` (node 24 strips the types, and the script imports only node
built-ins). `adb` and `argent` must be on that machine's PATH. Metro tunnelled from the host
(`ssh -R`) bundles fine, but `react-profiler-stop` can time out over it on a loaded host.
