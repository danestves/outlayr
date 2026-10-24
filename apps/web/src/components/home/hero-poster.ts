import type { Poster } from "./media";

function screen(name: string) {
    return { src: `/screens/${name}.webp`, srcSet: `/screens/${name}-440.webp 440w, /screens/${name}.webp 880w` };
}

// Apart from the hero so the home route's `head`, which ships in every page's chunk, can preload it alone.
export const HERO_POSTER = {
    height: 1912,
    sizes: "(min-width: 40rem) 288px, 200px",
    variants: { dark: screen("log-an-expense-dark"), light: screen("log-an-expense") },
    width: 880,
} satisfies Poster;
