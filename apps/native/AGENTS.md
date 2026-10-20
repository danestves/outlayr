# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v58.0.0/ before writing any code.

# The simulator is a URL

`vp run dev` serves the running simulator at `http://localhost:8081/.sim` — live
video plus touch, keyboard, and hardware buttons. Verify a visible change there
rather than describing what it should look like.

Never run `serve-sim --kill` while the dev server is up; it kills Metro. That
trap and the rest of the limits are in `docs/operations/simulator-preview.md`.

# How to verify a change

Run from `apps/native`, in this order. Stop at the first red step.

```sh
vp check                                 # lint + format, repo-wide
vp run check-types                       # intlayer build, then tsc --noEmit
node_modules/.bin/jest src/<area>        # the suites next to what you touched, ~22s for all of them
vp run --filter @outlayr/backend test    # only when packages/backend changed, ~1s
vp run bench:bundle                      # only when a dependency or import style changed, ~40s
node --import tsx scripts/licenses.ts    # only when a dependency changed, ~40s
```

`scripts/licenses.ts` rewrites `src/screens/settings/licenses.json`, the list
in Settings › About › Open source licenses, from what the release bundle
ships plus the spec-repo pods in `ios/Podfile.lock`. It is not a
`package.json` script because those are hashed into the runtime fingerprint.

`bench:bundle` attributes every bundled byte to its package. Metro ships a
barrel whole, so a new import from a big package shows up here first; keep a
`--out` baseline and pass it as `--baseline` to see the delta.

`jest` builds the intlayer dictionaries itself when `.intlayer/` is absent, so
a raw `jest` in a fresh worktree is safe. A hundred failing suites that all
die in `src/i18n/catalog.ts` means that guard was bypassed, not a regression.

For anything visible, take a screenshot on the simulator URL above after the
change and compare it against the one before. A passing suite proves the data
layer; it proves nothing about what the screen shows.
