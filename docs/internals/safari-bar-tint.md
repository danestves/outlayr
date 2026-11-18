# Safari bar tint on the home page

iOS Safari 26 and later tints its status bar and bottom toolbar from the page. Found on iOS 27 simulators; none of it is documented by Apple.

## How Safari picks the colour

- It ignores the `theme-color` meta, the root background and the body background.
- It samples the drawn pixels of a fixed or sticky element at least 6 px tall touching that edge. A transparent fixed element on top (the site header) blocks it.
- It samples again only when such an element is added, removed, changes `display` or `visibility`. A background-color change is never picked up, so each edge on home has a day and a night strip (`.hz-edge`) and `watchGround` (`apps/site/src/lib/ground.ts`) toggles their `display`.
- With no candidate at rest, the toolbar shows the page through it.
- When the candidate goes away while the page is scrolling, Safari paints its own default bar (near white in both appearances) for about 0.4 s, then shows the page. The bottom strip over the hero therefore stays until scrolling settles (`install-bar.tsx`), showing the sun colour while it waits.

## Toolbar expansion

When the toolbar expands or collapses, `innerHeight` animates and `resize` fires on every frame. Anything that reads the viewport height (the ground line of each edge) has to read it again on each of those frames, not after they stop.
