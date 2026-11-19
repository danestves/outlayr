# Transactions review badge

Real app captures from a local stack (web dev server and a local Convex copy) with 11 November entries. Count state: 7 flagged for review. Zero state: the same entries, none flagged. Canvas frames are from Doop canvas `qglUCf5arb`.

## Desktop sidebar, 1440x960

| Canvas | App, count | App, zero |
| --- | --- | --- |
| ![Canvas, dark](canvas-sidebar.png) | ![App count, dark](app-count-dark.png) | ![App zero, dark](app-zero-dark.png) |
| ![Canvas, light](canvas-sidebar-light.png) | ![App count, light](app-count-light.png) | ![App zero, light](app-zero-light.png) |

Canvas: `FGdhKexm6A` "Dashboard · User menu open" (dark), `KohDfR9VkA` "User menu · Light mode" (light). The badge matches the canvas in size, type, radius and colour. Still different: the shell around it (floating sidebar panel, uppercase group labels, 40px rows) comes from phase 2, and the canvas frames have the user menu open.

## Folded rail, 1440x960

| Canvas | App, count |
| --- | --- |
| ![Canvas rail, dark](canvas-rail.png) | ![App rail, dark](app-rail-count-dark.png) |

Canvas: `1sL-ZdjGTr`. Both fold the count into a tint dot on the Transactions icon. Still different: the canvas shows the row's tooltip.

## Mobile drawer, 390x844

| Canvas | App, count | App, zero |
| --- | --- | --- |
| ![Canvas drawer, dark](canvas-drawer.png) | ![App drawer count, dark](app-drawer-count-dark.png) | ![App drawer zero, dark](app-drawer-zero-dark.png) |
| ![Canvas drawer, light](canvas-drawer-light.png) | ![App drawer count, light](app-drawer-count-light.png) | ![App drawer zero, light](app-drawer-zero-light.png) |

Canvas: `4hJ1rm5DTF` (dark), `uUFZQ_gW_d` "Mobile · Drawer · Open · Light". Still different: the dark frame is stale and labels Transactions "Soon"; the light frame sits on the Transactions route with no count; the canvas drawer has an account row at the bottom that the app's drawer doesn't.

## Settings › Sync, what syncs

No canvas frame exists for this list. The Sync frames (`9dM9hXb8Ce`, dark desktop only) put a Devices table in the right column, which the app doesn't have, so "What syncs" takes that column and "Stays on each phone" sits under Replication.

| Light | Dark |
| --- | --- |
| ![Sync list, light](app-sync-list-light.png) | ![Sync list, dark](app-sync-list-dark.png) |
| ![Sync list end, light](app-sync-list-end-light.png) | ![Sync list end, dark](app-sync-list-end-dark.png) |
| ![Phone, synced rows, light](app-sync-list-phone-light.png) | ![Phone, synced rows, dark](app-sync-list-phone-dark.png) |
| ![Phone, local rows, light](app-sync-local-phone-light.png) | ![Phone, local rows, dark](app-sync-local-phone-dark.png) |

Still different from the frame card spec: hints wrap instead of truncating to one line, because a cut-off list of what syncs would hide part of the answer.
