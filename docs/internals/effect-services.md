# Effect services

How Effect code is written in Outlayr. `apps/native/src/data/local-database.ts` is the reference service; `src/contexts/local-data-context.ts` is the atom that puts it in front of React.

## Module shape

One module per service, in this order:

1. **Imports by subpath**: `effect/Effect`, `effect/reactivity/Atom`, `@effect/atom-react/Hooks`. Never `effect`, `effect/reactivity` or `@effect/atom-react`: each root re-exports its whole package (the reactivity root pulls in the HTTP and RPC atoms) and Metro ships all of it.
2. **Schemas and errors.** Enums are `Schema.Literals([...])` with the type taken from `typeof X.Type`.
3. **The tag**: `export class LocalDatabase extends Context.Service<LocalDatabase, { readonly open: ... }>()("outlayr/data/LocalDatabase") {}`, with the interface inline. Refer to its type as `LocalDatabase["Service"]`, not a separate `LocalDatabaseShape`.
4. **`make`**: an `Effect.gen` that reads its dependencies and returns `LocalDatabase.of({ ... })`.
5. **`layer`**: `Layer.effect(LocalDatabase, make)`.

## Dependencies come from the environment

`make` yields what it needs (`yield* OpenConnection`); it takes no parameters. A dependency with one production value and test doubles is a `Context.Reference` whose `defaultValue` is the production value, so the app layer provides nothing extra and a test provides `Layer.succeed(OpenConnection, fake)`.

Every registry test imports `src/lib/runtime.ts`, so nothing it imports may load a module jest cannot: `expo-widgets`, `expo-core-spotlight`, Skia through `lib/photo-storage`, or `expo-notifications`, which warns at import and throws under the Android project. Such a dependency is a `Context.Service` tag with no default, read inside the operation so it shows in its requirements (`SystemSurfaces` in `SystemSync.run`), and the mount module provides the live value (`data/background-work-mount.ts`).

## Platform seams

A native API that holds state or can fail is a service or a `Context.Reference` with the production value as its default, so a test swaps it through a layer.

- **App state.** `WatchAppState` in `src/lib/app-events.ts` is the one reference for the app's foreground and background changes. Services read it; nothing declares a second one. Components read the same state through `useAppActive()` and `useAppForeground()` in `src/lib/app-state.ts`, which sit on `useSyncExternalStore`. Foreground counts the transient `inactive` state (the app switcher, a system prompt); active does not.
- **Secure storage.** `SecureStorage` in `src/lib/secure-storage.ts` wraps `expo-secure-store` and fails with `SecureStorageError`, which carries the `operation` and the `key`. Code reaches it with `yield* SecureStorage`. Only the service imports `expo-secure-store`, which lint enforces. `src/lib/cloud-runtime.ts` is the exception: better-auth's storage adapter is a synchronous contract, so it keeps the synchronous `getItem` and `setItem`.
- A test fakes the native call by providing the reference: `Layer.succeed(SecureStoreDriver, fake)`.
- **Notifications.** `Reminders` in `src/lib/reminders.ts` (`reminders.android.ts` is its sibling) is a `Context.Reference` over `expo-notifications`, so the reminder passes `yield* Reminders` and a test runs them with `Effect.provideService(Reminders, fake)`. Its operations are sequential on purpose: the iOS queue races overlapping calls. A pass that must not overlap another takes a module-level `Semaphore.makeUnsafe(1)`.
- **Best-effort surfaces.** `SystemSurfaces` members (`publishWidgets`, `indexSpotlight`) are `Effect<void>`: each logs its own failure through `warnAndContinue` (`src/lib/warn-and-continue.ts`), so `SystemSync` only ever sees a defect. A step handed to `DailyReminderSync` or `DueReminderSync` still goes through `Effect.catchDefect`, since one synchronous throw in a generator would otherwise end the whole program.

- **Device and file calls are Effects.** `photo-storage`, `receipt-image`, `glow`, `data-transfer`, `file-preview`, `google-sign-in`, `apple-sign-in`, `pending-pick`, the `revenuecat.ts` driver and `device-data-stores` wrap their native promises in `Effect.tryPromise` and fail with a tagged error (`PhotoStorageError`, `TransferError`, `PurchasesError`, `DeviceStoreError`). `duringHandoff(effect)` in `src/lib/app-handoff.ts` marks the trip out for the app lock and clears it on every exit, including interruption. Hooks and screens `yield*` them inside a command or flow; `transfer-commands.ts` and `link-commands.ts` hold the few a screen starts directly.
- **A dependency a core takes from its caller is an Effect.** `LogoBackfillDeps.persist`, `LogoReplateDeps`, `ApplyDeps.persist` and `merchant-siblings-core`'s `persistLogo` return `Effect<_, unknown>` and the core maps the failure to its own error.
- **A fire-and-forget send keeps its lane in a `Semaphore`.** `sendEnrichmentQueue` forks the send detached, so the caller does not wait, and the module-level `Semaphore.makeUnsafe(1)` keeps sends in order.

## Operations

A reusable operation is `Effect.fn("LocalDatabase.open")(function* open() { ... })`, which names its span. Wrap a promise API in `Effect.tryPromise({ try, catch })` and a throwing sync one in `Effect.try`, with `catch` returning the module's typed error.

## Errors

- A `Schema.TaggedError` class. It stays `instanceof Error`, so it can sit where callers expect an `Error`.
- Structured attributes say what failed (`stage: "migrate"`), and the original error goes in `cause: Schema.Defect()`.
- `message` is built from the attributes, never from `cause`, so it reads the same for every failure of that kind; the driver's detail stays on `cause`. A screen that shows the underlying detail reads it from `cause` at the bridge, as `localDataState` does.
- Attributes and log annotations stay bounded: a category, an id, a key, a count. Raw payloads, URLs with credentials, tokens and arbitrary defect text live only in `cause`.
- **Translation.** Construct the error where the failure happens, and map it to another error only at a boundary. A boundary passes through errors already in the target channel and wraps only unknown or lower-level failures. Map each failure where its context is known; don't wrap a whole pipeline in one generic error.
- **Discriminators.** Don't say one thing twice, as a specific tag and a single-value `stage` or `operation` literal. Split classes when the distinction drives control flow or the copy a user sees; a field that only helps diagnosis stays a field. A message that reaches the UI or a log a person reads is behavior, so a refactor keeps it.
- **Validation codes.** A rejected save is its own tagged error carrying the code (`CategoryValidationError.code`); the screen reads the field and maps it to copy, never the message text.
- **Mappers.** No helper that only does `(...args) => new SomeError({ ...args })`. Keep one when it normalizes, passes a domain error through, or adds context. A mapper that belongs to the error is a static factory on its class.
- **Predicates** are exported directly, `export const isFoo = Schema.is(Foo)`, not a function wrapping a private `Schema.is`.
- Recover with `Effect.catchTags({ LocalDatabaseError: ... })`, even for one tag; lint enforces it. `Effect.catch` handles the whole channel; `catchIf` is for structural checks such as a platform error code.

## Data modules

`apps/native/src/data/*-core.ts` modules run in jest on better-sqlite3, so they take no service and import neither `src/state/` nor `src/lib/runtime.ts`.

- **An operation** is `Effect.fn("Transactions.create")(function* create(db: Database, ...) { ... })`. `db` stays a parameter because `LocalDatabase` reopens the connection on reset and retry. An exported object of operations (`transactionsRepo`, `tagsRepo`) keeps its members, each an `Effect.fn`.
- **One error per module**, `<Module>Error`, with `operation: Schema.Literals([...])` (left out when the module has one) and `cause: Schema.Defect()`. A private helper wraps a drizzle query in `Effect.tryPromise({ catch, try })`; a query builder is a thenable, so `() => db.update(...)` is the `try`. A synchronous read used inside an operation goes through `Effect.try` with the same error, since a bare throw in a generator is a defect.
- **Composition.** An operation that calls another module's operation `yield*`s it and that module's error passes through. A dependency still on promises (an Expo or Convex call, `lib/` promise code) goes through `Effect.tryPromise` with this module's error.
- **Transactions** use `transaction(db, body, toError)` from `db/transaction.ts`, which keeps the per-database queue. A callback that runs inside one is `(id: string) => Effect.Effect<void, E>` (`CreateOptions.inSameTransaction`), so the caller's writes join it and its error passes through unchanged. A write that has to join a caller's transaction without owning it is returned as an effect, not run: `stageTransfer` resolves to `{ id, write }`, and `installmentsRepo.createOrder` `yield*`s `write` inside the purchase's `inSameTransaction`.
- **Validation** that drives copy or control flow is its own tagged error (`UnbalancedSplitError`, `PendingCategoryError`, `GoalValuationError`), not a message a caller parses. A module that refuses input before touching the database (`accountsRepo.update` on a deleted row, `installmentsRepo.createOrder` with an empty schedule) fails with its own error carrying `reason`, an optional literal beside `operation`, and `cause` is optional for the same reason. The `message` getter maps `reason` to the sentence the old `throw new Error` used, so a log or a toast reads the same.
- **Stays plain:** synchronous reads (`getTransactionById`, `cardFeeFor`), query builders handed to `useLiveQuery`, and pure helpers.
- **Callers.** An Effect caller `yield*`s the operation. A component runs a write through a command (`state/ledger-commands.ts`, `state/accounts-commands.ts`, `state/planning-commands.ts`, `state/transaction-save-command.ts`). The form's save is one command, so the category, tags, splits, attachments and card fee commit or fail together.
- **Bookkeeping that must not fail a save** (the logo candidate after `create`) is caught with `Effect.catchTags` where it is called and logged at the level it always was.
- **Entry flows.** The transaction form, the voice and receipt screens and their hooks sequence async work as `Effect.fn` flows and hand them to `voidFlowCommand` (no services), or `voidAppFlowCommand` (the runtime's services) in `src/state/entry-commands.ts`. `fromCommand` runs an existing bridged command inside a flow and fails with its cause. The flow handles its own failures: `logged(message)` from `entry-save.ts` turns one into a log line. `commitSavedEntry` is the form's after-save sequence: the committed row never fails on a step after it, and only the backfill's failure is reported.
- **A flow is a module-level `Effect.fn`, never a generator inside a component or hook.** The compiler cannot lower `yield` and skips the whole component, and it rejects a ref-reading function passed to a call during render. A hook hands its flows a `ports` object (its refs, setters and `start`), as `useTransactionEnrichment` and `useVoiceEntry` do, and a screen hands them `done` callbacks.
- **A write a hook starts because of what it reads** (`startAdvancesAtom` in `data/budgets.ts`) is an atom family keyed by the pending writes as plain data, mounted with `useAtomMount`. The key holds only strings and numbers, since a key is hashed structurally; an empty set is a mounted atom that does nothing.
- **Tests** run the effect, `await Effect.runPromise(transactionsRepo.create(db, input))`, and read a failure with `Effect.flip`.

## Runtime boundaries

- **One runtime, one registry.** `appRuntime = Atom.runtime(layer)` in `apps/native/src/lib/runtime.ts` and `appAtomRegistry` in `src/state/atom-registry.ts`, provided once as the outermost element of `src/app/_layout.tsx` with `<RegistryContext value={appAtomRegistry}>`. A new service merges its layer into `appRuntime`'s; nothing else makes a runtime or a registry.
- `Atom.runtime` builds the layer inside the registry, so every atom shares one instance of each service. A runtime atom is disposed like any other once nothing reads it, so `appRuntime` is `Atom.keepAlive`: services live for the registry's lifetime. A `ManagedRuntime` would build a second copy for whatever ran through it.
- **Effects run only at edges**: an atom (`appRuntime.atom`), a command (below), a Convex handler, a test. Never `Effect.runPromise` inside a service or inside another effect.
- **Retryable work does not run while a layer builds.** The registry keeps a failed layer build, so refreshing an atom would not rebuild it. `LocalDatabase` opens the file in `open()`, which the atom calls, so a refresh re-runs every step on a fresh connection.
- **Fast Refresh.** `_layout.tsx` imports the runtime and registry modules and is not a refresh boundary (it exports `unstable_settings`), so an edit to either, or to a service they import, makes Metro reload the bundle instead of running them a second time. Keep them imported from `_layout.tsx`.
- The `@effect/language-service` plugin in each tsconfig reports in the editor only; `tsc` is not patched, so `check-types` does not run its diagnostics.

## Atoms are the React bridge

- A component reads `useAtomValue(atom)` and derives its state from the `AsyncResult` in render: `Initial` or `waiting` is loading, `Success` is the value, `Failure` is `Cause.squash(result.cause)`. No `useEffect` to load and no state copy.
- `Atom.keepAlive` for state that lives as long as the app, such as the open database. Other atoms are dropped once nothing reads them.
- Retry is `registry.refresh(atom)`, with the registry from `use(RegistryContext)`.
- App state that outlives any screen is a writable `Atom.make(initial).pipe(Atom.keepAlive)`; the hook returns `useAtom`'s setter, which also takes an updater that reads the latest value. Derive the rest with `Atom.make((get) => ...)`.
- An atom compares by `Object.is`. A derived value rebuilt on every upstream change keeps its readers still with `Atom.withEquality` (`Equal.equals` is structural for plain objects). `display-settings-context.ts` reads SQLite this way: `get.addFinalizer(subscribeToTableChanges(...))` calls `get.refreshSelf()`, and `sameRows` keeps the rows when nothing changed.
- Every atom has a label, `Atom.withLabel("<area>:<name>")`, set last in its `pipe`: `local-data:open`, `revenuecat:entitlement`. The label names the atom in devtools, in a failing test and in a reported failure. A family shares one label for all its members.
- `Service.use(...)` trips `rules-of-hooks` outside a component. Write `LocalDatabase.pipe(Effect.flatMap((local) => local.open()))`.
- React effects are for synchronizing with something outside React. Derive in render and act in handlers instead of syncing state, but do not hide real lifecycle work in refs or stores to dodge an effect. Reach for, in order: state derived in render; the event handler that causes the change; a `key` remount to reset; `useSyncExternalStore` through a shared helper for external stores; `useAtomMount` on an atom family whose body starts the work and registers `get.addFinalizer`; a module service attached outside React; Reanimated `useDerivedValue` or `useAnimatedReaction`; a ref callback. An effect that stays says why on the line above it, `// oxlint-disable-next-line outlayr/react-effect-budget -- <why>`, and `scripts/effect-budget.json` caps the rest (see `linting.md`, "React effect budget").
- A timer or async continuation that outlives the render that started it reads its arguments through `useLatest` (`src/lib/use-latest.ts`). `useEffectEvent` is no substitute: lint allows calling one only from effects and other effect events.
- A Reanimated reaction that writes a shared value which a derived value reads lands one frame later, because mappers that run during a mapper pass wait for the next frame. Jest never advances that frame, so a hook whose test pins "swaps at once" keeps its effect (`useChartPath`).

## Commands are the write path

A read is an atom. A write a user or a module starts, and any call that must hand back one answer per call, is a command from `src/state/atom-command.ts`.

```ts
const purchaseCommand = createRuntimeCommand(appRuntime, {
    execute: (input: { accountId: string | null; pack: PurchasesPackage }) =>
        RevenueCat.pipe(Effect.flatMap((revenueCat) => revenueCat.purchase(input.accountId, input.pack))),
    label: "revenuecat:purchase",
});
```

- `run(registry, input)` builds one throwaway atom for the call, mounts it, awaits `AtomRegistry.getResult` and resolves to a settled `AsyncResult`: `Success` or `Failure`, never a rejection. A throw inside `execute` is a defect in that result. Overlapping calls each get their own result; a `fn` atom in `useAtomSet` promise mode resolves with whichever write settles next, so it is not used for this.
- A component calls `useAtomCommand(command, options)` and gets `(input) => Promise<result>`; module code with no registry calls `runAtomCommand(appAtomRegistry, command, input, options)`.
- One reporter handles the result. It ignores interrupts, logs a defect with `console.error` and a typed failure with `console.warn`, which is a red or a yellow LogBox entry in dev and an error or warn native log in release, as `Effect.logWarning` is under `appRuntime`'s logger. `reportDefect` and `reportFailure` switch each off per call.
- **A component handles a settled failure in the handler.** It awaits the result, branches on `AsyncResult.isFailure`, and sets its own state or shows its own copy. Pass `SILENT` when that branch is the report, so one failure is not logged twice. Busy state is the component's own `useState` set around the `await`, not the atom's `waiting`.
- **Code behind a library's promise contract** (better-auth's `fetchImpl` in `token-fetch.ts`) passes `SILENT` and returns `unwrapAtomCommand(result)`, which throws the squashed cause, so the library sees the error it expects.
- A command for an effect that needs no service is `createCommand`, and module code the runtime itself imports (`lib/enrichment-queue.ts`, `lib/logo-backfill.ts`) may only use those: a command made with `createRuntimeCommand` imports `appRuntime`, which is a cycle there and leaves the command with an undefined runtime. `settings-commands.ts` holds the shared ones; those two modules define their own pass as a `createCommand` beside the code.
- A command whose calls must not overlap needs a scheduler, which does not exist yet. Add one with the first caller that needs it.

## Convex, HTTP and the account lifecycle (native)

- **Convex calls are Effects.** `cloudQuery`, `cloudMutation` and `cloudAction` in `src/lib/convex.ts` fail with `CloudError` (`src/lib/cloud-error.ts`, a module of its own so data cores and tests can import it without the Convex client). Every transport (`syncTransport`, `ratesPuller`, `enrichmentQueueTransport`, `csvImportTransport`, `photoTransport`, `voiceThreadTransport`, `receiptScanTransport`, `installmentScanTransport`, `enrichmentTransport`) returns Effects, and its consumer maps `CloudError` to its own tagged error with `Effect.mapError`. A hook runs one through a command, as `useVoiceEntry` does for the thread start and end. The `watch*` functions stay callbacks: the Convex client demands them.
- **Raw `fetch` is `HttpClient`.** `src/lib/http.ts` is `outboundHttp`, provided by `appRuntime`: `Fetch` reads `globalThis.fetch` per request, so a test can stub it, and trace headers are off, since the photo hosts sign the request. `photoTransport` is an effect that reads `HttpClient` and returns methods with no requirement, so `PhotoTransport` stays environment-free for its consumers and tests. An operation such as `fetchMerchantImage` requires `HttpClient.HttpClient`, decodes the response with a module-scope `Schema` and maps `HttpClientError`, `SchemaError` and `TimeoutError` with `Effect.catchTags`. A service takes the client in `make` and provides it to what it calls. Code the runtime imports (`lib/logo-backfill.ts`) cannot use a runtime command, so its command provides `outboundHttp` itself.
- **A retry is a `Schedule`.** `retryTokenFetch` keeps better-auth's `fetchImpl` contract (a promise-returning fetch) and runs a `createCommand` whose body is `Effect.retry` over `Schedule.spaced(Duration.zero)` with `Schedule.modifyDelay` picking the delay by attempt, the last one repeating. An aborted request is not retried, and the original error is what the caller sees.
- **A retry on timeout** is `Effect.timeout` under `Effect.retry({ schedule: Schedule.recurs(n), while: Cause.isTimeoutError })`, so every attempt gets its own window.
- **An AI request a user can dismiss** takes the transport's Effect through `timedCaptureCommand` (`src/state/capture-commands.ts`): `Effect.timeoutOption` with a named `Duration` settles `Option.none` for a timeout, a failure becomes `CaptureCallError`, and an `AbortSignal` in the input interrupts the call. The hook keeps one `AbortController` beside its take or ticket counter and aborts it wherever the counter is bumped, so a result the hook would ignore is never awaited.
- **A sequence whose order is the contract** (`runAccountLifecycle`, `recoverDeviceReset`, `resetAllDeviceData`) takes its steps as effects and runs them in order in one generator, so "stop on failure" is a `yield*` and "continue on failure" is a `catchTags` on that step alone. The steps share one error and requirement type (`AccountLifecycleDependencies<E, R>`); the command that builds them in `src/state/cloud-commands.ts` provides `SecureStorage` from the runtime.
- **A device store's clear is an effect that fails with `DeviceStoreError`**, and `resetAllDeviceData` records the store's name and goes on, which is the only place a store failure is swallowed.
- **A screen that shows a failure's text reads `cause` for a wrapper error** (`CloudError`, `ProviderSignInError`), as `localDataState` does, so the copy is still the library's message.

## Long-running services

`apps/native/src/data/sync-engine.ts` is the reference: `run(db)` is one effect that runs until interrupted.

- Each event source is a `Stream.callback` whose `Effect.acquireRelease` subscribes and unsubscribes, so interrupting the fiber undoes every subscription. Sources merge into one stream of triggers.
- Coalescing is `Stream.buffer({ capacity: 1, strategy: "sliding" })` before `Stream.runForEach(pass)`: every trigger that lands during a pass collapses into one more pass.
- Single flight is a `Semaphore.make(1)` taken in `make`, not in `run`, so a run that starts while an interrupted one is still finishing its pass waits for it.
- `listen` in `src/lib/app-events.ts` is that source for any `(listener) => unsubscribe` API. Its buffer is sliding, so it filters before buffering: filter after it and a burst of other tables or app states can push out the one event you wanted.
- Order between services is in the code, not in mount order: a step that must follow another takes it as an effect (`RecurrenceSweep.run(db, onSwept)`), reads a `Queue` the other fills (`SystemSync.run(db, swept)`), or awaits a `Latch` the other opens (`PhotoSync.run` after `reconcile`). `data/background-program.ts` composes the ones that share a lifetime.
- It runs from an atom (`Atom.family` keyed by its input) that a component mounts with `useAtomMount`, rendered only while the work should run. Unmounting interrupts the fiber; a step that must finish once started is `Effect.uninterruptible`.
- A run a press starts (not a stream a mounted atom drives) lives in a `FiberHandle` the service holds, so leaving the screen does not interrupt it and a new run replaces the old one. The `fn` atom only calls `run` and returns; the state is a `SubscriptionRef` read with `appRuntime.subscriptionRef`. `lib/csv-import.ts` is the reference.
- A value that lives in React (the signed-in account) reaches a service by mounting `Atom.family(value)` atoms whose effect registers the value until it is interrupted. The registry removes a node on a scheduled task, so a value that comes back before then keeps its old node and nothing re-runs: treat the live mounts as a stack whose newest entry wins, never a mount as an event. `RevenueCat.follow` is the reference.
- A fiber forked while the layer builds reads the construction context, which lacks the app's logger. Start loops in `run`, which runs from an atom with the runtime's context.
- Log with `Effect.logWarning`, not `console.warn`. Effect's default logger writes every level with `console.log`, so `appRuntime` swaps in `Logger.withLeveledConsole(Logger.formatSimple)`: a warning is a LogBox warning in dev and a warn-level native log in release, as `console.warn` was.

## Overlapping callers

- Calls that must run one at a time take a module-level `Semaphore.makeUnsafe(1)` and `withPermits(1)`; a failed call releases its permit (`toggleFavouriteCurrency`).
- Calls that must share one run, so a second caller gets the first's result instead of repeating it, keep the in-flight `Deferred` in a module variable, complete it from `Effect.onExit` and clear the variable there; the body is uninterruptible so a waiter never inherits an interrupt (`drainPendingWrites`).

## Testing a service under jest

- Swap dependencies through the environment, not `jest.mock`: provide `Layer.succeed(Dependency, fake)` to the service's layer.
- Fake only what needs native code. `local-data-context.test.ts` swaps the SQLite connection and runs the real migrations, bootstrap and settle on better-sqlite3 (`db/test-database.ts`).
- To test through an atom, give a fresh registry the test layer, `AtomRegistry.make({ initialValues: [[appRuntime.layer, testLayer]] })`, and await `Effect.runPromiseExit(AtomRegistry.getResult(registry, atom, { suspendOnWaiting: true }))`. The test is the edge that runs the effect.
- A long-running service is tested by mounting `appRuntime.atom(Service.pipe(Effect.flatMap((s) => s.run(db)), Effect.provide(fakes)))` with `registry.mount`, which also gives the unmount. `appRuntime` exposes a composed service's dependencies (`Layer.provideMerge`) so such an atom type-checks against them.
- Assert on what a caller sees (the derived state, the rows written), not on which steps were called.
- A fiber reads its logger from the runtime's context, so silence logs by merging `Logger.layer([])` into the test layer; inside `Layer.provide` it only reaches the layer's construction.
- Drive time with `jest.useFakeTimers()` and `await jest.advanceTimersByTimeAsync(ms)`. Registry fibers dispatch on microtasks and Effect's clock sleeps on `setTimeout`, so one call runs the due sleeps and every fiber and promise they wake. `TestClock` does not wait for promise continuations, and a bare `Effect.runFork` dispatches on `setImmediate`, which fake timers move 1 ms per hop.
- A fake that counts calls counts inside `Effect.suspend`: a service may build an effect once and run it many times.
- Give the test registry a `scheduleTask` built on `setTimeout` so node removal waits for the next timer hop, as it does under React.

## Backend (`packages/backend/confect`)

- **Environment is `Config`, read inside the operation.** `lib/config.ts` holds one `Config` per provider, every var optional (`Config.option`, or `Config.withDefault` where there is a default), secrets `Config.Redacted`. Group variables per provider rather than in one `Config.all`, so a bad value for one provider cannot hide another's. Convex does not enumerate `process.env` and an empty string counts as unset; Confect installs `ConvexConfigProvider` in every function it registers, and `lib/runEdge.ts` installs it for everything else. Never read at module scope: a warm isolate would keep the old value after `npx convex env set`. Two library constructors force it anyway: the RevenueCat webhook secret in `convex/http.ts`, and `createAuth`, which Better Auth calls synchronously and so reads through `runEdgeSync`.
- **Outbound HTTP is `HttpClient`.** An operation requires `HttpClient.HttpClient` and the registered function provides `outboundHttp` (`lib/http.ts`) at its edge; a test provides `stubHttp` or `silentHttp` from `test.helpers.ts` instead. `FetchHttpClient`'s `Fetch` reference caches the first `globalThis.fetch` it reads, so `outboundHttp` supplies a function that reads the global per request, which keeps `vi.stubGlobal("fetch")` working for convex-test handlers that cannot take a layer. Name the timeout as a `Duration` constant and apply `Effect.timeout`; map `HttpClientError` and `TimeoutError` to the module's tagged error with `Effect.catchTags`. Decode bodies with `HttpIncomingMessage.schemaBodyJson` hoisted to module scope, and keep status handling explicit, as the providers differ on what a 404 means.
- **A library that demands a promise gets `runEdge`.** `httpAction`, Workpool jobs, Better Auth hooks and the MCP gateway callbacks are plain arrows returning `runEdge(program)`, which rejects with the original error, so an `APIError` still reaches Better Auth intact. A plain `query` or `mutation` handler uses `runTransactionEdge` instead: Convex rejects `setTimeout` there and a wall-clock read evicts the query cache, so it runs on a sync scheduler with span timing off, as Confect's own handlers do. Confect's `HttpRouter` is not used for `convex/http.ts`: its handlers receive Confect services, not the raw `ActionCtx` that Better Auth, the gateway and component queries need.
- **Spec modules are bundled into the client.** Anything a `*.spec.ts` imports, directly or through a helper, must not reach `@confect/server`; put Effect services that read `DatabaseReader` in a module the specs do not import (`lib/syncGuards.ts`).
- **Defects reach no reporter yet.** Confect builds each function's layers itself and offers no application layer, so an `ErrorReporter` cannot be provided once. A middleware spec attached to every group would reach Confect functions, but not `httpAction`, Workpool or Better Auth callbacks.

## The web app

`apps/web` has no runtime, registry or atoms: it has no services, only edges.

- A handler TanStack Start or Nitro requires to return a `Response` or a promise is an `Effect.fn` program run with `Effect.runPromise` at that edge (`server.ts`, `routes/a2a.ts`, `routes/mcp.ts`). A body read is `readJsonBody`, which fails with `RequestBodyError`.
- Browser-only work started from React (`startAnalytics`) is an `Effect.fn` run with `Effect.runFork` from the one effect that owns it.
- A DOM subscription is a shared helper, not an effect per component: `useSyncExternalStore` for stores (`lib/theme.ts`, `lib/reduced-motion.ts`), a ref callback that returns its cleanup for an observer on the element itself (`lib/in-view.ts`, `lib/motion.ts`), `useScrollSpy` for elements found by id, `useTimeout` for a delay.
