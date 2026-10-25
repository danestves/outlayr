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

## Operations

A reusable operation is `Effect.fn("LocalDatabase.open")(function* open() { ... })`, which names its span. Wrap a promise API in `Effect.tryPromise({ try, catch })` and a throwing sync one in `Effect.try`, with `catch` returning the module's typed error.

## Errors

- A `Schema.TaggedError` class. It stays `instanceof Error`, so it can sit where callers expect an `Error`.
- Structured attributes say what failed (`stage: "migrate"`), and the original error goes in `cause: Schema.Defect()`.
- `message` is built from the attributes, never from `cause`, so it reads the same for every failure of that kind; the driver's detail stays on `cause`. A screen that shows the underlying detail reads it from `cause` at the bridge, as `localDataState` does.
- Recover with `Effect.catchTags({ LocalDatabaseError: ... })`, even for one tag; lint enforces it.

## Runtime boundaries

- **One runtime, one registry.** `appRuntime = Atom.runtime(layer)` in `apps/native/src/lib/runtime.ts` and `appAtomRegistry` in `src/state/atom-registry.ts`, provided once as the outermost element of `src/app/_layout.tsx` with `<RegistryContext value={appAtomRegistry}>`. A new service merges its layer into `appRuntime`'s; nothing else makes a runtime or a registry.
- `Atom.runtime` builds the layer inside the registry, so every atom shares one instance of each service. A runtime atom is disposed like any other once nothing reads it, so `appRuntime` is `Atom.keepAlive`: services live for the registry's lifetime. A `ManagedRuntime` would build a second copy for whatever ran through it.
- **Effects run only at edges**: an atom (`appRuntime.atom`, `appRuntime.fn`), an event handler through a `fn` atom, a Convex handler, a test. Never `Effect.runPromise` inside a service or inside another effect.
- **Retryable work does not run while a layer builds.** The registry keeps a failed layer build, so refreshing an atom would not rebuild it. `LocalDatabase` opens the file in `open()`, which the atom calls, so a refresh re-runs every step on a fresh connection.
- **Fast Refresh.** `_layout.tsx` imports the runtime and registry modules and is not a refresh boundary (it exports `unstable_settings`), so an edit to either, or to a service they import, makes Metro reload the bundle instead of running them a second time. Keep them imported from `_layout.tsx`.
- The `@effect/language-service` plugin in each tsconfig reports in the editor only; `tsc` is not patched, so `check-types` does not run its diagnostics.

## Atoms are the React bridge

- A component reads `useAtomValue(atom)` and derives its state from the `AsyncResult` in render: `Initial` or `waiting` is loading, `Success` is the value, `Failure` is `Cause.squash(result.cause)`. No `useEffect` to load and no state copy.
- `Atom.keepAlive` for state that lives as long as the app, such as the open database. Other atoms are dropped once nothing reads them.
- Retry is `registry.refresh(atom)`, with the registry from `use(RegistryContext)`.
- `Service.use(...)` trips `rules-of-hooks` outside a component. Write `LocalDatabase.pipe(Effect.flatMap((local) => local.open()))`.

## Long-running services

`apps/native/src/data/sync-engine.ts` is the reference: `run(db)` is one effect that runs until interrupted.

- Each event source is a `Stream.callback` whose `Effect.acquireRelease` subscribes and unsubscribes, so interrupting the fiber undoes every subscription. Sources merge into one stream of triggers.
- Coalescing is `Stream.buffer({ capacity: 1, strategy: "sliding" })` before `Stream.runForEach(pass)`: every trigger that lands during a pass collapses into one more pass.
- Single flight is a `Semaphore.make(1)` taken in `make`, not in `run`, so a run that starts while an interrupted one is still finishing its pass waits for it.
- It runs from an atom (`Atom.family` keyed by its input) that a component mounts with `useAtomMount`, rendered only while the work should run. Unmounting interrupts the fiber; a step that must finish once started is `Effect.uninterruptible`.
- Log with `Effect.logWarning`, not `console.warn`. Effect's default logger writes every level with `console.log`, so `appRuntime` swaps in `Logger.withLeveledConsole(Logger.formatSimple)`: a warning is a LogBox warning in dev and a warn-level native log in release, as `console.warn` was.

## Testing a service under jest

- Swap dependencies through the environment, not `jest.mock`: provide `Layer.succeed(Dependency, fake)` to the service's layer.
- Fake only what needs native code. `local-data-context.test.ts` swaps the SQLite connection and runs the real migrations, bootstrap and settle on better-sqlite3 (`db/test-database.ts`).
- To test through an atom, give a fresh registry the test layer, `AtomRegistry.make({ initialValues: [[appRuntime.layer, testLayer]] })`, and await `Effect.runPromiseExit(AtomRegistry.getResult(registry, atom, { suspendOnWaiting: true }))`. The test is the edge that runs the effect.
- Assert on what a caller sees (the derived state, the rows written), not on which steps were called.
- A fiber reads its logger from the runtime's context, so silence logs by merging `Logger.layer([])` into the test layer; inside `Layer.provide` it only reaches the layer's construction.
- Drive time with `jest.useFakeTimers()` and `await jest.advanceTimersByTimeAsync(ms)`. Registry fibers dispatch on microtasks and Effect's clock sleeps on `setTimeout`, so one call runs the due sleeps and every fiber and promise they wake. `TestClock` does not wait for promise continuations, and a bare `Effect.runFork` dispatches on `setImmediate`, which fake timers move 1 ms per hop.
- A fake that counts calls counts inside `Effect.suspend`: a service may build an effect once and run it many times.
