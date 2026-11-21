# Email

Outlayr sends through `@opencoredev/email-sdk`. `lib/emailSetup.ts` reads `EMAIL_PROVIDER` and the provider variables, and `lib/sendEmail.ts` maps the chosen provider to one adapter. `log` writes each message, code included, to the Convex logs.

## Traps

- **Every send is a Node action.** The `mailDelivery` group is a `GroupSpec.makeNode()`. The SDK core imports `node:fs`, `node:os` and `node:crypto` through its telemetry module, so it cannot bundle for the default Convex runtime.
- **Codes arrive later.** `lib/betterAuth.ts` checks the setup, then schedules `mailDelivery.send`. The code travels in the scheduled function's arguments and waits in the scheduler, so sign-up returns before the email exists.
- **Telemetry is off by hand.** Every client passes `telemetry: false`. The SDK's telemetry is on by default and posts to the SDK author's PostHog.
- **Policy notices refuse `log`.** `notifyPolicy` fails with `unconfigured` on `log`, because a notice that only reached a log has reached nobody.
- **Provider failures hide their status.** The SDK wraps them in `EmailRouteError`, whose `failures` hold the `EmailAdapterError` with the HTTP `status`.
- **Adding a provider touches two files.** Extend `EmailProviderName`, `REQUIRED_VARIABLES`, `credentials`, `SENDING_ORDER` and `sendingSetups` in `lib/emailSetup.ts`, add the adapter to `adapterFor` in `lib/sendEmail.ts`, and pin the SDK exactly.
