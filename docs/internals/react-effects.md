# React effects

Product code never calls `useEffect`, `useLayoutEffect` or `useInsertionEffect`. Agents and people both misjudge them, and a reviewer should not have to decide whether one effect deserves to exist. The raw hooks live in two copies of one file, and everything else goes through the named hooks those files export:

- `apps/native/src/lib/lifecycle.ts`, imported as `@/lib/lifecycle`
- `packages/shared/src/lifecycle.ts`, imported as `@outlayr/shared/lifecycle` by the web app and the site

The copies are identical. Native can't import the shared one: `@outlayr/shared` pins its own React, and Metro would bundle a second copy. Change both together.

## Before reaching for a hook

Most effects should not become a hook at all. In order:

1. Derive the value in render.
2. Do the work in the handler that causes the change.
3. Remount with a `key` to reset state.
4. Render the outcome: expo-router's `<Redirect>` instead of navigating from an effect.
5. Read outside state with `useSyncExternalStore` through a shared store, or `useAtomValue` / `useAtomMount` on an atom.
6. Move the work into a module service or an atom that watches the source, so no component owns it.
7. For animation, Reanimated's `useDerivedValue` or `useAnimatedReaction`; for a DOM node, a ref callback or `onLayout`.

## The hooks

| Hook | Use it to |
|---|---|
| `useEventListener(subscribe, listener, keys?)` | Listen to an outside emitter (AppState, Keyboard, a navigation event, a DOM event) while mounted. `subscribe` returns the unsubscribe function; the listener is always the latest one, so it resubscribes only when `keys` change. |
| `useTimers()` | Own timeouts and animation frames: `after(ms, run)`, `frame(run)`, `clear()`. Every pending one is cancelled on unmount. |
| `useOnMount(start)` | Start something once when the component mounts, returning its cleanup. |
| `useOnUnmount(stop)` | Release something when the component goes. |
| `useWhen(condition, start)` | Start something each time `condition` turns true; its cleanup runs when it turns false. |
| `useMirror(values, write)` | Write values into an outside system (an SDK, a native module, a non-React store) on mount and whenever one of them changes. |
| `useLayoutMirror(values, write)` | The same, before paint: theme variables, a measurement that must land before the frame shows. |
| `useOnChange(values, react)` | React to a change of values after mount, with the previous values. Never runs on mount. |
| `useLatest(value)` | A ref holding the latest committed value, for timers and async work that read it after their render ended. |

Every callback passed to these hooks runs with the latest props and state, so none of them takes a dependency list beyond the values it watches. The watched values become React's dependency list, so they are compared one by one with `Object.is`, the tuple keeps one length per call site, and React orders every cleanup before the next setup.

Callbacks never set state from props or other state: that is the derive-in-render case above. A timer or listener that a callback starts may set state when it fires.
