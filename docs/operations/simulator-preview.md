# Driving the simulator from a URL

`vp run dev` serves the running iOS simulator at **`http://localhost:8081/.sim`** — live video plus
touch, keyboard, and hardware buttons, in a browser tab. Anything that can open a URL can drive the
app: a second monitor, a phone on the LAN, a tunnel, or an agent's browser tooling.

This is [`serve-sim`](https://github.com/EvanBacon/serve-sim) mounted into the Metro dev server as
Connect middleware. It captures the simulator's framebuffer through `simctl io` — nothing is
instrumented inside the app, so the preview works whatever is on screen, including a crashed app,
the home screen, or Settings.

## Using it

1. Boot a simulator and start the dev server (`vp run dev`).
2. Open `http://localhost:8081/.sim`.
3. Pick a device in the grid. It boots if it is not already running.

`--port` moves Metro, and the preview follows it: the path is always `/.sim` on whatever port Metro
is on.

For camera injection and the shell-backed tools, run the standalone server instead — `vp run --filter @outlayr/native sim`,
which serves the same UI on `http://localhost:3200` from its own process. See
[Known limits](#known-limits) for why those two features do not work embedded.

## Do not run `serve-sim --kill` while `vp run dev` is running

**It kills Metro.** Verified, not theorised.

Embedded mode streams the device from the Metro process itself, so the state file it writes to
`$TMPDIR/serve-sim/` records *Metro's* PID. `--kill` reads that file and sends `SIGTERM` to the PID
it finds. The dev server goes down with it.

There is deliberately no `sim:kill` script for this reason. To stop streaming, close the browser tab
or stop Metro. `--kill` is safe only against a standalone `sim` process.

## Why Metro's WebSocket dispatch is re-entered

`metro.config.cjs` re-orders the dev server's `upgrade` listeners. It is the only hook available,
and without it the preview is a video feed you cannot touch.

Expo's dev server dispatches WebSocket upgrades by *exact* pathname against its own endpoint map and
calls `socket.destroy()` on every miss — see `@expo/cli`,
`src/start/server/metro/runServer-fork.ts`. The preview's input and DevTools sockets live under
`/.sim`, which is not in that map, so they were being destroyed. The stream is plain HTTP, so this
failed in the worst way available: video kept working and only touch silently stopped.

The shim claims the `/.sim` prefix and replays every other upgrade through the original listeners,
unchanged. Measured against a running dev server:

| Upgrade path | Before | After |
|---|---|---|
| `/.sim/helper/<udid>/ws` (input) | destroyed | 101 |
| `/.sim/exec-ws` | destroyed | 101 |
| `/hot` (Fast Refresh) | 101 | 101 |
| `/message` | 101 | 101 |
| `/inspector/device` (CDP) | 101 | 101 |
| unknown path | destroyed | destroyed |

The failure mode is bounded. If a future SDK registers its upgrade handler *after* the first HTTP
request instead of during `listen()`, the shim stops claiming upgrades and input degrades back to
today's behaviour. It cannot break Metro's own sockets, because it never rewrites them — it replays
the listener list it inherited.

If touch stops working after an Expo upgrade, check that first.

## Known limits

**The tools panel's shell commands and camera injection do not work embedded.** `serve-sim` locates
its own CLI as `process.argv[1]` so the page can shell out to it. Inside Metro that resolves to the
Expo CLI, so those commands run against the wrong binary. Everything interactive — touch, swipe,
pinch, keyboard, hardware buttons, rotation — travels over the HID WebSocket instead and is
unaffected. Use `vp run --filter @outlayr/native sim` when you need the camera.

**A malformed `/.sim/exec` request crashes the dev server.** `serve-sim` passes the request's
`command` field to `child_process.exec` without checking its type; sending a JSON array instead of a
string throws `ERR_INVALID_ARG_TYPE` out of a request handler and takes the process down. The route
requires a per-session token that is only readable same-origin, so this is a robustness limit rather
than an exposed attack surface — but it is the cost of embedding: a `serve-sim` bug can now take
Metro with it, where the standalone server would only take itself.

**Apple Silicon and macOS only.** The bundled capture helper ships as an arm64 binary. `serve-sim`
is a `devDependency` of `apps/native` with no `os`/`cpu` restriction, so it still installs on CI's
Linux runners; nothing loads it there, because Metro only calls `enhanceMiddleware` when it is
serving.

## Verified

Against Expo SDK 57 (`@expo/cli` 57.0.12, `@expo/metro` 56.0.0), `serve-sim` ^0.1.46, iOS 27
simulator, on macOS arm64:

- The preview page, the state API, and the MJPEG stream all serve from the Metro port.
- Input reaches the device: a home-button frame sent over `/.sim/helper/<udid>/ws` moved the
  simulator from Settings to the home screen.
- Metro's own `/hot`, `/message`, and `/inspector/device` upgrades still complete after the shim.
- `expo export --platform ios` still bundles, so the `bundle` job in `.github/workflows/native.yml` would be unaffected — Actions is disabled, so it does not run today.

**Unverified:** LAN and tunnelled access, and multi-device streaming, were not exercised — only
loopback with a single simulator. Android is out of scope; `serve-sim` is iOS-only.
