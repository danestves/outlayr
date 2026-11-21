# Email

Outlayr sends through `@opencoredev/email-sdk`. `lib/emailSetup.ts` reads `EMAIL_PROVIDER` and the provider variables, and `lib/sendEmail.ts` maps the chosen provider to one adapter. `log` writes each message, code included, to the Convex logs.

## Traps

- **Every send is a Node action.** The `mailDelivery` group is a `GroupSpec.makeNode()`. The SDK core imports `node:fs`, `node:os` and `node:crypto` through its telemetry module, so it cannot bundle for the default Convex runtime.
- **Codes never touch the scheduler.** `lib/betterAuth.ts` awaits `mailDelivery.send` through `runAction` from the auth HTTP action. Scheduling it would store the code in plaintext in `_scheduled_functions`.
- **Node handlers need the Convex config provider.** Effect's default provider copies `process.env` once per process, and Confect only installs `ConvexConfigProvider` on the default runtime, so every `mailDelivery` handler provides `ConvexConfigProvider.layer` itself.
- **Telemetry is off by hand.** Every client passes `telemetry: false`. The SDK's telemetry is on by default and posts to the SDK author's PostHog.
- **A half-set provider never falls back to `log`.** With `EMAIL_PROVIDER` unset, any variable of a provider selects it, and an incomplete one is `unconfigured`. Otherwise removing one Cloudflare variable would quietly put codes in the logs.
- **Policy notices refuse `log`.** `notifyPolicy` fails with `unconfigured` on `log`, because a notice that only reached a log has reached nobody.
- **Provider failures hide their status.** The SDK wraps them in `EmailRouteError`, whose `failures` hold the `EmailAdapterError` with the HTTP `status`.
- **Adding a provider touches two files.** Extend `EmailProviderName`, `REQUIRED_VARIABLES`, `credentials`, `SENDING_ORDER` and the `setups` and `touched` records in `lib/emailSetup.ts`, add the adapter to `adapterFor` in `lib/sendEmail.ts`, and pin the SDK exactly.
