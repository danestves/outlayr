# What EAS Build uploads

`/.easignore` decides which files reach the EAS builder. Read this before adding a line to it.

## It replaces `.gitignore`, it does not extend it

> "If you create a `.easignore` file, the EAS CLI prioritizes it over the `.gitignore` file."
> — [EAS docs](https://docs.expo.dev/build-reference/easignore/)

The moment that file exists, **every `.gitignore` in the repo stops applying to the upload**. So
`.easignore` restates all five of them — root, `apps/native`, `packages/backend`,
`apps/screenshots`, `apps/clips` — before it adds anything of its own.

This is the trap the file exists to survive. Appending one convenience line is safe; *starting* a
fresh short file is not. Deleting the restated block would upload `apps/native/ios` — 1.2 GB of
prebuild output — on every build.

Two anchoring details make the restatement non-mechanical:

- **Paths are relative to the repo root.** `apps/native/.gitignore` writes `/ios` meaning
  `apps/native/ios`; here it must be spelled in full.
- **A restatement that is merely incomplete costs upload size rather than failing.** The
  `apps/screenshots` block was missed for a while, so every build carried ~200 MB of `.next`
  and the 45 MB App Store `export/` directory. Nothing broke; the builds were just fat.
- **Tools write `.gitignore` files of their own.** The Convex CLI ignores `packages/backend/.convex/`
  from a `.gitignore` inside it, so that directory was missed too and uploaded the local
  deployment's database (~120 MB). `git ls-files --others --ignored --exclude-standard --directory`
  lists everything git hides, whichever file hides it.

## What it adds beyond the `.gitignore` set

Only prose and repo tooling: `docs/`, all `*.md`, `.github/`, `.claude/`,
`.vscode/`, `.vite-hooks/`. None of it is read by the Expo build.

## What must never be excluded

Load-bearing, and each verified against the current file:

- `apps/native/app-intents/` — the App Intents, compiled into the app target as inline modules. The
  widgets are declared in `app.config.ts`'s `expo-widgets` block and written in `apps/native/src/widgets/`
- `apps/native/plugins/` — config plugins
- `apps/native/modules/` — local Expo modules, including the subscriber that routes quick actions
  as links
- `apps/native/drizzle/` — `.sql` migrations; `metro.config.cjs` adds `sql` to `sourceExts` because
  the generated migration bundle imports them
- `apps/native/assets/`, `global.css`, `app.config.ts`, `metro.config.cjs`, `babel.config.js`
- `pnpm-workspace.yaml`, `pnpm-lock.yaml`, root `package.json`, `vite.config.ts`

`apps/native/uniwind-types.d.ts` is excluded deliberately: Metro regenerates it from
`withUniwindConfig({ dtsFile })`, and a stale copy is worse than none.

`apps/native/assets/fonts/*.otf` used to be excluded here, restating a `.gitignore` rule from when
the OTFs were not committed. They are committed now, and the stale exclusion meant every EAS build
shipped in the system face rather than SF Pro Rounded.

`apps/native/credentials/` and `credentials.json` are excluded pre-emptively. Neither exists today
and nothing sets `credentialsSource: "local"`; the rules are there so that turning local credentials
on later does not quietly put a p12 password in a build tarball.

`.npmrc` is kept for its Hugeicons registry mapping. The auth token is not in it and cannot be: pnpm
does not expand environment variables in registry credentials from a committed file. On the builder
the token arrives as the `NPM_CONFIG_USERCONFIG` file variable, which EAS materialises as a complete
user-level `.npmrc`. This cannot be done from `eas-build-pre-install` — pnpm reinstalls the
workspace before running any script, so that hook executes only after the install it would fix.

## Changing it

Verify against **git's own matcher**, not by reading the patterns. The check that was run: build a
scratch repo containing only the paths in question, copy `.easignore` to `.gitignore`, `git add -A`,
then assert every load-bearing path is tracked and every bulky one is not. Approximating gitignore
semantics by hand risks missing a directory-vs-contents distinction the matcher would have caught.

A wrong exclusion here fails on EAS, minutes into a queue, not locally.

Real EAS builds have now run against this file. The font exclusion above is what a real build caught
that the working-tree check could not: the patterns were self-consistent, but one of them was
describing a rule the repo no longer had.
