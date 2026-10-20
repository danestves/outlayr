---
name: outlayr-craft
description: Outlayr's rules for replacing generic UI defaults with the treatment each element needs in apps/native, adapted from the libraries.dev philosophy. Use when adding or changing a loading or busy state, a save or delete, a button that waits on work, a list that gains or loses rows, a number the user reads, a highlight or badge, a menu, or an empty state, and when asked to "review for generic defaults", "craft review" or "craft apply".
---

# Outlayr craft

Every element gets the treatment designed for what it is, not the generic
default. A spinner, a pop, a number that jumps, a glow, an emoji in a circle:
each is what an app gets when nobody decided. The rules below decide.

Scope is `apps/native` only. Native iOS controls (context menus, pickers, the
tab bar, Liquid Glass chrome, `Alert`) are the platform, not a default to
replace.

## The six rules

1. **A busy control says what it is doing, and only the control that was
   tapped.** Swap its label for a named status in `BusyText`
   (`@/components/busy-text`): "Exporting…", "Signing in…", "Importing 120
   transactions…". Never a bare `ActivityIndicator`, never panelui's
   `Button loading` (spinner beside an unchanged label). One busy flag per
   control, typed as a union (`"buy" | "restore" | null`), never one boolean
   shared by several buttons.
2. **The length of the wait picks the treatment.**
   - Under 2 s (local DB writes, toggles, route changes): nothing. Disable
     the control against double taps and show no indicator.
   - Unknown length: `useLongWait` (`@/hooks/use-long-wait`) shows the named
     status only once 2 s have passed.
   - Work you can count: say the count ("Restoring 1,240 rows…").
   - AI work (model calls, lookups, receipt reading): `ThinkingOrb`
     (`@/components/thinking-orb/thinking-orb`, `state="searching"`, 20 pt)
     next to the shimmering label. The orb means "the model is working" and
     nothing else, so never use it for sync, sign-in or loading screens.
   - Behind a system sheet (file picker, share sheet, store purchase): show
     nothing under the sheet.
3. **Things come from somewhere and go somewhere.** A new row arrives in its
   place, a deleted row leaves and its undo points back at it, a menu grows
   out of the button that opened it. No instant pop-in or pop-out on content
   the user caused.
4. **Numbers you read move like numbers you type.** Money that changes
   while the user watches (heroes, scrubbed charts, ring centres) renders
   through `NumberFlow` the way `amount-numpad.tsx` does, with the exact text
   it had before. Charts animate between values, not only on mount, and
   honour the `animatedCharts` setting.
5. **Earned moments get louder, not quieter.** A goal reached, a purchase, the
   one plan worth picking. One highlight per screen, attached to the element
   it is about.
6. **Native surfaces plus one designed moment per screen.** No paint layers,
   no glow halos, no always-on animation. Motion runs only while its state
   holds, stops in the background, renders its final frame under Reduce
   Motion, and ends on a frame identical to the static screen.

## Feedback that already exists, reuse it

| Moment | Use |
| --- | --- |
| Save landed | `haptics("success")` from `useHaptics`, fired after the write, never before |
| Save refused or failed | `haptics("error")`, `useSentenceShake` on the slot at fault, `InlineFailure` for a failed write |
| Failure outside a form | `notifyFailure` / `notifyUndoable` from `@/lib/notify` |
| Nothing here yet | drawn marks from `@/components/empty-state-parts`, never an icon at reduced opacity |
| Status while working | panelui `Shimmer` / `BusyText`; panelui `Task` already shimmers a running title |

## Commands

### craft review

Read-only. Scan the named area (or all of `apps/native/src`) for:
`ActivityIndicator`, `loading={`, one `busy` boolean driving several
controls, haptics fired before an `await`, lists with no `entering` /
`exiting` / layout transition, money in plain `Text` that changes on
interaction, charts that draw only on mount, `opacity-*` on an achieved
state, flat tinted badges, emoji-in-a-shape placeholders. Output one line per
finding: `path:line`: what the user sees → which rule → the fix. Group by
rule, most visible first, and edit nothing.

### craft apply

Apply one finding. Reuse the components above before writing anything new,
keep the diff to the element named, add no code comments, and follow the
repo's verify order (`vp check`, `vp run check-types`, the jest suites beside
the change). A test that imports a component rendering `ThinkingOrb` must
mock it: `jest.mock("@/components/thinking-orb/thinking-orb", () => ({
ThinkingOrb: () => null }))`, since Skia does not load under jest. Anything
visible gets a simulator screenshot before and after.
