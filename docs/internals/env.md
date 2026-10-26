# Environment variables

Native and web read build-time variables through varlock. `apps/native/.env.schema` and `apps/web/.env.schema` are the only list of what exists, with types and descriptions. Real values go in the git-ignored `.env` or `.env.local` next to the schema, or in the process environment, which wins over both. CI exports the GitHub environment's `vars` into the job environment before Metro or Vite runs.

## Traps

- `postinstall` runs `varlock codegen` for both apps and writes `src/env.ts`, which is git-ignored. A fresh clone type-checks only after `vp install`. Change a schema, then run `vp run env:generate`.
- The Babel and Vite plugins replace the expression `ENV.NAME` with the resolved literal. Destructuring `ENV`, indexing it by a string, or aliasing it leaves a runtime read of varlock's proxy, which is empty on a device. Always write `ENV.NAME`.
- Metro keys its transform cache on file content, not on env values. After changing a value, start Metro with `--clear` (`vp run dev` already does).
- Every native variable is `EXPO_PUBLIC_*`, so every one ships in the bundle. Do not mark one `@sensitive`: the plugin refuses to inline it and the read throws on a device.
- `app.config.ts` runs in the Expo CLI, outside Babel, so varlock does not reach it. It keeps reading build variables from `process.env`.
- Jest never runs the Babel plugin. `@/env` maps to `apps/native/jest/env-stub.js`, so suites run without any env.
- `readConvexUrl` in `apps/native/src/lib/cloud-configuration.ts` trims pasted tabs and newlines and rejects the `example.convex.*` placeholders with a message that names the host. Varlock's `url` type does neither.
